"""One-to-one instance matching by mask IoU.

This is the criterion used for CellScope's reported detection metrics.
It follows the same decision rule as StarDist's matching helper: a pair
matches only when intersection-over-union is at least 0.5, and each
ground-truth nucleus and each prediction is used at most once.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class MatchScore:
    true_positives: int
    false_positives: int
    false_negatives: int
    ground_truth_count: int
    predicted_count: int

    @property
    def precision(self) -> float | None:
        denom = self.true_positives + self.false_positives
        if denom == 0:
            return None
        return self.true_positives / denom

    @property
    def recall(self) -> float | None:
        denom = self.true_positives + self.false_negatives
        if denom == 0:
            return None
        return self.true_positives / denom

    @property
    def f1(self) -> float | None:
        precision = self.precision
        recall = self.recall
        if precision is None or recall is None or (precision + recall) == 0:
            return None
        return 2 * precision * recall / (precision + recall)


def greedy_iou_match(ground_truth: np.ndarray, prediction: np.ndarray, threshold: float = 0.5) -> MatchScore:
    if ground_truth.shape != prediction.shape:
        raise ValueError("Ground truth and prediction must have the same shape.")
    gt_ids = [int(v) for v in np.unique(ground_truth) if int(v) != 0]
    pred_ids = [int(v) for v in np.unique(prediction) if int(v) != 0]
    candidates: list[tuple[float, int, int]] = []
    gt_masks = {gid: ground_truth == gid for gid in gt_ids}
    pred_masks = {pid: prediction == pid for pid in pred_ids}
    gt_areas = {gid: int(mask.sum()) for gid, mask in gt_masks.items()}
    pred_areas = {pid: int(mask.sum()) for pid, mask in pred_masks.items()}

    for gid, gmask in gt_masks.items():
        for pid, pmask in pred_masks.items():
            intersection = int(np.logical_and(gmask, pmask).sum())
            if intersection == 0:
                continue
            union = gt_areas[gid] + pred_areas[pid] - intersection
            iou = intersection / union if union else 0.0
            if iou >= threshold:
                candidates.append((iou, gid, pid))

    candidates.sort(key=lambda item: item[0], reverse=True)
    used_gt: set[int] = set()
    used_pred: set[int] = set()
    true_positives = 0
    for _iou, gid, pid in candidates:
        if gid in used_gt or pid in used_pred:
            continue
        used_gt.add(gid)
        used_pred.add(pid)
        true_positives += 1

    return MatchScore(
        true_positives=true_positives,
        false_positives=len(pred_ids) - true_positives,
        false_negatives=len(gt_ids) - true_positives,
        ground_truth_count=len(gt_ids),
        predicted_count=len(pred_ids),
    )


def mean_absolute_count_error(pairs: list[tuple[int, int]]) -> float:
    if not pairs:
        raise ValueError("Counting error needs at least one image.")
    return sum(abs(truth - predicted) for truth, predicted in pairs) / len(pairs)


def combine(scores: list[MatchScore]) -> MatchScore:
    return MatchScore(
        true_positives=sum(s.true_positives for s in scores),
        false_positives=sum(s.false_positives for s in scores),
        false_negatives=sum(s.false_negatives for s in scores),
        ground_truth_count=sum(s.ground_truth_count for s in scores),
        predicted_count=sum(s.predicted_count for s in scores),
    )
