"""Write the fictional fluorescence sample used by the review workspace."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.synthetic import detections_from_nuclei, sample_workspace_field  # noqa: E402


def main() -> None:
    image, nuclei = sample_workspace_field()
    public = ROOT / "frontend" / "public" / "samples"
    data = ROOT / "frontend" / "src" / "data"
    public.mkdir(parents=True, exist_ok=True)
    data.mkdir(parents=True, exist_ok=True)
    Image.fromarray(image, mode="L").save(public / "fluorescence-nuclei.png")
    payload = {
        "fileName": "fluorescence-nuclei.png",
        "width": int(image.shape[1]),
        "height": int(image.shape[0]),
        "seed": 11,
        "note": (
            "Synthetic 2D fluorescence field drawn for this prototype. "
            "Contours are the 2σ ellipses of the Gaussians used to paint the nuclei, not a model prediction."
        ),
        "detections": detections_from_nuclei(nuclei, source="sample", id_prefix="s"),
    }
    (data / "sampleAnnotations.json").write_text(json.dumps(payload, indent=2))
    print(f"wrote {image.shape[1]}x{image.shape[0]} with {len(nuclei)} nuclei")
    print("median", float(np.median(image)))


if __name__ == "__main__":
    main()
