"""Decode uploaded PNG and JPEG files into a luminance array.

Uploads are kept in memory and are not written to disk.
"""

from __future__ import annotations

from io import BytesIO

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_BYTES = 20 * 1024 * 1024
MIN_EDGE = 64
MAX_EDGE = 4096


class ImageReject(ValueError):
    """The upload cannot be analysed. The message is safe to show to the user."""


def decode_upload(raw: bytes) -> tuple[np.ndarray, dict]:
    if not raw:
        raise ImageReject("The file is empty.")
    if len(raw) > MAX_BYTES:
        raise ImageReject("This file is larger than 20 MB.")
    try:
        with Image.open(BytesIO(raw)) as opened:
            transposed = ImageOps.exif_transpose(opened)
            transposed.load()
            fmt = opened.format or transposed.format
            if fmt not in {"PNG", "JPEG"}:
                raise ImageReject("Only PNG and JPEG images can be analysed.")
            channel, notice = _to_rgb_or_gray(transposed)
            array = np.asarray(channel).copy()
    except ImageReject:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ImageReject("This file could not be decoded. It may be damaged or not a real PNG or JPEG.") from exc
    if array.ndim == 2:
        gray = array.astype(np.float32)
    elif array.ndim == 3 and array.shape[2] >= 3:
        rgb = array[:, :, :3].astype(np.float32)
        gray = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
    else:
        raise ImageReject("This image does not have a usable channel layout.")

    height, width = gray.shape
    if width < MIN_EDGE or height < MIN_EDGE:
        raise ImageReject(f"The image is {width}×{height}. Each side must be at least {MIN_EDGE} pixels.")
    if width > MAX_EDGE or height > MAX_EDGE:
        raise ImageReject(f"The image is {width}×{height}. Each side must be at most {MAX_EDGE} pixels.")

    warnings = [notice] if notice else []
    if float(np.median(gray)) > 140:
        warnings.append(
            "The image is much brighter than a typical fluorescence field. "
            "2D_versatile_fluo is only supported for fluorescence nuclear markers, so these detections may be unreliable."
        )
    return gray, {
        "width": int(width),
        "height": int(height),
        "warning": " ".join(warnings) if warnings else None,
    }


def _to_rgb_or_gray(image: Image.Image) -> tuple[Image.Image, str | None]:
    if image.mode == "L":
        return image, None
    if image.mode == "RGBA":
        return image.convert("RGB"), (
            "The alpha channel was discarded and the image was reduced to luminance. "
            "This model expects a single nuclear-fluorescence channel."
        )
    if image.mode != "RGB":
        image = image.convert("RGB")
    return image, "Color was reduced to luminance. This model expects a single nuclear-fluorescence channel."
