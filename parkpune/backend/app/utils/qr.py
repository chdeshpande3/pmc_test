"""Generate base64-encoded QR codes for gate entry."""
import io
import base64
import qrcode
from qrcode.image.pure import PyPNGImage


def generate_qr_base64(data: str) -> str:
    """Return a PNG QR code as a base64 data-URI."""
    img = qrcode.make(data, image_factory=PyPNGImage)
    buf = io.BytesIO()
    img.save(buf)
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode()
    return f"data:image/png;base64,{b64}"
