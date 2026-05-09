# Bedtime Storybook Companion

> Working title. The conversation is the sanctuary. The storybook is the bridge.

iPad-native app for children ages 5–10 that turns a child's private nightly conversation with a persistent AI companion into a personalized, fully illustrated storybook the child can choose to share with a parent or trusted family member as bedtime reading.

This repo is the MVP scaffold: a single Expo (React Native + React Native Web) codebase that runs as a web app on `localhost` and as an iOS app in the Simulator or on device via Expo Go.

> **Status:** scaffold. AI conversation and illustrations are stubbed behind a swappable `AIProvider`. The safety classifier is a regex stub awaiting clinician review.

The full PRD lives at [`docs/prd.md`](docs/prd.md) (truncated mid–US-3 in the source paste; needs the rest pasted in).

## Run it

```bash
npm install

# Web (recommended for first look)
EXPO_OFFLINE=1 npm run web
# → opens http://localhost:8081

# iOS Simulator (macOS only)
EXPO_OFFLINE=1 npm run ios

# Or scan the QR with the Expo Go app on a real iPad
EXPO_OFFLINE=1 npm start
```

`EXPO_OFFLINE=1` skips Expo CLI's remote dependency-version check, which expects internet egress. Drop it when running with normal egress.

## What's wired up

End-to-end flows that actually work in the scaffold:

- **Splash + parent disclosure.** Adult sees the privacy and red-zone safety contract before the child uses the app.
- **Parent setup.** Parent name, child name, child age, plus a parent-curated **trusted sharing circle** (e.g. Mom, Dad, Aunt Jody) with per-member opt-in to red-zone alerts. Trusted-circle members can only ever see finished storybooks the child shared with them — never transcripts, mood data, or any session content.
- **Persona pick.** Curated set of four companions (Biscuit the Dog, Auntie Wren, Fern the Plant, Pip the Owl) — persisted across sessions.
- **Mood check-in.** Visual icons (sunshine, rainbow, spark, heart, cloud, storm) drive the persona's tone.
- **Conversation.** Child chats with the companion in a private bubble UI. Stub provider gives mood-aware replies with a deliberate "thinking" delay.
- **Storybook generation.** Short illustrated book is generated from the transcript — title, page text, persona-as-narrator, deterministic emoji-and-palette illustrations as a stand-in for real image gen.
- **Sharing.** Child decides whether to share, and with whom, from the trusted circle. Anything not shared lives in a private library.
- **Library.** All books — shared and private — with sharing state visible.
- **Parent dashboard.** Shows only what the child shared with a parent-relationship circle member, plus any red-zone alerts.
- **Red-zone safety threshold.** A regex stub flags severe-danger signals (suicidal ideation, self-harm, abuse disclosure, fear of caregiver, secrecy with adult). On red-zone, the storybook surfaces to the parent regardless of the child's sharing choice, with AI-generated conversation starters and a disclaimer that the child has been told this happened. Yellow-zone signals do **not** break privacy — they are tracked over time only.
- **Local persistence.** Everything saves to `AsyncStorage` so a child's library survives a refresh.

## Architecture

```
App.tsx                    router, providers
src/
  types.ts                 domain types (zones: green | yellow | red)
  state.tsx                store + reducer + AsyncStorage hydration
  navigation.tsx           tiny stack navigator (no react-navigation needed for MVP)
  personas.ts              curated personas + mood definitions
  safety.ts                zone classifier + parent conversation-starter generator
  storage.ts               AsyncStorage helpers
  ai/
    provider.ts            AIProvider interface + DI seam
    stubProvider.ts        offline deterministic provider (replace with Claude/etc.)
  ui/
    Screen.tsx, Card.tsx, Button.tsx, theme.ts
  screens/
    SplashScreen.tsx
    ParentSetupScreen.tsx
    PersonaPickScreen.tsx
    HomeScreen.tsx
    ConversationScreen.tsx
    StorybookScreen.tsx
    ShareScreen.tsx
    LibraryScreen.tsx
    ParentDashboardScreen.tsx
docs/
  prd.md                   PRD v1.0 (truncated at US-3)
```

### Replacing the stub AI

`AIProvider` (`src/ai/provider.ts`) has two methods: `companionReply` and `generateStorybook`. Implement against a real model (Claude is a natural fit for the persona voice; an image model fills `StorybookPage.imagePrompt`) and inject in `getAIProvider()`. No screen code needs to change.

Per-session AI cost ceiling per PRD §Goal 5: **$0.50 across 95% of sessions**. The provider interface is the right place to enforce that budget — token counting, image-call limits, and a hard-stop fallback all live behind it.

### Replacing the safety classifier

`classifyTextForSafety(text) → SafetySignal` lives in `src/safety.ts`. The zone semantics:

- **green** — no concern detected.
- **yellow** — patterns to track over time (loneliness, negative self-talk, persistent distress). Does **not** break privacy.
- **red** — severe danger (suicidal ideation, self-harm, abuse disclosure, fear of caregiver, secrecy with adult). Surfaces the storybook to the parent within 60 seconds with conversation starters; child is told.

The regex list is intentionally small and is not a clinical instrument. PRD §Goal 3 targets:
- Red-zone false-positive rate **< 5%** vs. clinician-tagged corpus
- **Zero** red-zone false negatives in soft launch (clinical-advisory review of all sessions)
- **100%** red-zone events surface to parent in under 60 seconds

Production replaces the regex with a clinician-reviewed classifier behind the same one-call signature.

## Try the red-zone path

In the conversation screen, type a phrase like `"I want to die"` or `"my stepdad hits me"`, then generate the storybook. Visit the **Parent dashboard** from the splash screen — the alert and AI-generated conversation starters will be visible, and the book is surfaced regardless of the child's sharing choice. (Stub demo of the threshold behavior; do not interpret the regex as a clinical instrument.)

## Known gaps from the PRD

The pasted PRD was truncated mid–US-3. Pieces still missing or stubbed:

1. Rest of US-3 onward, plus **scope**, **non-goals**, **technical architecture**, **data model**, **risks**, and **timeline** sections.
2. **Tech stack & infra decisions** — backend, DB, hosting, real LLM and image-gen providers, observability, per-session cost enforcement.
3. **COPPA verifiable parental consent flow** (PRD §Goal 4).
4. **Apple Kids Category submission requirements** — Family Sharing, Ask to Buy, no third-party analytics (PRD §Goal 4).
5. **Trusted-circle delivery** — push/email/deep-link when a book is shared, FaceTime co-reading, view-only authentication for non-parent members.
6. **Persona memory layer** that persists across persona switches.
7. **Reading-level adaptation model** — currently a numeric field on `ChildProfile` with no logic behind it.
8. **Collaborative session mode** — the "Bring a grown-up in" button is a placeholder; PRD US-4+ will define the AI's facilitator/observer role-shift.
9. **Voice in/out** for the visual-first 5–7 tier.
10. **Pricing tiers** beyond the $9.99/month standard tier called out in §Goal 5.
11. **Soft-launch instrumentation** — clinician-review pipeline, false-positive labeling, retention/completion/sharing-rate dashboards.
12. **Accessibility** standards for early readers.

These are tracked so the next pass has a concrete punch list.

## License

Proprietary — Olive / Bedtime Storybook Companion.
