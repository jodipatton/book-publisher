# Bedtime Storybook Companion

> Working title. The conversation is the sanctuary. The storybook is the bridge.

iPad-native app for children ages 5–10 that turns a child's private nightly conversation with a persistent AI companion into a personalized, fully illustrated 5–8 page storybook the child can choose to share with a parent or trusted family member as bedtime reading.

This repo is the MVP scaffold. **Production target is iPad-only per PRD scope** (`docs/prd.md` §Scope). The web build runs on `localhost` for development and review only — it is not the shipped product. iOS is the production target.

> **Status:** scaffold. AI conversation and illustrations are stubbed behind a swappable `AIProvider`. The safety classifier is a regex stub awaiting clinician review. PRD captured at `docs/prd.md` (truncated mid-NFR-3 in the source paste).

## Run it

The same Expo source builds for **web** (localhost), **iOS Simulator**, and **iPad via Expo Go**.

```bash
npm install

# Web — open in a browser at http://localhost:8081 (dev/review only)
EXPO_OFFLINE=1 npm run web

# iOS Simulator — production target (macOS only)
EXPO_OFFLINE=1 npm run ios

# iPad over the local network — scan the QR with Expo Go
EXPO_OFFLINE=1 npm start
```

`EXPO_OFFLINE=1` skips Expo CLI's remote dependency-version check, which expects internet egress. Drop it when running with normal egress.

## What's wired up

End-to-end flows that actually work in the scaffold:

- **Splash + parent disclosure.** Adult sees the privacy and red-zone safety contract before the child uses the app, including the 988 line.
- **Parent setup (F-1, F-14, F-18).** Parent name, child name (5–10), child age, **session time limit** (5–60 min), plus a parent-curated **trusted sharing circle** with name, relationship, **email** (for the F-15 invited account), and per-member opt-in to red-zone alerts.
- **Persona pick (F-2).** Curated set of four companions: Biscuit the Dog, Auntie Wren, Fern the Plant, and a TBD-pending-clinical-advisory placeholder (Pip the Owl). Selection persists across sessions and is changeable.
- **Mood check-in (F-3).** The four spec'd icons — heart, sunshine, cloud, storm — with accessible labels for assistive technology.
- **Conversation (F-4).** Child chats with the companion in a private bubble UI. Stub provider gives mood-aware replies with a deliberate "thinking" delay. Age-tier branching is structurally ready in the AI input but not yet differentiated in the stub.
- **Storybook generation (F-5, F-6).** 5–8 illustrated pages from the transcript — title, page text, persona-as-narrator, deterministic emoji-and-palette illustrations as a stand-in for real image gen. Page count is clamped to the 5..8 band even on short conversations.
- **Sharing (F-7, F-8).** Child decides whether to share, and with whom, from the trusted circle. Anything not shared lives in a private library. Real notification/email delivery to circle members is stubbed.
- **Library.** All books — shared and private — with sharing state visible.
- **Parent dashboard.** Shows only what the child shared with a parent-relationship circle member, plus any red-zone alerts.
- **Three-tier safety system (F-9, F-10, F-11).**
  - **green** — no concern detected.
  - **amber** — patterns to track over time (loneliness, negative self-talk, persistent distress). Does **not** break privacy. Consecutive-amber count tracked on the child profile; PRD F-11 elevates to a clinical-advisory review queue at ≥5.
  - **red** — severe danger (suicidal ideation, self-harm, abuse disclosure, fear of caregiver, secrecy with adult). Surfaces the storybook to the parent regardless of the child's sharing choice, with AI-generated conversation starters, the **988 Suicide and Crisis Lifeline** call/chat links, and a disclaimer. The child's persona tells the child, in their voice, that someone who loves them is going to help.
- **Local persistence.** Everything saves to `AsyncStorage` so a child's library survives a refresh.

## Architecture

