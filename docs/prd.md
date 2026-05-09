# Product Requirements Document: Bedtime Storybook Companion

**Product Name:** TBD (working title — Bedtime Storybook Companion)

**Author:** [PLACEHOLDER: Product owner name]

**Date:** July 2025

**Version:** 1.0

> **Note (2026-05-09):** Source paste cut off mid-sentence in NFR-3. Sections
> after that point — the rest of NFR-3, additional NFRs, technical
> architecture, data model, dependencies, risks, milestones, open questions —
> are not yet captured in this doc.

---

## Executive Summary

A bedtime iPad app for children ages five to ten that transforms a child's private nightly conversation with a persistent AI companion into a personalized, fully illustrated storybook — generated in real time — that the child can choose to share with a parent or trusted family member as their bedtime reading. The conversation is the sanctuary. The storybook is the bridge.

The product sits at the intersection of two validated domains: bibliotherapy (using stories therapeutically with children, supported by multiple RCTs) and play-based emotional scaffolding (the clinical foundation of play therapy). It is architecturally parallel to Neon — a framework built for women ages 40 to 60 — but addresses an earlier developmental layer. Where Neon helps adults detect and navigate social-cognitive barriers, this product helps children construct the social-emotional skills that Neon later helps them protect.

The proof of concept already exists: the product creator and their granddaughter Camille have been manually creating AI-illustrated storybooks together since Camille was five — books about her journey with her dog, about imagining a meeting with a deceased great-grandmother. This product automates and deepens that loop while wrapping it in a privacy-respecting, clinically grounded architecture.

---

## Problem Statement

Children ages five to ten are in the most critical window for developing emotional vocabulary, self-regulation, and social cognition. Research shows that emotion vocabulary roughly doubles every two years between ages four and eleven (Bar-Ilan University longitudinal study), and that Advanced Theory of Mind — the ability to reason about recursive mental states ("I know that you know that I'm thinking this") — clicks around age seven (German longitudinal study, n=161). During this same window, a bidirectional loop exists between adverse peer experiences and self-regulation: children who struggle to regulate get more negative social experiences, which further degrades their regulation (2023 study, n=1,600+, ages six to eleven).

Parents want to support their children's emotional development but face two constraints. First, children don't always want to talk to their parents about what's hard — and developmental research supports the value of private processing before social sharing. Second, parents are exhausted at bedtime and often lack the tools to guide emotionally complex conversations even when they want to.

No existing product addresses both sides of this equation. Current children's storytelling apps — TaleTuck, Storynite, Artemis AI — are all parent-driven. The parent inputs content, selects themes, or provides the day's highlights, and the child is a passive recipient. No product treats the child as the author of their own emotional narrative while simultaneously giving the parent a meaningful, non-surveillance-based window into their child's inner world.

---

## Goals & Success Metrics

**Primary Goals:**

- Enable a child to create and author a personalized storybook artifact every session through private play-based conversation with an AI companion
- Give the child full control over whether and with whom the storybook is shared (sanctuary model)
- Provide parents with a meaningful nightly bedtime ritual — a personalized, illustrated book to read with their child — without exposing the child's raw emotional processing
- Scaffold emotional development, self-regulation, and social cognition implicitly through play, not through direct clinical questioning
- Maintain safety guardrails that flag and escalate severe danger signals (suicidal ideation, abuse, imminent harm) with mandatory parent notification

**Success Metrics:**

- Nightly session completion rate: ≥70% of active subscribers complete a session at least 5 nights per week during Phase Four soft launch
- Storybook generation success rate: ≥95% of completed sessions produce a viewable storybook
- Sharing rate: ≥40% of generated storybooks are shared with at least one trusted circle member
- Retention: ≥60% of soft-launch families remain active (5+ sessions per week) at 30 days
- Safety system false-positive rate on red-zone classifications: <5%, validated against a clinician-tagged test corpus
- Safety system false-negative rate on red-zone classifications: <1%, biased toward sensitivity
- Per-session AI cost: ≤$0.50
- App Store approval on first Kids Category submission
- COPPA compliance audit pass before soft launch

