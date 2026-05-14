# VoiceAtelier

> Your proportions are the canvas. Your voice is the design tool.

Voice-driven fashion design app. Reads a user's body proportions from a single
photo and renders original outfit designs from spoken descriptions, optionally
blended with an inspiration image. Renders in photorealistic and traditional
fashion-sketch modes, and learns each user's idiolect — what *they* mean by
"soft" or "flowy" — in a persistent taste profile.

**Status:** scaffold per PRD v1.0. The AI / ML stages (Whisper or Deepgram for
speech-to-text, IP-Adapter for style transfer, Stable Diffusion + ControlNet for
body-aware generation) sit behind narrow interfaces with deterministic stubs so
the full voice-refine-regenerate loop runs end-to-end on localhost without a
single API key.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # vitest suite
npm run build        # production Next.js build
```

## Architecture

```
src/
  app/
    layout.tsx            shell
    page.tsx              main flow — body → voice → inspiration → two variants → refine
    globals.css           styles
  components/
    BodyCapture.tsx       full-body photo upload → BodyDimensions
    VoiceInput.tsx        Web Speech API + free-text fallback
    InspirationInput.tsx  reference image upload + IP-Adapter blend dial
    DesignSvg.tsx         SVG renderer for variant + body, dual render modes
    TasteProfilePanel.tsx accumulated phrase → parameter mappings
  lib/
    types.ts              domain types
    fashionpedia.ts       natural-language → structured params, Fashionpedia-aligned
    speechToText.ts       Whisper / Deepgram interface + Web Speech fallback
    inspirationStyle.ts   IP-Adapter style extraction (canvas-based stub)
    bodyGeometry.ts       body dimension extraction (vendor-stubbed)
    designGenerator.ts    two-variant generation, conflict detection, refinement
    tasteProfile.ts       localStorage-backed taste profile
  __tests__/              vitest specs
```

### Pipeline seams

| Stage              | Interface                            | Production target                                       |
| ------------------ | ------------------------------------ | ------------------------------------------------------- |
| Speech-to-text     | `transcribeAudio(audio)`             | Whisper (OpenAI API) or Deepgram                        |
| Body geometry      | `extractBodyDimensions(file)`        | Outfii / PixRibe / VEXA (final vendor pending)          |
| Inspiration style  | `extractStyleEssence(file)`          | IP-Adapter (`ip-adapter_sd15.bin`, `ip-adapter-plus`)   |
| Design generation  | `generateDesignSet(opts)`            | Stable Diffusion / Flux + ControlNet on body silhouette |
| Refinement         | `applyRefinement(variant, instr)`    | Idea2Img / MIRA-style self-refine loop                  |
| Taste profile      | `loadTasteProfile / saveTasteProfile`| Firestore behind Firebase Auth                          |

Each stage has a stub that keeps the flow working offline. Production replaces
the implementation without touching screen code.

## Flow

1. **Body capture (FR-1..FR-5)** — upload one full-body photo. Dimensions come
   back from the vendor stub. The `isPetite` flag fires under 5'4" and the rest
   of the pipeline respects it (no rounding to standard sample sizes).
2. **Voice description (FR-6..FR-9)** — speak via the mic button (Web Speech
   API where supported) or type directly. The interpreter maps natural language
   onto Fashionpedia-aligned parameters: silhouette, drape, fabric weight,
   color, neckline, sleeve, layer count.
3. **Inspiration image (FR-10..FR-12)** — optional. Upload anything visual.
   IP-Adapter extracts dominant palette + mood. A blend dial controls the
   voice/reference balance from 0.0 to 1.0.
4. **Two-variant generation (FR-13..FR-18)** — every "Generate" produces two
   distinct variants on the same body. When voice and reference *conflict*
   (e.g., "make it flowy" pointed at heavy tweed) the two variants resolve in
   opposite directions and a banner flags the disagreement.
5. **Render toggle (FR-15..FR-17)** — Photoreal vs. Sketch, single tap.
6. **Voice + touch refinement (FR-19..FR-21)** — speak corrections to a
   selected variant or tap a region (neckline, sleeves, hem, body) to adjust
   by gesture. Each refinement keeps prior context — iterative rounds compose.
7. **Taste profile (FR-23..FR-25)** — every correction and every variant
   selection feeds the profile. Subsequent generations consult it before
   falling back to the default vocabulary, so first-generation alignment
   improves over sessions. View / reset in the right rail.

## Status vs. PRD v1.0

**Wired**

- FR-1..FR-5 body geometry capture + display (vendor stub)
- FR-6..FR-9 voice capture (Web Speech API + STT interface), Fashionpedia parsing
- FR-10..FR-12 inspiration image extraction + blend dial
- FR-13..FR-18 two-variant generation, conflict detection, dual render modes
- FR-19..FR-21 voice + touch refinement, iterative composition
- FR-23..FR-25 persistent taste profile with reset
- FR-26 variant selection
- NFR-1..NFR-3 latency targets (stub responses are well under the budgets)
- NFR-5 client-side data stays in localStorage; no exfiltration

**Stubbed pending production wiring**

- Real Whisper / Deepgram calls (interface in `src/lib/speechToText.ts`)
- Real IP-Adapter inference (interface in `src/lib/inspirationStyle.ts`)
- Real diffusion + ControlNet generation (interface in `src/lib/designGenerator.ts`)
- Real body-measurement vendor (interface in `src/lib/bodyGeometry.ts`)
- Firebase Auth + Firestore for cross-device profile persistence
- Self-refinement loop (FR-22) — interface ready; logic deferred
- Merge across variants (FR-27) — selection works; element-level merge UI deferred

## License

Proprietary — Olive / VoiceAtelier.
