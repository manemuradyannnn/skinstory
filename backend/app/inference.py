"""StarDist 2D_versatile_fluo inference.

The model is the official pretrained network for 2D fluorescence images of a
nuclear marker. It is not a histology or brightfield model.
"""

from __future__ import annotations

import logging
import math
import os
import threading
import uuid
from datetime import datetime, timezone

import numpy as np

from .images import ImageReject, decode_upload
from .schema import AnalysisResponse, BBox, Detection, ImageInfo, InferenceSettings, ModelInfo, Point

logger = logging.getLogger("cellscope.inference")

MODEL_KEY = "2D_versatile_fluo"
MODEL_DOMAIN = "2D fluorescence microscopy of a nuclear marker"
SOFTWARE_LICENSE = "BSD-3-Clause"
WEIGHTS_NOTE = "StarDist pretrained weights 2D_versatile_fluo"
NORMALIZATION = "csbdeep.utils.normalize percentiles 3 and 99.8, matching the StarDist pretrained-model example"

_model = None
_load_error: str | None = None
_predict_lock = threading.Lock()


def load_model():
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
    from stardist.models import StarDist2D

    return StarDist2D.from_pretrained(MODEL_KEY)


def load_into_state() -> None:
    global _model, _load_error
    if os.environ.get("CELLSCOPE_SKIP_MODEL") == "1":
        _model = None
        _load_error = "The StarDist model is not loaded, so live inference is unavailable."
        logger.info("model load skipped")
        return
    try:
        logger.info("loading %s", MODEL_KEY)
        _model = load_model()
        _load_error = None
        logger.info("model ready")
    except Exception as exc:
        _model = None
        _load_error = friendly_load_error(exc)
        logger.exception("model load failed")


def model_state() -> tuple[object | None, str | None]:
    return _model, _load_error


def friendly_load_error(exc: Exception) -> str:
    text = f"{type(exc).__name__}: {exc}".lower()
    if "no module named" in text or "modulenotfounderror" in text:
        return (
            "The analysis environment is missing a required package. "
            "Install backend/requirements.txt and restart the service."
        )
    if any(word in text for word in ("url", "download", "connection", "timeout", "certificate", "failed to resolve", "403", "404")):
        return (
            "Could not download the StarDist 2D_versatile_fluo weights. "
            "Check network access to GitHub, then restart the analysis service."
        )
    return (
        "The StarDist model could not be loaded. Install the backend requirements, "
        "confirm that 2D_versatile_fluo can be downloaded, and restart the service."
    )


def analyze_bytes(model, raw: bytes) -> AnalysisResponse:
    gray, meta = decode_upload(raw)
    return analyze_array(model, gray, warning=meta["warning"])


def run_model(model, gray: np.ndarray):
    """Return detections, the label image, and the settings actually used."""
    from csbdeep.utils import normalize

    height, width = gray.shape
    tiles = (max(1, math.ceil(height / 512)), max(1, math.ceil(width / 512)))
    prob_thresh = float(model.thresholds.prob)
    nms_thresh = float(model.thresholds.nms)
    normalized = normalize(np.asarray(gray, dtype=np.float32), 3, 99.8)
    timer = _timer()
    with _predict_lock:
        labels, details = model.predict_instances(
            normalized,
            prob_thresh=prob_thresh,
            nms_thresh=nms_thresh,
            n_tiles=tiles,
            show_tile_progress=False,
            verbose=False,
        )
    duration_ms = timer()
    detections = _detections(details)
    if labels is not None:
        predicted = len([value for value in np.unique(labels) if int(value) != 0])
        if predicted != len(detections):
            logger.warning("label count %s differed from polygons %s", predicted, len(detections))
    settings = {
        "probabilityThreshold": prob_thresh,
        "nmsThreshold": nms_thresh,
        "tiles": [tiles[0], tiles[1]],
        "durationMs": round(duration_ms, 1),
        "width": int(width),
        "height": int(height),
    }
    return detections, labels, settings


def analyze_array(model, gray: np.ndarray, warning: str | None = None) -> AnalysisResponse:
    started = datetime.now(timezone.utc)
    detections, _labels, settings = run_model(model, gray)
    import stardist

    return AnalysisResponse(
        analysisId=str(uuid.uuid4()),
        mode="live",
        createdAt=started.isoformat(),
        durationMs=settings["durationMs"],
        warning=warning,
        model=ModelInfo(
            name=f"StarDist {MODEL_KEY}",
            version=stardist.__version__,
            domain=MODEL_DOMAIN,
            weights=WEIGHTS_NOTE,
            license=SOFTWARE_LICENSE,
            probabilityThreshold=settings["probabilityThreshold"],
            nmsThreshold=settings["nmsThreshold"],
        ),
        settings=InferenceSettings(
            normalization=NORMALIZATION,
            channel="luminance",
            probabilityThreshold=settings["probabilityThreshold"],
            nmsThreshold=settings["nmsThreshold"],
            tiles=settings["tiles"],
        ),
        image=ImageInfo(width=settings["width"], height=settings["height"]),
        detections=detections,
    )


def _detections(details) -> list[Detection]:
    points = np.asarray(details["points"])
    coord = np.asarray(details["coord"])
    prob = np.asarray(details["prob"]).reshape(-1)
    if points.size == 0:
        return []
    detections: list[Detection] = []
    for index in range(points.shape[0]):
        ys = coord[index, 0]
        xs = coord[index, 1]
        polygon = [Point(x=round(float(x), 2), y=round(float(y), 2)) for x, y in zip(xs, ys)]
        min_x, max_x = float(np.min(xs)), float(np.max(xs))
        min_y, max_y = float(np.min(ys)), float(np.max(ys))
        detections.append(
            Detection(
                id=f"d-{index + 1:03d}",
                source="model",
                centerX=round(float(points[index, 1]), 2),
                centerY=round(float(points[index, 0]), 2),
                bbox=BBox(
                    x=round(min_x, 2),
                    y=round(min_y, 2),
                    width=round(max_x - min_x, 2),
                    height=round(max_y - min_y, 2),
                ),
                polygon=polygon,
                objectProbability=round(float(prob[index]), 4),
            )
        )
    return detections


def _timer():
    import time

    start = time.perf_counter()

    def finish() -> float:
        return (time.perf_counter() - start) * 1000

    return finish
