from pydantic import BaseModel, Field
from typing import List

class LimaVoiceResponse(BaseModel):
    summary: str = Field(description="A thorough, professional summary of the voice note or query.")
    action_items: List[str] = Field(description="Concrete, actionable next steps or tasks extracted from the voice note.")
