import os
import json
from datetime import datetime, timezone as dt_timezone
from zoneinfo import ZoneInfo

from groq import Groq

_client = None

# Override with the LLM_MODEL environment variable on Render if Groq retires this model.
LLM_MODEL = os.environ.get("LLM_MODEL", "openai/gpt-oss-120b")

DEFAULT_FOLLOW_UP = "Is there anything else I can help you with?"


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


def now_text(tz_name: str = None) -> str:
    """Current date/time in the user's timezone (falls back to UTC)."""
    try:
        now = datetime.now(ZoneInfo(tz_name)) if tz_name else datetime.now(dt_timezone.utc)
    except Exception:
        now = datetime.now(dt_timezone.utc)
    return now.strftime("%A, %d %B %Y, %H:%M %Z").strip()


def parse_history(raw) -> list:
    """Accept a JSON string (or list) of {role, content}; keep only the last 6 safe messages."""
    if isinstance(raw, str):
        try:
            raw = json.loads(raw) if raw.strip() else []
        except Exception:
            raw = []
    cleaned = []
    for m in raw if isinstance(raw, list) else []:
        if isinstance(m, dict) and m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str):
            content = m["content"].strip()[:1000]
            if content:
                cleaned.append({"role": m["role"], "content": content})
    return cleaned[-6:]


def build_system_prompt(tz_name: str = None) -> str:
    return (
        "You are Lima, a warm, concise AI voice assistant. The user speaks to you and your reply is read aloud. "
        f"The user's current date and time is: {now_text(tz_name)}. "
        "You cannot browse the internet or see real-time data such as weather or news; if asked for those, say so "
        "briefly and offer what you can do. Always answer in the same language the user spoke. "
        "Return a valid JSON object with exactly these keys: "
        "'reply' (a direct, helpful answer in 1 to 4 short spoken sentences, no markdown; if the user only shared "
        "a note or thought, acknowledge it briefly and helpfully), "
        "'follow_up' (one short question in the user's language asking whether they need any further help), "
        "'language' (BCP-47 tag of the user's language, for example en-US or id-ID), "
        "'summary' (one sentence summarising what the user said), "
        "'action_items' (array of concrete tasks the user mentioned; an empty array if there are none)."
    )


def process_lima_input(
    text_query: str = None,
    audio_file_path: str = None,
    timezone: str = None,
    history=None,
) -> dict:
    client = get_client()
    query = text_query

    # 1. Transcribe audio if provided (language is auto-detected)
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

    # 2. Generate Lima's answer, a follow-up question, plus a summary and action items
    messages = [{"role": "system", "content": build_system_prompt(timezone)}]
    messages += parse_history(history)
    messages.append({"role": "user", "content": query})

    completion = client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        response_format={"type": "json_object"},
    )

    data = json.loads(completion.choices[0].message.content)
    summary = data.get("summary") or "No summary generated."
    items = data.get("action_items")

    return {
        "transcript": query,
        "reply": data.get("reply") or summary,
        "follow_up": data.get("follow_up") or DEFAULT_FOLLOW_UP,
        "language": data.get("language") or "en-US",
        "summary": summary,
        "action_items": items if isinstance(items, list) else [],
    }
