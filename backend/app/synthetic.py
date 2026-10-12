"""Deterministic synthetic fluorescence nuclei fields.

These images are generated for the prototype. They are not laboratory
micrographs. Ellipses are the drawing primitives and the ground-truth
geometry for sample annotations and the validation split.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class Nucleus:
    cy: float
    cx: float
    ry: float
    rx: float
    theta: float
    amplitude: float


# Ground-truth contours sit at 2σ of the Gaussian used to paint each nucleus,
# where that nucleus's signal has fallen to about 14% of its peak.
CONTOUR_SCALE = 2.0


def _ellipse_polygon(n: Nucleus, samples: int = 32, scale: float = CONTOUR_SCALE) -> list[dict[str, float]]:
    points: list[dict[str, float]] = []
    for angle in np.linspace(0, 2 * math.pi, samples, endpoint=False):
        yr = n.ry * scale * math.cos(float(angle))
        xr = n.rx * scale * math.sin(float(angle))
        x = n.cx + xr * math.cos(n.theta) - yr * math.sin(n.theta)
        y = n.cy + xr * math.sin(n.theta) + yr * math.cos(n.theta)
        points.append({"x": round(x, 2), "y": round(y, 2)})
    return points


def _bbox(points: list[dict[str, float]]) -> dict[str, float]:
    xs = [p["x"] for p in points]
    ys = [p["y"] for p in points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    return {
        "x": round(min_x, 2),
        "y": round(min_y, 2),
        "width": round(max_x - min_x, 2),
        "height": round(max_y - min_y, 2),
    }


def paint_field(
    height: int,
    width: int,
    nuclei: list[Nucleus],
    rng: np.random.Generator,
) -> np.ndarray:
    canvas = np.zeros((height, width), dtype=np.float32)
    yy, xx = np.mgrid[0:height, 0:width]
    for n in nuclei:
        cos_t = math.cos(n.theta)
        sin_t = math.sin(n.theta)
        y0 = max(0, int(n.cy - n.rx - n.ry - 4))
        y1 = min(height, int(n.cy + n.rx + n.ry + 5))
        x0 = max(0, int(n.cx - n.rx - n.ry - 4))
        x1 = min(width, int(n.cx + n.rx + n.ry + 5))
        ys = yy[y0:y1, x0:x1] - n.cy
        xs = xx[y0:y1, x0:x1] - n.cx
        yr = xs * sin_t + ys * cos_t
        xr = xs * cos_t - ys * sin_t
        energy = np.exp(-0.5 * ((xr / n.rx) ** 2 + (yr / n.ry) ** 2))
        canvas[y0:y1, x0:x1] += n.amplitude * energy.astype(np.float32)

    illum_y = np.linspace(-1, 1, height, dtype=np.float32)[:, None]
    illum_x = np.linspace(-1, 1, width, dtype=np.float32)[None, :]
    illumination = 1 + 0.08 * np.exp(-1.4 * (illum_y**2 + illum_x**2))
    image = canvas * illumination
    image += rng.normal(0, 2.4, image.shape).astype(np.float32)
    image += 12
    return np.clip(image, 0, 255).astype(np.uint8)


def label_field(height: int, width: int, nuclei: list[Nucleus]) -> np.ndarray:
    """Partition pixels inside the 2σ ellipse to the nucleus with the smaller normalised radius."""
    labels = np.zeros((height, width), dtype=np.uint16)
    best = np.full((height, width), np.float32(CONTOUR_SCALE**2 + 1))
    limit = CONTOUR_SCALE**2
    yy, xx = np.mgrid[0:height, 0:width]
    for index, n in enumerate(nuclei, start=1):
        cos_t = math.cos(n.theta)
        sin_t = math.sin(n.theta)
        pad = CONTOUR_SCALE * (n.rx + n.ry) + 2
        y0 = max(0, int(math.floor(n.cy - pad)))
        y1 = min(height, int(math.ceil(n.cy + pad)))
        x0 = max(0, int(math.floor(n.cx - pad)))
        x1 = min(width, int(math.ceil(n.cx + pad)))
        ys = yy[y0:y1, x0:x1] - n.cy
        xs = xx[y0:y1, x0:x1] - n.cx
        yr = xs * sin_t + ys * cos_t
        xr = xs * cos_t - ys * sin_t
        rnorm = (xr / n.rx) ** 2 + (yr / n.ry) ** 2
        region = labels[y0:y1, x0:x1]
        score = best[y0:y1, x0:x1]
        update = (rnorm <= limit) & (rnorm <= score)
        region[update] = index
        score[update] = rnorm[update]
        labels[y0:y1, x0:x1] = region
        best[y0:y1, x0:x1] = score
    return labels


def detections_from_nuclei(nuclei: list[Nucleus], source: str, id_prefix: str) -> list[dict]:
    detections: list[dict] = []
    for index, n in enumerate(nuclei, start=1):
        polygon = _ellipse_polygon(n)
        detections.append(
            {
                "id": f"{id_prefix}-{index:03d}",
                "source": source,
                "centerX": round(n.cx, 2),
                "centerY": round(n.cy, 2),
                "bbox": _bbox(polygon),
                "polygon": polygon,
                "objectProbability": None,
            }
        )
    return detections


def _scatter(
    rng: np.random.Generator,
    height: int,
    width: int,
    count: int,
    min_distance: float,
    margin: float = 36,
) -> list[Nucleus]:
    nuclei: list[Nucleus] = []
    for _ in range(4000):
        if len(nuclei) >= count:
            break
        cx = float(rng.uniform(margin, width - margin))
        cy = float(rng.uniform(margin, height - margin))
        if any((cx - n.cx) ** 2 + (cy - n.cy) ** 2 < min_distance**2 for n in nuclei):
            continue
        rx = float(rng.uniform(10, 20))
        ry = rx * float(rng.uniform(0.7, 1.12))
        nuclei.append(
            Nucleus(
                cy=cy,
                cx=cx,
                ry=ry,
                rx=rx,
                theta=float(rng.uniform(0, math.pi)),
                amplitude=float(rng.uniform(95, 210)),
            )
        )
    return nuclei


def sample_workspace_field() -> tuple[np.ndarray, list[Nucleus]]:
    """A composed demonstration field with two deliberately close pairs."""
    rng = np.random.default_rng(11)
    height, width = 800, 1120
    nuclei = _scatter(rng, height, width, count=24, min_distance=48)
    nuclei.extend(
        [
            Nucleus(cy=248, cx=430, ry=15, rx=17, theta=0.4, amplitude=180),
            Nucleus(cy=262, cx=450, ry=13, rx=16, theta=1.1, amplitude=160),
            Nucleus(cy=560, cx=780, ry=14, rx=18, theta=0.2, amplitude=150),
            Nucleus(cy=546, cx=798, ry=12, rx=15, theta=1.4, amplitude=190),
            Nucleus(cy=140, cx=18, ry=16, rx=22, theta=0.6, amplitude=140),
            Nucleus(cy=640, cx=960, ry=28, rx=34, theta=0.8, amplitude=48),
        ]
    )
    image = paint_field(height, width, nuclei, rng)
    return image, nuclei


def validation_fields(n_images: int = 6, seed: int = 7) -> list[tuple[str, np.ndarray, np.ndarray]]:
    """Held-out synthetic split. Independent of the workspace sample seed."""
    fields: list[tuple[str, np.ndarray, np.ndarray]] = []
    height, width = 288, 384
    for index in range(n_images):
        rng = np.random.default_rng(seed + index * 17)
        count = int(rng.integers(10, 16))
        nuclei = _scatter(rng, height, width, count=count, min_distance=34, margin=24)
        # One touching pair per image so overlap behaviour is represented.
        nuclei.append(Nucleus(cy=150, cx=190, ry=13, rx=15, theta=0.3, amplitude=170))
        nuclei.append(Nucleus(cy=162, cx=206, ry=12, rx=14, theta=1.2, amplitude=155))
        image = paint_field(height, width, nuclei, rng)
        labels = label_field(height, width, nuclei)
        fields.append((f"val-{index + 1:02d}", image, labels))
    return fields
