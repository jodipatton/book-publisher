# Storytime Sanctuary

A bedtime iPad app for children ages 5–10. The child has a private conversation with a chosen companion persona; that conversation generates an illustrated storybook the child chooses (or chooses not) to share with parents and trusted family.

This repo is the MVP scaffold: a single Expo (React Native + React Native Web) codebase that runs as a web app on `localhost` and as an iOS app in the Simulator or on device via Expo Go.

> Status: scaffold. AI conversation and storybook illustrations are stubbed behind a swappable `AIProvider` interface so the app runs offline with no API keys. The safety classifier is a regex stub awaiting clinical review.

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

`EXPO_OFFLINE=1` skips Expo CLI's remote dependency-version check. Drop it if you want the version check to run.

## What's wired up

End-to-end flows that actually work in the scaffold:

- **Splash + parent disclosure.** Adults see the privacy/safety contract before the child uses the app.
- **Parent setup.** Parent name, child name, child age, and a parent-curated **trusted sharing circle** (e.g. Mom, Dad, Aunt Jody) with per-member opt-in to severe-danger safety alerts.
- **Persona pick.** Curated set of four companions (Biscuit the Dog, Auntie Wren, Fern the Plant, Pip the Owl) — persisted across sessions.
- **Mood check-in.** Visual icons (sunshine, rainbow, spark, heart, cloud, storm) drive the persona's tone.
- **Conversation.** Child chats with the companion in a private bubble UI. Stub provider gives mood-aware replies with a deliberate "thinking" delay.
- **Storybook generation.** A short illustrated book is generated from the transcript — title, page text, persona-as-narrator, deterministic emoji-and-palette illustrations as a stand-in for real image gen.
- **Sharing.** Child decides whether to share, and with whom, from the trusted circle. Anything not shared lives in a private library.
- **Library.** All books — shared and private — with sharing state visible.
- **Parent dashboard.** Shows only what the child shared with a parent-relationship circle member, plus any safety alerts.
- **Safety threshold.** A regex stub flags severe-danger signals (suicidal ideation, abuse disclosure, fear of caregiver, secrecy with adult). On `urgent`, the storybook surfaces to the parent regardless of child sharing, with AI-generated conversation starters and a disclaimer that the child has been told this happened.
- **Local persistence.** Everything saves to `AsyncStorage` so a child's library survives a refresh.

## Architecture

```
App.tsx                    router, providers
src/
  types.ts                 domain types
  state.tsx                store + reducer + AsyncStorage hydration
  navigation.tsx           tiny stack navigator (no react-navigation needed for MVP)
  personas.ts              curated personas + mood definitions
  safety.ts                safety classifier + parent conversation-starter generator
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
```

### Replacing the stub AI

`AIProvider` (`src/ai/provider.ts`) has two methods: `companionReply` and `generateStorybook`. Implement either against a real model (Claude is a natural fit for the persona voice; an image model fills `StorybookPage.imagePrompt`) and inject in `getAIProvider()`. No screen code needs to change.

### Replacing the safety classifier

`classifyTextForSafety(text) → SafetySignal` lives in `src/safety.ts`. The regex list is intentionally small and obviously not a clinical instrument — it exists so the threshold code path is wired and demonstrable end-to-end. Production needs a clinician-reviewed classifier behind the same one-call interface.

## Known gaps from the PRD

The PRD shared with this scaffold was truncated mid-sentence at "COPPA-compliant data handling for all child…". Pieces still missing or stubbed:

1. Rest of the In-Scope MVP list, plus **Out of Scope**.
2. **Tech stack & infra decisions** — backend, DB, hosting, real LLM and image-gen providers, per-session cost ceiling.
3. **Data model** beyond what's in `src/types.ts`.
4. **Auth & COPPA** — verifiable parental consent flow, parent → child binding, trusted-circle authentication for non-parent recipients (Aunt Jody opening a shared book).
5. **Safety threshold spec** — exact criteria, classifier choice, false-positive target, clinical-advisor review pipeline, "transparency to child" UX copy.
6. **Trusted-circle delivery** — push, deep link, or email when a book is shared; FaceTime co-reading.
7. **Persona persistence across personas** — shared underlying memory layer when a child switches from dog to aunt.
8. **Reading-level adaptation** — currently a numeric field on `ChildProfile` with no model behind it.
9. **Collaborative session mode** — the "Bring a grown-up in" button is a placeholder; PRD UC-4 needs the AI's facilitator/observer role-shift logic.
10. **Voice in/out** for the visual-first 5–7 tier.
11. **Pricing / business model**, **phasing**, **risks & mitigations**, **iOS native specifics** (Family Sharing, App Store age-gating), **offline UX**, **analytics that respect child privacy**, **accessibility** standards for early readers.

These are noted both for transparency and so the next pass has a concrete punch list.

## Try the safety threshold

In the conversation screen, type a phrase like `"I want to die"` or `"my stepdad hits me"`. Generate the storybook. Then visit the **Parent dashboard** from the splash screen — the alert and AI-generated conversation starters will be visible. The book also surfaces regardless of the child's sharing choice. (This is a stub demo of the threshold behavior; do not interpret the regex as a clinical instrument.)

## License

Proprietary — Olive / Storytime Sanctuary.
