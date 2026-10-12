"""Shared response schema for inference and exports."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class Point(BaseModel):
    x: float
    y: float


class BBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class Detection(BaseModel):
    id: str
    source: Literal["model", "manual", "sample"]
    centerX: float
    centerY: float
    bbox: BBox | None = None
    polygon: list[Point] | None = None
    objectProbability: float | None = None


class ModelInfo(BaseModel):
    name: str
    version: str
    domain: str
    weights: str
    license: str
    probabilityThreshold: float | None = None
    nmsThreshold: float | None = None


class InferenceSettings(BaseModel):
    normalization: str
    channel: str
    probabilityThreshold: float | None = None
    nmsThreshold: float | None = None
    tiles: list[int] = Field(default_factory=list)


class ImageInfo(BaseModel):
    width: int
    height: int


class AnalysisResponse(BaseModel):
    analysisId: str
    mode: Literal["live", "demo"]
    createdAt: str
    durationMs: float
    warning: str | None = None
    model: ModelInfo
    settings: InferenceSettings
    image: ImageInfo
    detections: list[Detection]
