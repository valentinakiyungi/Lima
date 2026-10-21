import shutil
import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from lima_core import process_lima_input

app = FastAPI(title="Lima AI Agent API - Upgraded")

@app.post("/chat/text")
async def chat_text(user_id: str = Form(...), message: str = Form(...)):
    try:
        result = process_lima_input(text_query=message)
        return {"status": "success", "user_id": user_id, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/voice")
async def chat_voice(user_id: str = Form(...), file: UploadFile = File(...)):
    try:
        temp_file_path = f"temp_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        result = process_lima_input(audio_file_path=temp_file_path)
        
        # Cleanup temporary audio file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            
        return {"status": "success", "user_id": user_id, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
