"""Generate batch 3 assets: Ronch peeking corner art + rust texture overlay.

Uses the mockup reference (same pipeline as generate_icons_v2) so the
new assets stylistically match the rest of the app.
"""
import asyncio
import base64
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from PIL import Image, PngImagePlugin

load_dotenv("/app/backend/.env")
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent  # noqa: E402

OUT_DIR = Path("/app/frontend/assets/decor")
OUT_DIR.mkdir(parents=True, exist_ok=True)
MOCKUP = Path("/tmp/mockup_ref.jpg")

STYLE = (
    "Match the artwork style of the reference exactly — hand-inked comic, "
    "thick black outlines, slime green (#39ff14), purple anarchy accents, "
    "rusted bone tones, grunge texture, no text or labels."
)

TARGETS = {
    "ronch_peek.png": (
        f"{STYLE} Only the top half of a grinning skull mascot character "
        "(Ronch) peeking up from the bottom of the frame — like he's "
        "popping over a wall. Only forehead, eyes (glowing slime green), "
        "and tops of hands gripping the edge are visible. Lots of empty "
        "transparent dark space ABOVE the character. Centered horizontally. "
        "Composition: subject only in the BOTTOM HALF of the frame, "
        "TOP HALF is mostly empty/dark for overlay use."
    ),
    "rust_texture.png": (
        f"{STYLE} A seamless tileable RUST METAL texture — rusty orange "
        "and dark brown patina, paint chipping, faint cracks, no clear "
        "subject, just texture for tiling behind UI cards. Subtle, not "
        "overpowering. Even distribution, no obvious center focal point."
    ),
}


def _save_clean(raw: bytes, out: Path, w: int, h: int) -> int:
    tmp = out.with_suffix(".tmp.png")
    tmp.write_bytes(raw)
    im = Image.open(tmp).convert("RGB")
    # Resize keeping the model's composition; center-crop to target aspect
    iw, ih = im.size
    target_r = w / h
    cur_r = iw / ih
    if cur_r > target_r:
        new_w = int(ih * target_r)
        left = (iw - new_w) // 2
        im = im.crop((left, 0, left + new_w, ih))
    elif cur_r < target_r:
        new_h = int(iw / target_r)
        top = (ih - new_h) // 2
        im = im.crop((0, top, iw, top + new_h))
    im = im.resize((w, h), Image.LANCZOS)
    clean = PngImagePlugin.PngInfo()
    im.save(out, "PNG", optimize=True, pnginfo=clean)
    tmp.unlink(missing_ok=True)
    return out.stat().st_size


async def main():
    ref_b64 = base64.b64encode(MOCKUP.read_bytes()).decode()
    for name, prompt in TARGETS.items():
        out = OUT_DIR / name
        if out.exists():
            print(f"  [skip] {name}")
            continue
        chat = LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=f"tkk-decor-{name}",
            system_message="Generate ONE image. No text.",
        )
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(
            modalities=["image", "text"]
        )
        msg = UserMessage(text=prompt, file_contents=[ImageContent(ref_b64)])
        print(f"  [gen ] {name}")
        _t, imgs = await chat.send_message_multimodal_response(msg)
        if not imgs:
            print(f"  [ERR ] {name}: no images")
            continue
        raw = base64.b64decode(imgs[0]["data"])
        # ronch_peek: 512x256 (wide), rust: 512x512 tile
        if name.startswith("ronch_peek"):
            sz = _save_clean(raw, out, 512, 256)
        else:
            sz = _save_clean(raw, out, 512, 512)
        print(f"  [ok  ] {name} -> {sz} bytes")
        await asyncio.sleep(2)


if __name__ == "__main__":
    sys.exit(asyncio.run(main()) or 0)
