"""CellScope analysis API.

Inference stays behind this service so the reviewer can be pointed at a
different model later without changing the workspace.
"""

from __future__ import annotations

import json
import logging
import os
import re
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .images import MAX_BYTES, ImageReject
from .inference import MODEL_DOMAIN, MODEL_KEY, SOFTWARE_LICENSE, WEIGHTS_NOTE, analyze_bytes, load_into_state, model_state
from .paths import EXAMPLES_DIR, FRONTEND_DIST, REPORT_PATH
from .schema import AnalysisResponse

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
logger = logging.getLogger("cellscope.api")

EXAMPLE_ID = re.compile(r"val-\d{2}")
EXAMPLE_KINDS = {"input", "ground-truth", "prediction"}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
    load_into_state()
    yield


app = FastAPI(title="CellScope", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:4173", "http://localhost:4173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    model, error = model_state()
    return {
        "ok": True,
        "modelLoaded": model is not None,
        "modelName": f"StarDist {MODEL_KEY}",
        "modelDomain": MODEL_DOMAIN,
        "error": error,
    }


@app.get("/api/model")
def model_info():
    model, error = model_state()
    thresholds = None
    version = None
    if model is not None:
        import stardist

        thresholds = {"probability": float(model.thresholds.prob), "nms": float(model.thresholds.nms)}
        version = stardist.__version__
    return {
        "name": f"StarDist {MODEL_KEY}",
        "key": MODEL_KEY,
        "version": version,
        "domain": MODEL_DOMAIN,
        "weights": WEIGHTS_NOTE,
        "license": SOFTWARE_LICENSE,
        "loaded": model is not None,
        "error": error,
        "thresholds": thresholds,
        "input": "2D single-channel fluorescence image of a nuclear marker. PNG or JPEG. Color images are reduced to luminance.",
        "notSupported": ["histology", "brightfield", "3D", "TIFF"],
        "matching": "Evaluation uses greedy one-to-one matching at mask IoU ≥ 0.5.",
        "attribution": {
            "software": "https://github.com/stardist/stardist",
            "license": "BSD-3-Clause",
            "model": "2D_versatile_fluo",
            "trainingData": "A subset of the DSB 2018 nuclei segmentation challenge, as documented by the StarDist project.",
            "papers": [
                "Schmidt et al., MICCAI 2018. Cell Detection with Star-convex Polygons.",
                "Weigert et al., WACV 2020. Star-convex Polyhedra for 3D Object Detection and Segmentation in Microscopy.",
            ],
        },
    }


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(file: UploadFile = File(...)):
    model, error = model_state()
    raw = await file.read(MAX_BYTES + 1)
    if model is None:
        raise HTTPException(status_code=503, detail=error or "The StarDist model is not loaded.")
    try:
        result = analyze_bytes(model, raw)
    except ImageReject as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception("inference failed")
        raise HTTPException(
            status_code=500,
            detail="Inference failed before a result was produced. The image is still loaded, so you can retry.",
        ) from None
    logger.info("analysis completed detections=%s duration_ms=%s", len(result.detections), result.durationMs)
    return result


@app.get("/api/evaluation")
def evaluation():
    if not REPORT_PATH.is_file():
        raise HTTPException(
            status_code=404,
            detail="No evaluation has been run. From the backend directory, run python scripts/evaluate.py.",
        )
    return json.loads(REPORT_PATH.read_text())


@app.get("/api/evaluation/examples/{image_id}/{kind}")
def evaluation_example(image_id: str, kind: str):
    if not EXAMPLE_ID.fullmatch(image_id) or kind not in EXAMPLE_KINDS:
        raise HTTPException(status_code=404, detail="That example is not part of the stored evaluation.")
    path = EXAMPLES_DIR / f"{image_id}-{kind}.png"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That example image was not saved with the evaluation.")
    return FileResponse(path, media_type="image/png")


def _mount_frontend() -> None:
    if not FRONTEND_DIST.is_dir():
        return

    class SPAStaticFiles(StaticFiles):
        async def get_response(self, path, scope):
            try:
                return await super().get_response(path, scope)
            except StarletteHTTPException as exc:
                if exc.status_code == 404 and not path.startswith("api"):
                    return await super().get_response("index.html", scope)
                raise

    app.mount("/", SPAStaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")


_mount_frontend()