```
App.tsx                    router, providers
src/
  types.ts                 domain types (zones: green | amber | red)
  state.tsx                store + reducer + AsyncStorage hydration
  navigation.tsx           tiny stack navigator (no react-navigation needed for MVP)
  personas.ts              curated personas (F-2) + four moods (F-3)
  safety.ts                three-tier classifier + parent conversation-starter generator
  storage.ts               AsyncStorage helpers
  ai/
    provider.ts            AIProvider interface + DI seam
    stubProvider.ts        offline deterministic provider; clamps to 5..8 pages
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
  prd.md                   PRD v1.0 (truncated at NFR-3)
```

### Replacing the stub AI

`AIProvider` (`src/ai/provider.ts`) has two methods: `companionReply` and `generateStorybook`. Implement against a real model (Claude is a natural fit for the persona voice; an image model fills `StorybookPage.imagePrompt`) and inject in `getAIProvider()`. No screen code needs to change.

Per-session AI cost ceiling per PRD F-20: **$0.50**. The provider interface is the right place to enforce that budget — token counting, image-call limits, and a graceful-wrap fallback all live behind it.

### Replacing the safety classifier

`classifyTextForSafety(text) → SafetySignal` lives in `src/safety.ts`. Zone semantics:

- **green** — no concern detected.
- **amber** — track over time. Does not break privacy. F-11 elevation at ≥5 consecutive sessions.
- **red** — F-10 mandatory disclosure protocol fires.

The regex list is intentionally small and is not a clinical instrument. PRD targets per §Success Metrics:

- Red-zone false-positive rate **< 5%** vs. clinician-tagged corpus
- Red-zone false-negative rate **< 1%**, biased toward sensitivity
- 100% red-zone events surface to parent in **< 60s**

Production replaces the regex with a clinician-reviewed classifier behind the same one-call signature.

## Try the red-zone path

In the conversation screen, type a phrase like `"I want to die"` or `"my stepdad hits me"`, then generate the storybook. Visit the **Parent dashboard** from the splash screen — the alert, conversation starters, and 988 call/chat links will be visible, and the book is surfaced regardless of the child's sharing choice. (Stub demo of the threshold behavior; do not interpret the regex as a clinical instrument.)

## Known gaps from PRD v1.0

The PRD source paste was truncated mid-NFR-3. Pieces still missing or stubbed:

1. Rest of NFR-3 onward — additional NFRs, technical architecture, data model, dependencies, risks, milestones, open questions.
2. **COPPA verifiable parental consent (F-1, NFR-3)** — credit card transaction verification not implemented.
3. **Sign in with Apple (NFR-2)** — auth not implemented.
4. **Apple Kids Category submission requirements** — Family Sharing, Ask to Buy, no third-party analytics SDKs (NFR-1) — no auth/payment/notif provider integrated.
5. **Trusted-circle account provisioning (F-15)** — emails captured during setup but no invitation/account flow built.
6. **Trusted-circle delivery (F-8)** — push/email/web view delivery is stubbed; child's sharing choices are saved locally only.
7. **Persona persistence across sessions (F-13)** — personality, quirks, conversation history. Currently only the persona ID persists.
8. **Reading-level adaptation (F-16)** — `readingLevel` field exists; no adaptation logic.
9. **Photo-informed character description (F-6)** — no upload, no character-consistency layer.
10. **Real image generation** — pages render as emoji + palette placeholders.
11. **Collaborative session mode (F-12)** — invite button is a placeholder; AI role-shift not implemented.
12. **Voice in/out** for the visual-first 5–7 tier (F-4).
13. **Connectivity-loss handling (F-19)**, **per-session $0.50 cap (F-20)** — interface seam exists; enforcement does not.
14. **Clinical advisory review queue (F-11)** — `consecutiveAmberSessions` counter tracked on the child profile; the queue itself is not built.
15. **Soft-launch instrumentation** — clinician-review pipeline, false-positive labeling, retention/completion/sharing-rate dashboards.
16. **Localized illustration style and persona visual reference** — locked style not defined.
17. **iPad bedtime UI polish** — reduced blue light awareness, large touch targets are partially honored; warm palette is in place.

These are tracked so the next pass has a concrete punch list.

## License

Proprietary — Olive / Bedtime Storybook Companion.