---

## Target Users & Personas

**Primary User — The Child (ages 5-10):**

The child opens the app at bedtime, engages with their chosen AI persona through a mood check-in and conversation, and receives a personalized illustrated storybook. The child controls whether to share the book, whether to invite a parent into the session, and which persona they talk to. The child experiences the app as play — fun, engaging, game-like — while emotional scaffolding happens implicitly.

Example: Camille, age 7, who already creates AI-illustrated storybooks with her grandfather about her dog, about imagining meeting her deceased great-grandmother, and about navigating playground conflicts where she told her friend "she needs to stand up for herself."

**Primary Buyer — The Parent:**

The parent pays for the subscription, sets up the child's profile, defines the trusted circle, and receives a nightly storybook to read at bedtime. The parent values intentional screen time, emotional development support, and a bedtime ritual that's meaningful rather than passive. The parent does not see conversation transcripts or mood data — only the finished storybook, and only if the child shares it. The one exception is the mandatory safety override.

The parent also gets something practical: 15 minutes of calm, independent screen time for their child that is genuinely good for the child. That's a real purchase motivator for exhausted parents.

**Secondary User — Trusted Circle Members:**

Grandparents, aunts, uncles, close family friends who receive shared storybooks and can participate in the child's reading life remotely. Example: Aunt Jody receives a book via notification and reads it to the child over FaceTime. This extends the product's emotional reach beyond the household.

---

## User Stories / Use Cases

**UC-1: Nightly Solo Session**
As a child, I open the app at bedtime, tap a sunshine emoji because I had a great day at the lake, talk to my dog persona about catching a frog, and receive a five-page illustrated storybook about my adventure. I share it with Mom, and she reads it to me before I fall asleep.

**UC-2: Processing a Hard Day**
As a child, I tap the cloud emoji because a friend got mad at me on the playground. My dog persona asks me what happened, and I talk through it. The storybook that comes out tells the story in a way that makes me feel brave. I decide to keep this one private.

**UC-3: Collaborative Mode**
As a child, I start a session solo but I want Mom to help me talk about something I saw — a bird that died on the side of the road. I tap the invite button, Mom joins, and the AI steps back while we talk together. The storybook captures our conversation.

**UC-4: Sharing with Extended Family**
As a child, I finish a book about my funny day at school and decide to share it with Aunt Jody. Aunt Jody gets a notification, opens the book on her phone, and calls me on FaceTime to read it together.

**UC-5: Parent Bedtime Ritual**
As a parent, I receive a notification that my child's storybook is ready. I sit with my child and read a personalized, illustrated book about their day. Most nights it's joyful. When it surfaces something hard, it gives me a natural doorway into conversation without me having to interrogate my child.

**UC-6: Safety Override**
As the system, I detect that a child has expressed suicidal ideation during a session. I immediately notify the parent with a non-alarming framing, provide AI-generated conversation starters tailored to this specific child based on longitudinal patterns, include a resource link to the 988 Suicide and Crisis Lifeline, and inform the child in age-appropriate language through their persona that someone who loves them is going to help.

**UC-7: Parent Onboarding**
As a parent, I download the app, create my account, complete COPPA consent verification via credit card transaction, set up my child's profile with their name and age, define my trusted circle (me, my partner, Aunt Jody), and hand the iPad to my child for persona selection and their first session.

**UC-8: Persona Selection and Evolution**
As a child, during my first session I choose a friendly dog as my companion. Three months later, I'm tired of the dog and switch to the aunt persona. The system recognizes this shift as a signal of evolving trust architecture.

**UC-9: Age-Adaptive Interaction (Young Child)**
As a five-year-old, I open the app and see big, colorful icons — a heart, a sunshine, a cloud, a storm. I tap the heart. My dog says "What made you feel happy today?" in a warm voice. I tap and point at things on screen more than I talk. My storybook uses simple words and bright pictures.

