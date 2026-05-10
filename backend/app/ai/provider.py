"""Server-side AIProvider mirror of the client `StubAIProvider`.

The same swap-the-implementation seam from the client lives on the server:
production wires a real LLM + image model behind the StubAIProvider class
without changing call sites. Token/image budgets and the F-20 $0.50/session
cap should be enforced here, not at the router layer.
"""

from __future__ import annotations

import asyncio
import hashlib
from dataclasses import dataclass
from typing import Literal

Tone = Literal["light", "mixed", "heavy"]
Speaker = Literal["child", "companion", "system"]


@dataclass(frozen=True)
class TurnInput:
    speaker: Speaker
    text: str


@dataclass(frozen=True)
class CompanionReplyInput:
    persona_id: str
    persona_emoji: str
    persona_display_name: str
    child_display_name: str
    child_age_years: int
    mood: str
    history: list[TurnInput]
    latest_child_text: str


@dataclass(frozen=True)
class StorybookInput:
    persona_id: str
    persona_display_name: str
    child_display_name: str
    child_age_years: int
    mood: str
    turns: list[TurnInput]


@dataclass(frozen=True)
class GeneratedPage:
    text: str
    image_prompt: str
    illustration_emoji: str
    illustration_bg: str


@dataclass(frozen=True)
class GeneratedStorybook:
    title: str
    pages: list[GeneratedPage]


_LIGHT = [
    "Oh wow! Tell me more about that. What happened next?",
    "That sounds wonderful. What was your favorite part?",
    "Hehe, I love that. Were you laughing the whole time?",
]
_MIXED = [
    "Mmm. That sounds like a lot of feelings all at once. Which one was the biggest?",
    "I am listening. What did your body feel like when that happened?",
    "Sometimes good and tricky things live right next to each other. Was that today?",
]
_HEAVY = [
    "I am right here. You can take your time. What was the hardest part?",
    "That sounds heavy. Did anyone notice you were having a hard time?",
    "I am sorry it was like that. Would it help to make a story about it together?",
]

_MOOD_TONE: dict[str, Tone] = {
    "sunshine": "light",
    "heart": "mixed",
    "cloud": "heavy",
    "storm": "heavy",
}


def _tone(mood: str) -> Tone:
    return _MOOD_TONE.get(mood, "mixed")


def _hash(s: str) -> int:
    return int.from_bytes(hashlib.blake2b(s.encode(), digest_size=8).digest(), "big", signed=False)


def _pick(arr: list[str], seed: int) -> str:
    return arr[seed % len(arr)]


class StubAIProvider:
    name = "stub"

    async def companion_reply(self, input: CompanionReplyInput) -> str:
        await asyncio.sleep(0.3)
        tone = _tone(input.mood)
        seed = _hash(input.latest_child_text + str(len(input.history)))
        opener = ""
        if not any(t.speaker == "companion" for t in input.history):
            opener = f"{input.persona_emoji} Hi {input.child_display_name}. I am so glad you are here. "
        if tone == "light":
            body = _pick(_LIGHT, seed)
        elif tone == "heavy":
            body = _pick(_HEAVY, seed)
        else:
            body = _pick(_MIXED, seed)
        return opener + body

    async def generate_storybook(self, input: StorybookInput) -> GeneratedStorybook:
        await asyncio.sleep(0.5)
        child_turns = [t for t in input.turns if t.speaker == "child"]
        tone = _tone(input.mood)

        title = _build_title(input.child_display_name, input.persona_display_name, tone)

        # Page count clamped to F-5: 5..8 pages.
        # Open + middles + close. Middles padded to 3 if short, capped to 6.
        middles_min = 3
        middles_max = 6
        filled_middles = max(middles_min, min(middles_max, len(child_turns)))

        pages: list[GeneratedPage] = []
        # open
        pages.append(
            GeneratedPage(
                text=f"Once there was a child named {input.child_display_name}, and a friend named {input.persona_display_name}. Together, they liked to wonder about the world.",
                image_prompt=f"{input.persona_display_name} and {input.child_display_name} — page 1, {tone} mood",
                illustration_emoji=_page_emoji(tone, 0),
                illustration_bg=_page_bg(tone, 0),
            )
        )
        # middles
        for i in range(filled_middles):
            turn = child_turns[i] if i < len(child_turns) else None
            words = _soften(turn.text) if turn else "something quiet"
            pages.append(
                GeneratedPage(
                    text=f"{input.child_display_name} told {input.persona_display_name} about {words}. {input.persona_display_name} listened with their whole heart.",
                    image_prompt=f"{input.persona_display_name} and {input.child_display_name} — middle page, {tone} mood",
                    illustration_emoji=_page_emoji(tone, i + 1),
                    illustration_bg=_page_bg(tone, i + 1),
                )
            )
        # close
        if tone == "heavy":
            close = (
                f'{input.persona_display_name} sat close. "Some days are heavy," '
                f'{input.persona_display_name} said softly. "And we can carry them together." '
                f"{input.child_display_name} nodded, and the night was a little less loud."
            )
        elif tone == "light":
            close = (
                f"{input.child_display_name} smiled, and {input.persona_display_name} smiled back. "
                "The day was full of small bright things, and that was enough."
            )
        else:
            close = (
                f"{input.persona_display_name} took {input.child_display_name}'s hand. "
                f'"Lots of feelings is okay," {input.persona_display_name} said. '
                '"We can make space for all of them."'
            )
        pages.append(
            GeneratedPage(
                text=close,
                image_prompt=f"{input.persona_display_name} and {input.child_display_name} — closing page, {tone} mood",
                illustration_emoji=_page_emoji(tone, len(pages)),
                illustration_bg=_page_bg(tone, len(pages)),
            )
        )

        return GeneratedStorybook(title=title, pages=pages)


def _build_title(child: str, persona: str, tone: Tone) -> str:
    if tone == "heavy":
        return f"{child} and {persona} on a Heavy Night"
    if tone == "light":
        return f"{child} and {persona}'s Bright Day"
    return f"{child} and {persona} and All the Feelings"


def _soften(text: str) -> str:
    cleaned = " ".join(text.strip().split())
    return f'"{cleaned}"' if len(cleaned) <= 80 else f'"{cleaned[:78]}…"'


def _page_emoji(tone: Tone, i: int) -> str:
    light = ["🌞", "🌻", "🦋", "🌈", "🍓"]
    mixed = ["🌤️", "🌱", "🪁", "🎈", "🌙"]
    heavy = ["🌧️", "🫂", "🕯️", "🌌", "🌙"]
    arr = light if tone == "light" else heavy if tone == "heavy" else mixed
    return arr[i % len(arr)]


def _page_bg(tone: Tone, i: int) -> str:
    light = ["#FFF6CF", "#FFE0B5", "#FFD9E4", "#E8F4D6", "#FCEBC1"]
    mixed = ["#E5E8FA", "#F2E6FA", "#E8F1F8", "#F8EBE0", "#EAF3EC"]
    heavy = ["#D9E2EC", "#CDD7E0", "#C4D0DC", "#DCE2EC", "#E2E7EE"]
    arr = light if tone == "light" else heavy if tone == "heavy" else mixed
    return arr[i % len(arr)]


_provider: StubAIProvider | None = None


def get_provider() -> StubAIProvider:
    global _provider
    if _provider is None:
        _provider = StubAIProvider()
    return _provider
