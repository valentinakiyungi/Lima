import os
import json

from groq import Groq

_client = None


def get_client() -> Groq:
    """Create the Groq client on first use so the server can start (and report
    a clear error) even if GROQ_API_KEY has not been set yet."""
    global _client
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set on the server.")
        _client = Groq(api_key=api_key)
    return _client


def process_lima_input(text_query: str = None, audio_file_path: str = None) -> dict:
    client = get_client()
    query = text_query

    # 1. Transcribe audio if provided
    if audio_file_path and os.path.exists(audio_file_path):
        with open(audio_file_path, "rb") as f:
            audio_bytes = f.read()
        if not audio_bytes:
            raise ValueError("The uploaded audio file is empty.")
        transcription = client.audio.transcriptions.create(
            file=(os.path.basename(audio_file_path), audio_bytes),
            model="whisper-large-v3-turbo",
            response_format="json",
        )
        query = transcription.text

    if not query or not query.strip():
        query = "No audible speech detected."

    # 2. Extract a summary and action items
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are Lima, an advanced AI Voice Assistant. Analyze the user's speech transcript. "
                    "Provide a clear, professional summary and extract concrete, actionable tasks (action items). "
                    "Return valid JSON with keys: 'summary' (string) and 'action_items' (array of strings)."
                ),
            },
            {"role": "user", "content": query},
        ],
        response_format={"type": "json_object"},
    )

    result_content = json.loads(completion.choices[0].message.content)

    return {
        "transcript": query,
        "summary": result_content.get("summary", "No summary generated."),
        "action_items": result_content.get("action_items", []),
    }
