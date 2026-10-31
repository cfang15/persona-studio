"""Consistency scoring for persona responses.

A persona is consistent when it answers the same question in a similar way each time
(agreement) and when its answers actually reflect the traits it was given (coverage).
Both are cheap, explainable lexical measures, so the score can be computed without a
second model call.
"""

import re
from itertools import combinations

_WORD = re.compile(r"[a-z']+")
_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "i", "if", "in", "is",
    "it", "its", "i'm", "me", "my", "of", "on", "or", "so", "that", "the", "this", "to",
    "was", "we", "with", "you", "your",
}

AGREEMENT_WEIGHT = 0.7
COVERAGE_WEIGHT = 0.3


def tokens(text: str) -> set[str]:
    return {w for w in _WORD.findall(text.lower()) if w not in _STOPWORDS}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 1.0
    return len(a & b) / len(a | b)


def agreement(responses: list[str]) -> float:
    """Mean pairwise Jaccard similarity across all responses."""
    if len(responses) < 2:
        return 1.0
    token_sets = [tokens(r) for r in responses]
    pairs = list(combinations(token_sets, 2))
    return sum(jaccard(a, b) for a, b in pairs) / len(pairs)


def trait_coverage(responses: list[str], traits: list[str]) -> float:
    """Share of traits whose words show up in at least one response."""
    if not traits:
        return 1.0
    seen = set().union(*(tokens(r) for r in responses)) if responses else set()
    hits = sum(1 for trait in traits if tokens(trait) & seen)
    return hits / len(traits)


def overall_score(agree: float, coverage: float) -> float:
    return round(100 * (AGREEMENT_WEIGHT * agree + COVERAGE_WEIGHT * coverage), 1)
