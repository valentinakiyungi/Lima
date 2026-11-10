import os
import shutil
import tempfile

from fastapi import FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from lima_core import process_lima_input

app = FastAPI(title="Lima AI Agent API", version="1.1.0")

# The frontend (GitHub Pages) lives on a different origin, so allow cross-origin calls.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "online", "service": "Lima AI Agent API"}


@app.get("/health")
def health():
    return {"status": "ok", "groq_key_configured": bool(os.environ.get("GROQ_API_KEY"))}


@app.post("/chat/text")
def chat_text(
    user_id: str = Form("default_user"),
    message: str = Form(...),
    timezone: str = Form(""),
    history: str = Form(""),
):
    try:
        result = process_lima_input(
            text_query=message, timezone=timezone or None, history=history
        )
        return {"status": "success", "user_id": user_id, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/voice")
def chat_voice(
    file: UploadFile = File(...),
    user_id: str = Form("default_user"),
    timezone: str = Form(""),
    history: str = Form(""),
):
    suffix = os.path.splitext(file.filename or "")[1] or ".webm"
    tmp_path = None
    size = 0
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        size = os.path.getsize(tmp_path)
        result = process_lima_input(
            audio_file_path=tmp_path, timezone=timezone or None, history=history
        )
        return {"status": "success", "user_id": user_id, **result}
    except Exception as e:
        msg = str(e)
        if "invalid_media_file" in msg:
            raise HTTPException(
                status_code=422,
                detail=(
                    "I couldn't read that recording. It may have been too short, so please speak for a few "
                    f"seconds and try again. (received {size} bytes, type {file.content_type})"
                ),
            )
        raise HTTPException(status_code=500, detail=msg)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


# ---- Text to speech: the same natural voice on every phone and computer ----
VOICES = {
    "en": "en-US-AriaNeural",
    "id": "id-ID-GadisNeural",
    "ru": "ru-RU-SvetlanaNeural",
    "sw": "sw-KE-ZuriNeural",
    "ar": "ar-SA-ZariyahNeural",
    "es": "es-ES-ElviraNeural",
    "fr": "fr-FR-DeniseNeural",
    "de": "de-DE-KatjaNeural",
    "pt": "pt-BR-FranciscaNeural",
    "it": "it-IT-ElsaNeural",
    "tr": "tr-TR-EmelNeural",
    "hi": "hi-IN-SwaraNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
    "ja": "ja-JP-NanamiNeural",
    "ko": "ko-KR-SunHiNeural",
}


# Speaking speed, e.g. "+0%" is normal, "+15%" faster, "-10%" slower. Override with the TTS_RATE variable on Render.
TTS_RATE = os.environ.get("TTS_RATE", "+15%")


def pick_voice(lang: str) -> str:
    return VOICES.get((lang or "en").lower().replace("_", "-")[:2], VOICES["en"])


@app.post("/tts")
async def tts(text: str = Form(...), lang: str = Form("en-US")):
    text = text.strip()[:600]
    if not text:
        raise HTTPException(status_code=400, detail="No text to speak.")
    try:
        import edge_tts  # imported here so the rest of the API still starts if it is missing

        audio = bytearray()
        async for chunk in edge_tts.Communicate(text, pick_voice(lang), rate=TTS_RATE).stream():
            if chunk["type"] == "audio":
                audio.extend(chunk["data"])
        if not audio:
            raise RuntimeError("The voice service returned no audio.")
        return Response(content=bytes(audio), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Voice generation failed: {e}")
