import os
from groq import Groq
from pydantic import BaseModel, Field
from typing import List

# Initialize Groq client (requires GROQ_API_KEY environment variable)
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

class LimaAgentResponse(BaseModel):
    primary_answer: str = Field(description="The core, comprehensive answer to the user's query or voice note.")
    follow_up_suggestions: List[str] = Field(description="2 to 3 proactive follow-up questions or next steps for the user.")

def process_lima_input(text_query: str = None, audio_file_path: str = None) -> dict:
    query = text_query
    
    # 1. If a voice note/audio file is provided, transcribe it first via Whisper
    if audio_file_path and os.path.exists(audio_file_path):
        with open(audio_file_path, "rb") as file:
            transcription = groq_client.audio.transcriptions.create(
                file=(audio_file_path, file.read()),
                model="whisper-large-v3",
                response_format="json"
            )
            query = transcription.text
    
    if not query:
        return {"error": "No valid text or audio input provided."}

    # 2. Process the query through Groq LLM with structured output for rich results
    completion = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are Lima, an advanced AI assistant. Your job is to listen to user queries or voice transcripts, "
                    "provide thorough, actionable results, and offer proactive follow-up suggestions. "
                    "Always return valid JSON matching the requested schema."
                )
            },
            {
                "role": "user",
                "content": query
            }
        ],
        response_format={"type": "json_object"}
    )
    
    import json
    result_content = json.loads(completion.choices[0].message.content)
    
    return {
        "user_transcript_or_query": query,
        "reply": result_content.get("primary_answer", "Processed successfully."),
        "follow_up_suggestions": result_content.get("follow_up_suggestions", [])
    }
