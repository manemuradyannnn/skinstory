import numpy as np
import pytest

from app.matching import greedy_iou_match, mean_absolute_count_error


def test_identical_masks_are_perfect_detection():
    labels = np.zeros((20, 20), dtype=np.uint16)
    labels[2:8, 2:8] = 1
    labels[10:18, 10:18] = 2
    score = greedy_iou_match(labels, labels.copy())
    assert score.true_positives == 2
    assert score.false_positives == 0
    assert score.false_negatives == 0
    assert score.precision == 1
    assert score.recall == 1
    assert score.f1 == 1


def test_disjoint_objects_do_not_match():
    ground_truth = np.zeros((30, 30), dtype=np.uint16)
    prediction = np.zeros_like(ground_truth)
    ground_truth[2:10, 2:10] = 1
    prediction[18:26, 18:26] = 1
    score = greedy_iou_match(ground_truth, prediction)
    assert score.true_positives == 0
    assert score.false_positives == 1
    assert score.false_negatives == 1


def test_one_prediction_matches_only_one_nucleus():
    ground_truth = np.zeros((20, 30), dtype=np.uint16)
    prediction = np.zeros_like(ground_truth)
    ground_truth[0:10, 0:10] = 1
    ground_truth[0:10, 12:22] = 2
    prediction[0:10, 0:16] = 1
    score = greedy_iou_match(ground_truth, prediction, threshold=0.5)
    assert score.true_positives == 1
    assert score.false_positives == 0
    assert score.false_negatives == 1


def test_iou_threshold_is_inclusive_at_half_and_above():
    ground_truth = np.zeros((10, 20), dtype=np.uint16)
    above = np.zeros_like(ground_truth)
    below = np.zeros_like(ground_truth)
    ground_truth[:, 0:10] = 1
    above[:, 3:13] = 1
    below[:, 4:14] = 1
    assert greedy_iou_match(ground_truth, above).true_positives == 1
    assert greedy_iou_match(ground_truth, below).true_positives == 0


def test_empty_images_leave_ratios_undefined():
    blank = np.zeros((5, 5), dtype=np.uint16)
    score = greedy_iou_match(blank, blank.copy())
    assert score.true_positives == 0
    assert score.precision is None
    assert score.recall is None
    assert score.f1 is None


def test_shape_mismatch():
    with pytest.raises(ValueError):
        greedy_iou_match(np.zeros((4, 4), dtype=np.uint16), np.zeros((4, 5), dtype=np.uint16))


def test_counting_error_is_separate_from_detection():
    assert mean_absolute_count_error([(10, 12), (5, 5), (3, 0)]) == pytest.approx(5 / 3)
