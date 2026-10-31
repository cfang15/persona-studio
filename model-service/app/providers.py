"""LLM providers.

`MockProvider` needs no API key, so the whole app runs locally and in CI. `OpenAICompatibleProvider`
talks to any server that implements the OpenAI chat-completions API (OpenAI, Ollama, vLLM,
LM Studio, a LoRA fine-tune served with vLLM, ...).
"""

import hashlib
import os
import random
from typing import Protocol

import httpx

from .schemas import ChatTurn, Persona


def build_system_prompt(persona: Persona) -> str:
    parts = [f"You are {persona.name}, a character in a video game. Stay in character at all times."]
    if persona.traits:
        parts.append("Your personality traits: " + ", ".join(persona.traits) + ".")
    if persona.speaking_style:
        parts.append(f"How you speak: {persona.speaking_style}")
    if persona.backstory:
        parts.append(f"Your backstory: {persona.backstory}")
    parts.append("Keep replies under 80 words.")
    return "\n".join(parts)


class Provider(Protocol):
    name: str

    async def generate(self, persona: Persona, history: list[ChatTurn], message: str) -> str: ...


class MockProvider:
    """Deterministic, template-based replies seeded by the persona and message."""

    name = "mock"

    _openers = ["Hmm.", "Ah.", "Listen.", "Well now.", "Heh."]
    _closers = [
        "That's all I'll say for now.",
        "Ask me again if you dare.",
        "Make of that what you will.",
        "Now, what else do you want?",
    ]

    def __init__(self, temperature: float = 0.3):
        self.temperature = temperature
        self._calls = 0

    async def generate(self, persona: Persona, history: list[ChatTurn], message: str) -> str:
        self._calls += 1
        seed = hashlib.sha256(f"{persona.name}|{message}".encode()).hexdigest()
        rng = random.Random(seed)
        # Small per-call jitter so repeated probes are similar but not identical.
        jitter = random.Random(f"{seed}|{self._calls}")

        opener = rng.choice(self._openers)
        if jitter.random() < self.temperature:
            opener = jitter.choice(self._openers)
        traits = persona.traits or ["mysterious"]
        trait = rng.choice(traits)
        closer = rng.choice(self._closers)
        if jitter.random() < self.temperature:
            closer = jitter.choice(self._closers)

        topic = message.strip().rstrip("?.!")
        return (
            f"{opener} I'm {persona.name}, and being {trait} is how I get by. "
            f"You ask about \"{topic}\" — I'd answer it the {trait} way. {closer}"
        )


class OpenAICompatibleProvider:
    name = "openai-compatible"

    def __init__(self, base_url: str, api_key: str, model: str, timeout: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    async def generate(self, persona: Persona, history: list[ChatTurn], message: str) -> str:
        messages = [{"role": "system", "content": build_system_prompt(persona)}]
        messages += [turn.model_dump() for turn in history]
        messages.append({"role": "user", "content": message})
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": self.model, "messages": messages, "temperature": 0.7},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()


def provider_from_env() -> Provider:
    if os.getenv("LLM_PROVIDER", "mock") == "openai":
        return OpenAICompatibleProvider(
            base_url=os.getenv("LLM_BASE_URL", "https://api.openai.com/v1"),
            api_key=os.environ["LLM_API_KEY"],
            model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        )
    return MockProvider()
