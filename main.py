import os
import shutil
import tempfile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
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
def chat_text(user_id: str = Form("default_user"), message: str = Form(...)):
    try:
        result = process_lima_input(text_query=message)
        return {"status": "success", "user_id": user_id, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/voice")
def chat_voice(file: UploadFile = File(...), user_id: str = Form("default_user")):
    suffix = os.path.splitext(file.filename or "")[1] or ".webm"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        result = process_lima_input(audio_file_path=tmp_path)
        return {"status": "success", "user_id": user_id, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
