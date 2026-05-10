"""Server-side safety classifier — mirror of src/safety.ts on the client.

Production replaces this with a clinician-reviewed classifier behind the same
function signature. The targets (PRD §Goal 3 / §Success Metrics):

  - red-zone false-positive rate < 5%
  - red-zone false-negative rate < 1%
  - 100% red-zone events surface to parent in < 60s

Server-side classification is the source of truth even if the client also
runs the regex; the client copy is a UX nicety (e.g. immediately showing
the persona's "someone who loves you is going to help" line).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

SafetyZone = Literal["green", "amber", "red"]


@dataclass(frozen=True)
class SafetySignal:
    zone: SafetyZone
    reason: str | None = None
    matched_terms: tuple[str, ...] = ()


_RED_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\b(kill myself|end my life|don't want to be alive|want to die)\b", re.I), "suicidal ideation"),
    (re.compile(r"\b(hurt myself|cut myself|hurting myself)\b", re.I), "self-harm"),
    (re.compile(r"\b(touched me|hit me|hits me|hurts me)\b", re.I), "possible abuse disclosure"),
    (re.compile(r"\b(no one can know|don't tell anyone|secret)\b.*\b(grown ?up|adult|teacher|uncle|aunt|step|parent)\b", re.I), "secrecy with adult"),
    (re.compile(r"\b(scared to go home|scared of (mom|dad|stepdad|stepmom))\b", re.I), "fear of caregiver"),
)

_AMBER_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\b(everyone hates me|nobody likes me|i'?m alone)\b", re.I), "persistent loneliness"),
    (re.compile(r"\b(i hate myself|i'?m stupid|i'?m bad)\b", re.I), "negative self-talk"),
    (re.compile(r"\b(can'?t stop crying|cry every (day|night))\b", re.I), "persistent distress"),
)


def classify(text: str) -> SafetySignal:
    matched_red = [(p, r) for p, r in _RED_PATTERNS if p.search(text)]
    if matched_red:
        return SafetySignal(
            zone="red",
            reason=", ".join(r for _, r in matched_red),
            matched_terms=tuple(p.pattern for p, _ in matched_red),
        )
    matched_amber = [(p, r) for p, r in _AMBER_PATTERNS if p.search(text)]
    if matched_amber:
        return SafetySignal(
            zone="amber",
            reason=", ".join(r for _, r in matched_amber),
            matched_terms=tuple(p.pattern for p, _ in matched_amber),
        )
    return SafetySignal(zone="green")


_ZONE_ORDER: dict[SafetyZone, int] = {"green": 0, "amber": 1, "red": 2}


def max_zone(a: SafetyZone, b: SafetyZone) -> SafetyZone:
    return a if _ZONE_ORDER[a] >= _ZONE_ORDER[b] else b


def conversation_starters(reason: str, child_name: str) -> list[str]:
    """F-10 stub. Real product uses an LLM and longitudinal child patterns."""
    r = reason.lower()
    if "suicidal" in r or "self-harm" in r:
        return [
            f'Sit beside {child_name} when it is quiet. Say: "I love you. I am not going anywhere. Can you tell me what has been heavy?"',
            'Avoid leading with the words from the alert. Lead with presence. Then: "Sometimes feelings get really big. Have yours been really big lately?"',
            f'If {child_name} confirms, ask: "Are you safe right now? Can we make a plan together?" Then call your child\'s pediatrician or 988 for guidance.',
        ]
    if "abuse" in r or "fear of caregiver" in r or "secrecy with adult" in r:
        return [
            'Find a private, calm moment. Say: "You can tell me anything, even hard things. You will not be in trouble."',
            'Listen without reacting visibly. Ask open questions: "Can you tell me more about that?" Avoid leading questions.',
            f"Do not promise to keep it a secret. Do tell {child_name} that you will help keep them safe. Contact your pediatrician or local child-welfare resource for next steps.",
        ]
    return [
        f"Pick a low-pressure moment with {child_name}. Read tonight's storybook together if they have shared it. Notice what they linger on.",
        'Try: "Was there anything today that was hard, even a little?" Make it easy to answer "yes" without elaborating.',
        "If they say no, that's okay. The opening is what matters. Try again tomorrow.",
    ]
