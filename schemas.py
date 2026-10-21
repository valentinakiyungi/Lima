from pydantic import BaseModel, Field
from typing import List

class LimaResponse(BaseModel):
    reply: str = Field(description="The primary response to the user's message.")
    follow_up_suggestions: List[str] = Field(
        description="2 to 3 concise, proactive follow-up questions or related suggestions for the user."
    )