**UC-10: Age-Adaptive Interaction (Older Child)**
As a ten-year-old, I open the app and see a more minimal check-in screen. I tap the cloud and start talking right away about what happened at school. The conversation is more like a real discussion. My storybook has longer sentences and more nuanced illustrations.

---

## Scope — In & Out

### In Scope (MVP)

- Parent onboarding flow with COPPA-compliant verifiable parental consent
- Child profile creation (name, age, optional photo upload for storybook personalization)
- Curated persona selection screen: 3-4 pre-designed companions (a dog, a friendly aunt figure, a plant, and one additional TBD via clinical advisory consultation)
- Each persona has defined personality, visual identity, and conversational style
- Child can change persona selection over time
- Emoji-based mood check-in as session entry point (heart, sunshine, cloud, storm)
- Accessible labels on all icons for assistive technology
- Mood check-in doubles as longitudinal mood journal
- Age-adaptive conversation engine across three developmental tiers:
  - Ages 5-7: visual-first with voice follow-up
  - Ages 8-9: hybrid visual and voice with open-ended prompts
  - Age 10: conversation-first with minimal gamification
- Real-time storybook generation pipeline: 5-8 page illustrated narrative per session
- Reading level adapts to child's age and observed patterns
- Child's chosen persona appears as narrative companion throughout
- Persona tone adapts to child's mood (adventurous on good days, gentle on hard ones)
- Child-controlled sharing mechanism to parent-defined trusted circle
- Collaborative mode activated by child-initiated invite button
- AI role shifts when parent joins (facilitator or step-back mode)
- Three-tier safety threshold system (green/amber/red)
- Red-zone mandatory disclosure with parent notification, conversation starters, crisis resources, and child transparency
- COPPA-compliant data handling: parental consent verification, data minimization, encryption at rest and in transit
- iPad-native interface optimized for bedtime: large touch targets, warm color palettes, reduced blue light awareness

### Out of Scope (MVP)

