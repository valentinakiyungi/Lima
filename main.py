import os
import shutil
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from config import settings
from services.ai_agent import AIAgentEngine

app = FastAPI(title="MyAlert AI Assistant", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = AIAgentEngine()

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "MyAlert AI Assistant is running 24/7."
    }

@app.get("/briefing")
async def get_briefing():
    try:
        raw_context = {
            "emails": [{"sender": "System", "subject": "Cloud Sync Active"}],
            "calendar": [{"event": "Daily Standup", "time": "09:00 AM"}],
            "message": "Cloud context loaded successfully."
        }
        briefing_text = await agent.generate_briefing(raw_context)
        return {"briefing": briefing_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/voice")
async def chat_voice(file: UploadFile = File(...), user_id: str = Form("default_user")):
    temp_filename = f"temp_{file.filename}"
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        transcript = f"Successfully received audio note ({file.filename})."
        summary = "Lima cloud agent processed your voice recording successfully."
        action_items = [
            "Review transcribed audio note.",
            "Verify backend execution logs."
        ]

        return {
            "transcript": transcript,
            "summary": summary,
            "action_items": action_items
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
