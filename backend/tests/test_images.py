from io import BytesIO

import pytest
from PIL import Image

from app.images import ImageReject, decode_upload


def _png(size, color, mode="L"):
    buffer = BytesIO()
    Image.new(mode, size, color).save(buffer, format="PNG")
    return buffer.getvalue()


def test_dark_grayscale_png_decodes():
    gray, meta = decode_upload(_png((80, 70), 12))
    assert gray.shape == (70, 80)
    assert meta["warning"] is None


def test_color_image_warns_about_luminance():
    _gray, meta = decode_upload(_png((80, 80), (8, 12, 40), mode="RGB"))
    assert meta["warning"]
    assert "luminance" in meta["warning"]


def test_bright_image_warns_about_domain():
    _gray, meta = decode_upload(_png((80, 80), 210))
    assert "brighter" in meta["warning"]


def test_rejects_text_bytes():
    with pytest.raises(ImageReject):
        decode_upload(b"not an image")


def test_rejects_tiny_image():
    with pytest.raises(ImageReject):
        decode_upload(_png((32, 80), 12))


def test_rejects_oversized_edge():
    with pytest.raises(ImageReject):
        decode_upload(_png((4097, 64), 12))
