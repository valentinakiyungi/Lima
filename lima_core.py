import os
import json
from datetime import datetime, timezone as dt_timezone
from zoneinfo import ZoneInfo

import httpx
from groq import Groq

_client = None

# Override with the LLM_MODEL environment variable on Render if Groq retires this model.
LLM_MODEL = os.environ.get("LLM_MODEL", "openai/gpt-oss-120b")

DEFAULT_FOLLOW_UP = "Is there anything else I can help you with?"

GEO_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

WEATHER_CODES = {
    0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
    45: "fog", 48: "freezing fog",
    51: "light drizzle", 53: "drizzle", 55: "heavy drizzle", 56: "freezing drizzle", 57: "heavy freezing drizzle",
    61: "light rain", 63: "rain", 65: "heavy rain", 66: "freezing rain", 67: "heavy freezing rain",
    71: "light snow", 73: "snow", 75: "heavy snow", 77: "snow grains",
    80: "light rain showers", 81: "rain showers", 82: "violent rain showers",
    85: "light snow showers", 86: "heavy snow showers",
    95: "thunderstorm", 96: "thunderstorm with hail", 99: "severe thunderstorm with hail",
}

WEATHER_TOOL = {
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": (
            "Get the current weather and today's forecast for a place. Call it whenever the user asks about "
            "the weather, temperature, rain, snow, wind or a forecast, in any language."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City name, e.g. 'Moscow'. Leave empty if the user did not name a place.",
                }
            },
        },
    },
}


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


def city_from_timezone(tz_name: str = None):
    """'Europe/Moscow' -> 'Moscow' (a rough guess of where the user is)."""
    if not tz_name or "/" not in tz_name:
        return None
    return tz_name.split("/")[-1].replace("_", " ")


def get_weather(location: str = None, tz_name: str = None) -> str:
    """Look up live weather with Open-Meteo (free, no API key). Returns text for the model to use."""
    place = (location or "").strip()
    guessed = False
    if not place:
        place = city_from_timezone(tz_name)
        guessed = True
    if not place:
        return "The user's location is unknown. Ask the user which city they mean."
    try:
        with httpx.Client(timeout=8) as http:
            geo = http.get(
                GEO_URL, params={"name": place, "count": 1, "language": "en", "format": "json"}
            ).json()
            results = geo.get("results") or []
            if not results:
                return f"No place called '{place}' was found. Ask the user for the name of their city."
            r = results[0]
            data = http.get(
                FORECAST_URL,
                params={
                    "latitude": r["latitude"],
                    "longitude": r["longitude"],
                    "current": "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                    "timezone": "auto",
                    "forecast_days": 1,
                },
            ).json()
    except Exception:
        return "The weather service could not be reached. Tell the user you could not fetch the weather right now."

    cur = data.get("current") or {}
    daily = data.get("daily") or {}

    def c_and_f(v):
        return "unknown" if v is None else f"{v:.0f}°C ({v * 9 / 5 + 32:.0f}°F)"

    def first(key):
        vals = daily.get(key) or [None]
        return vals[0]

    name = ", ".join(x for x in (r.get("name"), r.get("country")) if x)
    cond = WEATHER_CODES.get(cur.get("weather_code"), "unknown conditions")
    text = (
        f"Weather in {name} right now: {c_and_f(cur.get('temperature_2m'))}, feels like "
        f"{c_and_f(cur.get('apparent_temperature'))}, {cond}, humidity {cur.get('relative_humidity_2m', '?')}%, "
        f"wind {cur.get('wind_speed_10m', '?')} km/h, precipitation {cur.get('precipitation', 0)} mm. "
        f"Today: high {c_and_f(first('temperature_2m_max'))}, low {c_and_f(first('temperature_2m_min'))}, "
        f"chance of precipitation {first('precipitation_probability_max') if first('precipitation_probability_max') is not None else '?'}%."
    )
    if guessed:
        text += f" (The place was guessed from the user's timezone as {place}; mention that and offer another city.)"
    return text


def gather_live_facts(client, history: list, query: str, tz_name: str = None) -> str:
    """Let the model decide whether it needs live data, run the tool(s), and return the facts as text."""
    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Decide whether live data is needed. If the user asks about the weather, temperature, "
                        "rain, snow, wind or a forecast, call get_weather. Otherwise call nothing."
                    ),
                },
                *history,
                {"role": "user", "content": query},
            ],
            tools=[WEATHER_TOOL],
            tool_choice="auto",
        )
        calls = resp.choices[0].message.tool_calls or []
    except Exception:
        return ""
    facts = []
    for call in calls[:2]:
        if call.function.name == "get_weather":
            try:
                args = json.loads(call.function.arguments or "{}")
            except Exception:
                args = {}
            facts.append(get_weather(args.get("location"), tz_name))
    return "\n".join(facts)


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
        "You cannot browse the internet. Live weather is given to you in a system message when the user asks for "
        "it; use it and state the temperature and conditions. For other real-time data such as news or sports "
        "scores, say briefly that you cannot check it and offer what you can do. "
        "Always answer in the same language the user spoke. "
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
    past = parse_history(history)
    messages = [{"role": "system", "content": build_system_prompt(timezone)}]
    facts = gather_live_facts(client, past, query, timezone)
    if facts:
        messages.append(
            {"role": "system", "content": "Live data fetched for this request (accurate, use it):\n" + facts}
        )
    messages += past
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
