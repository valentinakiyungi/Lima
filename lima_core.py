import os
import json
from groq import Groq
from schemas import LimaVoiceResponse

groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY") or os.environ.get("GROQ_API_KEY"))

def process_lima_input(text_query: str = None, audio_file_path: str = None) -> dict:
    query = text_query
    
    # 1. Transcribe audio if provided
    if audio_file_path and os.path.exists(audio_file_path):
        with open(audio_file_path, "rb") as file:
            transcription = groq_client.audio.transcriptions.create(
                file=(audio_file_path, file.read()),
                model="whisper-large-v3",
                response_format="json"
            )
            query = transcription.text
    
    if not query or not query.strip():
        query = "No audible speech detected."

    # 2. Extract structured summary & action items using Groq Llama 3.3
    completion = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are Lima, an advanced AI Voice Assistant. Analyze the user's speech transcript. "
                    "Provide a clear, professional summary and extract concrete, actionable tasks (action items). "
                    "Return valid JSON with keys: 'summary' (string) and 'action_items' (array of strings)."
                )
            },
            {
                "role": "user",
                "content": query
            }
        ],
        response_format={"type": "json_object"}
    )
    
    result_content = json.loads(completion.choices[0].message.content)
    
    return {
        "transcript": query,
        "summary": result_content.get("summary", "No summary generated."),
        "action_items": result_content.get("action_items", [])
    }
