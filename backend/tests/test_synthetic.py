import json
from pathlib import Path

import numpy as np
from PIL import Image

from app.synthetic import label_field, sample_workspace_field, validation_fields

ROOT = Path(__file__).resolve().parents[2]


def test_sample_annotations_match_the_committed_image():
    image, nuclei = sample_workspace_field()
    stored = np.asarray(Image.open(ROOT / "frontend" / "public" / "samples" / "fluorescence-nuclei.png"))
    assert stored.shape == image.shape
    assert np.array_equal(stored, image)
    payload = json.loads((ROOT / "frontend" / "src" / "data" / "sampleAnnotations.json").read_text())
    assert payload["width"] == image.shape[1]
    assert payload["height"] == image.shape[0]
    assert len(payload["detections"]) == len(nuclei)
    assert payload["detections"][0]["source"] == "sample"
    assert payload["detections"][0]["objectProbability"] is None
    assert float(np.median(image)) < 40


def test_validation_split_is_stable_and_separate_from_the_sample():
    first = validation_fields()
    second = validation_fields()
    assert [name for name, _image, _labels in first] == [f"val-{index:02d}" for index in range(1, 7)]
    assert np.array_equal(first[0][1], second[0][1])
    sample, _nuclei = sample_workspace_field()
    assert sample.shape != first[0][1].shape


def test_touching_nuclei_keep_separate_labels():
    _name, _image, labels = validation_fields(n_images=1)[0]
    assert len([value for value in np.unique(labels) if value != 0]) >= 2
    assert label_field(4, 4, []).shape == (4, 4)