- Android or web versions (iPad only for MVP)
- Meeting or school transcript ingestion
- Open-ended persona creation by the child (curated set only; expansion gated behind clinical advisory review — e.g., talking to a deceased family member as an ongoing conversational partner is clinically delicate territory that differs from creating a story about them)
- Voice narration of storybook by AI persona (flagged for Bill's input on TTS voice consistency)
- Dashboard or trend analytics visible to parent (risks undermining sanctuary model)
- Direct messaging or social features between children
- Targeted advertising or data monetization
- Print-on-demand physical book ordering (strong future revenue opportunity)
- Integration with school systems, therapists, or healthcare providers
- Multi-language support beyond English
- iPhone support (storybook experience benefits from larger iPad screen)

---

## Functional Requirements

**F-1 (P0):** System shall provide a parent onboarding flow that collects parent account credentials, child profile information (first name, age, optional photos), and completes COPPA verifiable parental consent via credit card transaction verification.

**F-2 (P0):** System shall present the child with a curated persona selection screen displaying 3-4 companion options (dog, friendly aunt figure, plant, one additional TBD), each with a distinct visual identity and personality preview. The child's selection persists across sessions and can be changed at any time.

**F-3 (P0):** System shall present an emoji-based mood check-in at session start using age-appropriate visual icons (heart, sunshine, cloud, storm) with accessible text labels. The selection is recorded as a MoodEntry and used to calibrate the AI conversation and storybook tone.

**F-4 (P0):** System shall conduct an age-adaptive conversation with the child after mood check-in. For ages 5-7: visual-first interaction with voice follow-up and larger touch targets. For ages 8-9: hybrid visual and voice with open-ended prompts. For age 10: conversation-first with minimal gamification. The conversation engine uses the child's age tier, mood check-in result, persona definition, and rolling session summaries to construct each response.

**F-5 (P0):** System shall generate a personalized, fully illustrated storybook of 5-8 pages from each completed session. The storybook incorporates the child as protagonist, the selected persona as narrative companion, and the emotional arc of the conversation as the story's spine. Reading level adapts to the child's age and evolving capability.

**F-6 (P0):** System shall generate AI illustrations for each storybook page using a locked illustration style and consistent persona visual reference. The child's appearance in illustrations is informed by uploaded photos translated into a persistent character description.

**F-7 (P0):** System shall present the child with a sharing screen after storybook generation, displaying the parent-defined trusted circle. The child selects zero or more recipients. Sharing is always the child's choice except in red-zone safety events.

**F-8 (P0):** System shall deliver shared storybooks to trusted circle members via push notification and/or email, viewable in-app or via mobile-optimized web view.

**F-9 (P0):** System shall run a safety classifier on every child conversation turn, evaluating against three-tier criteria (green/amber/red) and outputting a tier assignment and confidence score.

**F-10 (P0):** System shall execute mandatory disclosure protocol on red-zone classification: notify parent/primary caregiver with non-alarming framing, deliver AI-generated conversation starters specific to the child and situation, include crisis resource links (988 Suicide and Crisis Lifeline), and inform the child through their persona in age-appropriate language that someone who loves them is going to help.

**F-11 (P0):** System shall log amber-zone patterns across sessions and elevate to clinical advisory review queue if amber persists across 5 or more sessions.

**F-12 (P1):** System shall provide a child-initiated invite button that activates collaborative mode, allowing a parent or caregiver to join the active session. The AI shifts to facilitator role or steps back when a parent joins.

**F-13 (P1):** System shall maintain persona persistence across sessions — personality, quirks, conversation history, relationship continuity — so the companion feels like the same character every night.

**F-14 (P1):** System shall allow the parent to define and manage a trusted circle during or after onboarding: add members by name, relationship, and email; remove members; modify the list at any time.

**F-15 (P1):** System shall support trusted circle member account creation via email invitation: lightweight account with name, email, password, and view-only access to shared storybooks.

**F-16 (P1):** System shall adapt storybook reading level over time based on observed patterns in the child's age, vocabulary usage, and session history.

**F-17 (P1):** System shall cache previously generated and viewed storybooks locally on the device for offline re-reading.

**F-18 (P1):** System shall allow the parent to set a session time limit during child profile setup.

**F-19 (P2):** System shall gracefully handle loss of connectivity mid-session: save conversation state locally, allow continued interaction with pre-generated persona prompts, and queue storybook generation for retry with a persona-consistent message ("I'm still working on our story, it'll be ready when you wake up").

**F-20 (P2):** System shall cap per-session AI cost at $0.50 and gracefully wrap sessions that approach this ceiling.

---

## Non-Functional Requirements

**NFR-1: Privacy.** Child conversation transcripts, mood data, and session content are never visible to the parent except through the finished storybook (child-controlled) or the mandatory safety override (system-controlled). No child data is shared with third parties. No third-party analytics SDKs.

**NFR-2: Security.** All data encrypted at rest and in transit. All infrastructure in US regions for COPPA data residency. Authentication via email/password or Sign in with Apple.

**NFR-3: COPPA Compliance.** COPPA-compliant data handling for all child voice data, conversation transcripts, and storybook content. This includes verifiable parental consent using credit card verification at signup under the updated FTC rules effective June 2025. Data minimization — collect only what's necessary for the product to function. Encryption at rest and in transit. All infrastructure in US regions for data residency. No child data shared with third parties. No third-party analytics SDKs. Consider engaging a COPPA compliance consultant or pursuing kidSAFE certification. Fines for non-compliance run up to $50,000 per violation under the 2025 rules.

**NFR-4: Apple Kids Category Compliance.** No third-party advertising, no links out of the app without a parental gate, no data collection beyond what's disclosed and consented to. Apple's new age rating system takes effect fall 2025 with an updated questionnaire covering in-app controls, app capabilities, and wellness content. Design for Kids Category from day one, not as a retrofit. Use only Apple's own analytics frameworks.

> [TRUNCATED IN PASTE — paste rest of NFRs (if any), plus technical
> architecture, data model, dependencies, risks, milestones, and open
> questions sections.]
