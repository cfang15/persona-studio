from typing import Literal

from pydantic import BaseModel, Field


class Persona(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    traits: list[str] = Field(default_factory=list, max_length=12)
    speaking_style: str = Field(default="", max_length=400)
    backstory: str = Field(default="", max_length=2000)


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class GenerateRequest(BaseModel):
    persona: Persona
    history: list[ChatTurn] = Field(default_factory=list, max_length=50)
    message: str = Field(min_length=1, max_length=4000)


class GenerateResponse(BaseModel):
    reply: str
    provider: str
    latency_ms: int


class ConsistencyRequest(BaseModel):
    persona: Persona
    probe: str = Field(min_length=1, max_length=1000)
    samples: int = Field(default=5, ge=2, le=10)


class ConsistencyResponse(BaseModel):
    probe: str
    responses: list[str]
    agreement: float = Field(description="Mean pairwise similarity of the responses, 0-1")
    trait_coverage: float = Field(description="Share of persona traits reflected in the responses, 0-1")
    score: float = Field(description="Weighted overall consistency score, 0-100")
    provider: str
