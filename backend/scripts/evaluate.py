"""Evaluate 2D_versatile_fluo on the synthetic fluorescence validation split.

The images are generated in this repository. They are not a public benchmark
and the metrics are not an estimate of performance on laboratory data.

Matching is greedy and one-to-one: a prediction and a ground-truth nucleus
match only when their mask IoU is at least 0.5, and each object is used once.
Detection scores are accumulated across images (micro precision, recall, F1).
Counting error is the mean absolute difference of object counts, which can
stay small even when detections are wrong.

Usage (from the backend directory, with the virtualenv active):

    python scripts/evaluate.py
"""

from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.inference import MODEL_DOMAIN, MODEL_KEY, NORMALIZATION, load_model, run_model  # noqa: E402
from app.matching import combine, greedy_iou_match, mean_absolute_count_error  # noqa: E402
from app.paths import EXAMPLES_DIR, REPORT_PATH  # noqa: E402
from app.synthetic import validation_fields  # noqa: E402

DATASET_NAME = "CellScope synthetic fluorescence nuclei"
DATASET_VERSION = "1"
DATASET_SEED = 7
SPLIT = "validation"
IOU_THRESHOLD = 0.5
EXAMPLE_COUNT = 3


def boundary(labels: np.ndarray) -> np.ndarray:
    edge = np.zeros(labels.shape, dtype=bool)
    edge[1:] |= (labels[1:] != labels[:-1]) & ((labels[1:] != 0) | (labels[:-1] != 0))
    edge[:, 1:] |= (labels[:, 1:] != labels[:, :-1]) & ((labels[:, 1:] != 0) | (labels[:, :-1] != 0))
    return edge


def paint(gray: np.ndarray, labels: np.ndarray, color: tuple[int, int, int]) -> np.ndarray:
    rgb = np.dstack([gray, gray, gray])
    rgb[boundary(labels)] = color
    return rgb


def save_png(path: Path, array: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if array.ndim == 2:
        Image.fromarray(array.astype(np.uint8), mode="L").save(path)
    else:
        Image.fromarray(array.astype(np.uint8), mode="RGB").save(path)


def main() -> None:
    started = time.perf_counter()
    model = load_model()
    fields = validation_fields(n_images=6, seed=DATASET_SEED)
    scores = []
    per_image = []
    examples = []
    import stardist
    from stardist.matching import matching

    settings = None
    for image_id, gray, ground_truth in fields:
        _detections, labels, settings = run_model(model, gray)
        score = greedy_iou_match(ground_truth, labels, threshold=IOU_THRESHOLD)
        reference = matching(ground_truth, labels, thresh=IOU_THRESHOLD)
        if int(reference.tp) != score.true_positives or int(reference.fp) != score.false_positives or int(reference.fn) != score.false_negatives:
            raise SystemExit(f"Matcher disagreed with stardist.matching on {image_id}")
        scores.append(score)
        per_image.append(
            {
                "id": image_id,
                "groundTruth": score.ground_truth_count,
                "predicted": score.predicted_count,
                "absoluteError": abs(score.predicted_count - score.ground_truth_count),
                "truePositives": score.true_positives,
                "falsePositives": score.false_positives,
                "falseNegatives": score.false_negatives,
            }
        )
        if len(examples) < EXAMPLE_COUNT:
            EXAMPLES_DIR.mkdir(parents=True, exist_ok=True)
            save_png(EXAMPLES_DIR / f"{image_id}-input.png", gray)
            save_png(EXAMPLES_DIR / f"{image_id}-ground-truth.png", paint(gray, ground_truth, (224, 168, 74)))
            save_png(EXAMPLES_DIR / f"{image_id}-prediction.png", paint(gray, labels, (125, 206, 198)))
            examples.append(
                {
                    "id": image_id,
                    "groundTruthCount": score.ground_truth_count,
                    "predictedCount": score.predicted_count,
                    "inputUrl": f"/api/evaluation/examples/{image_id}/input",
                    "groundTruthUrl": f"/api/evaluation/examples/{image_id}/ground-truth",
                    "predictionUrl": f"/api/evaluation/examples/{image_id}/prediction",
                }
            )
        print(
            f"{image_id} gt={score.ground_truth_count} pred={score.predicted_count} "
            f"tp={score.true_positives} fp={score.false_positives} fn={score.false_negatives}"
        )

    total = combine(scores)
    report = {
        "dataset": {
            "name": DATASET_NAME,
            "version": DATASET_VERSION,
            "split": SPLIT,
            "imageCount": len(fields),
            "seed": DATASET_SEED,
            "description": (
                "Six synthetic 384×288 fluorescence fields generated with seed 7. "
                "Each field includes one deliberately touching pair. "
                "Ground-truth masks are the 2σ ellipses of the Gaussians used to paint the nuclei "
                "(about 14% of each peak), not a hand tracing of a laboratory image. "
                "This split does not include the workspace sample image."
            ),
        },
        "model": {
            "name": f"StarDist {MODEL_KEY}",
            "version": stardist.__version__,
            "domain": MODEL_DOMAIN,
            "weights": "StarDist pretrained weights 2D_versatile_fluo",
            "probabilityThreshold": None if settings is None else settings["probabilityThreshold"],
            "nmsThreshold": None if settings is None else settings["nmsThreshold"],
            "normalization": NORMALIZATION,
        },
        "matching": {
            "method": "greedy one-to-one",
            "criterion": "mask IoU",
            "threshold": IOU_THRESHOLD,
            "description": (
                "Each predicted nucleus is paired with at most one ground-truth nucleus, "
                "and the other way around. Pairs are accepted in descending mask IoU, and only when IoU is at least 0.5. "
                "The masks are the model's label image and the 2σ ellipses used to draw the synthetic nuclei."
            ),
        },
        "detection": {
            "precision": _ratio(total.precision),
            "recall": _ratio(total.recall),
            "f1": _ratio(total.f1),
            "truePositives": total.true_positives,
            "falsePositives": total.false_positives,
            "falseNegatives": total.false_negatives,
        },
        "counting": {
            "meanAbsoluteError": round(
                mean_absolute_count_error([(row["groundTruth"], row["predicted"]) for row in per_image]),
                4,
            ),
            "description": (
                "Mean absolute difference between the ground-truth count and the predicted count on each image. "
                "A small counting error does not mean each nucleus was found: misses and extra detections can cancel."
            ),
            "perImage": per_image,
        },
        "examples": examples,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "runtimeSeconds": round(time.perf_counter() - started, 1),
        "limitation": (
            "These figures measure the pretrained fluorescence model on a synthetic validation split created for this prototype. "
            "They are not a clinical validation and they are not an estimate of accuracy on laboratory images."
        ),
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2))
    print(f"wrote {REPORT_PATH}")
    print(
        f"precision={report['detection']['precision']} recall={report['detection']['recall']} "
        f"f1={report['detection']['f1']} mae={report['counting']['meanAbsoluteError']}"
    )


def _ratio(value: float | None) -> float | None:
    if value is None:
        return None
    return round(float(value), 4)


if __name__ == "__main__":
    main()
