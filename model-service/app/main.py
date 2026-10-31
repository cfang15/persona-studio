import asyncio
import time

import httpx
from fastapi import Depends, FastAPI, HTTPException

from . import scoring
from .providers import Provider, provider_from_env
from .schemas import (
    ConsistencyRequest,
    ConsistencyResponse,
    GenerateRequest,
    GenerateResponse,
)

app = FastAPI(title="Persona Studio model service", version="1.0.0")

_provider: Provider | None = None


def get_provider() -> Provider:
    global _provider
    if _provider is None:
        _provider = provider_from_env()
    return _provider


@app.get("/health")
async def health(provider: Provider = Depends(get_provider)) -> dict:
    return {"status": "ok", "provider": provider.name}


@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest, provider: Provider = Depends(get_provider)) -> GenerateResponse:
    start = time.perf_counter()
    try:
        reply = await provider.generate(req.persona, req.history, req.message)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Model provider error: {exc}") from exc
    return GenerateResponse(
        reply=reply,
        provider=provider.name,
        latency_ms=int((time.perf_counter() - start) * 1000),
    )


@app.post("/consistency", response_model=ConsistencyResponse)
async def consistency(req: ConsistencyRequest, provider: Provider = Depends(get_provider)) -> ConsistencyResponse:
    """Ask the persona the same probe several times and score how consistently it answers."""
    try:
        responses = await asyncio.gather(
            *(provider.generate(req.persona, [], req.probe) for _ in range(req.samples))
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Model provider error: {exc}") from exc

    agree = scoring.agreement(list(responses))
    coverage = scoring.trait_coverage(list(responses), req.persona.traits)
    return ConsistencyResponse(
        probe=req.probe,
        responses=list(responses),
        agreement=round(agree, 3),
        trait_coverage=round(coverage, 3),
        score=scoring.overall_score(agree, coverage),
        provider=provider.name,
    )
