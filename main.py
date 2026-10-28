import shutil
import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from lima_core import process_lima_input

app = FastAPI(title="Lima AI Agent API")

# Enable CORS so your frontend UI can communicate with the backend smoothly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/chat/text")
async def chat_text(user_id: str = Form(...), message: str = Form(...)):
    try:
        result = process_lima_input(text_query=message)
        return {"status": "success", "user_id": user_id, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/voice")
async def chat_voice(user_id: str = Form(default="val_123"), file: UploadFile = File(...)):
    try:
        temp_file_path = f"temp_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        result = process_lima_input(audio_file_path=temp_file_path)
        
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            
        return {"status": "success", "user_id": user_id, **result}
    except Exception as e:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import File, UploadFile, Form
import shutil
import os

@app.post("/chat/voice")
async def chat_voice(file: UploadFile = File(...), user_id: str = Form("default_user")):
    try:
        # Save temporary audio file
        temp_filename = f"temp_{file.filename}"
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Process audio via Groq Whisper or fallback agent engine
        # (Replace with your actual transcription/agent logic if modularized)
        transcript = "Voice note received successfully."
        summary = "Audio upload processed via Lima cloud agent."
        action_items = ["Review generated audio transcript."]
        
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

        return {
            "transcript": transcript,
            "summary": summary,
            "action_items": action_items
        }
    except Exception as e:
        return {"detail": str(e)}, 500
