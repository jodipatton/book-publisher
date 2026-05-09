# Product Requirements Document: Bedtime Storybook Companion

**Product Name:** TBD — working title: "Bedtime Storybook Companion"

**Author:** [PLACEHOLDER: product owner name]

**Date:** July 2025

**Version:** 1.0

> **Note (2026-05-09):** This PRD is the source of truth for the scaffold in
> this repo. It was pasted into the development session truncated mid-sentence
> at "As a child, I share my…" in US-3. Sections after that point are not yet
> captured. See `docs/gaps.md` for the running list of missing material.

---

## Executive Summary

Bedtime Storybook Companion is an iPad-native app for children ages five to ten that transforms a child's private nightly conversation with a persistent AI companion into a personalized, fully illustrated storybook — generated in real time — that the child can choose to share with a parent or trusted family member as their bedtime reading. The conversation is the sanctuary. The storybook is the bridge.

The product is grounded in validated clinical research — bibliotherapy, play therapy, and developmental psychology — and addresses a gap no existing product fills: treating the child as the author of their own emotional narrative while simultaneously giving the parent a meaningful, non-surveillance-based window into their child's inner world through the storybook artifact.

A parallel framework already exists in the Neon product, which supports women ages 40 to 60 in detecting and navigating conversational dynamics. Where Neon helps adults protect social cognition that's been suppressed, this product scaffolds the original construction of that cognition in children during the most critical developmental window.

The proof of concept already exists: the product creator and their granddaughter Camille have been manually creating AI-generated illustrated books together since Camille was five — books about her journey with her dog, about meeting a deceased great-grandmother, and about processing everyday emotions. This product systematizes and scales that exact experience.

---

## Problem Statement

Children ages five to ten are in the most critical window for developing emotional vocabulary, self-regulation, and social cognition. Research shows that emotion vocabulary roughly doubles every two years between ages four and eleven, and that Advanced Theory of Mind — the ability to reason about recursive mental states — clicks around age seven. During this same window, a bidirectional loop exists between adverse peer experiences and self-regulation: children who struggle to regulate get more negative social experiences, which further degrades their regulation.

Parents want to support their children's emotional development but face two constraints. First, children don't always want to talk to their parents about what's hard — and developmental research supports the value of private processing before social sharing. Parental dynamics can be challenging, and a child's emotions should never be exploitable by a parent. Second, parents are exhausted at bedtime and often lack the tools to guide emotionally complex conversations even when they want to.

No existing product addresses both sides of this equation. Current children's storytelling apps — TaleTuck, Storynite, Artemis AI — are all parent-driven. The parent inputs content, selects themes, or provides the day's highlights, and the child is a passive recipient. No product treats the child as the author of their own emotional narrative while simultaneously giving the parent a meaningful on-ramp that respects the child's privacy.

---

## Goals & Success Metrics

**Goal 1: Establish a nightly engagement loop.**
- Success metric: 60% of active child profiles complete four or more sessions per week during soft launch.
- Success metric: Storybook completion rate (child stays through full session to book generation) exceeds 80%.

**Goal 2: Validate the sanctuary-to-storybook architecture.**
- Success metric: 50% or more of generated storybooks are shared by the child with at least one trusted circle member.
- Success metric: Qualitative parent feedback confirms the storybook creates meaningful bedtime conversation without the parent feeling they need to surveil the child's sessions.

**Goal 3: Demonstrate safety system reliability.**
- Success metric: Red-zone false-positive rate below 5%, validated against clinician-tagged test corpus.
- Success metric: Zero false negatives on red-zone classifications during soft launch (validated via clinical advisory review of all sessions).
- Success metric: 100% of red-zone events result in parent notification with conversation starters within 60 seconds.

**Goal 4: Achieve COPPA compliance and App Store approval.**
- Success metric: COPPA verifiable parental consent flow passes legal review.
- Success metric: App accepted into Apple's Kids Category on first submission.

**Goal 5: Validate unit economics.**
- Success metric: Per-session AI cost stays at or below 50-cent ceiling across 95% of sessions.
- Success metric: Standard tier ($9.99/month) achieves positive gross margin with nightly usage when factoring AI costs, hosting, and storage.

---

## Target Users & Personas

**Persona 1: The Child (Primary User)**
- Age 5 to 10
- Uses the app on an iPad at bedtime, typically in the 15 to 30 minutes before sleep
- May or may not want to talk about their day — some nights it's a hard playground conflict, other nights it's catching a frog at the lake
- Wants the experience to feel fun, engaging, and game-like (especially ages 5 to 7), not clinical
- Forms attachment to the AI persona and looks forward to returning each night
- Wants to feel ownership and control — over the persona, over the story, over who sees it

**Persona 2: The Parent (Primary Buyer)**
- Parent of a child ages 5 to 10
- Likely intentional about screen time and emotional development
- Exhausted at bedtime and values 15 minutes of calm, independent screen time that is genuinely good for their child
- Wants visibility into their child's emotional world without surveillance
- May be inherently mistrustful of AI tools for children and needs transparent onboarding to build confidence
- Receives a personalized illustrated storybook each night as a bedtime reading ritual — this is the purchase motivator

**Persona 3: The Trusted Circle Member (Secondary User)**
- Grandparent, aunt, uncle, or close family friend
- Invited by the parent to receive shared storybooks
- May read the book with the child over FaceTime
- A child who can't tell mom something may choose to share a book with Aunt Jody instead — the trusted circle is an emotional routing system that mirrors how trust actually works in families
- View-only access; cannot see conversation transcripts, mood data, or any session content beyond the finished storybook

---

## User Stories / Use Cases

**US-1: Nightly Solo Session (P0)**
As a child, I open the app on my iPad before bed, see my dog companion waiting for me, tap how I'm feeling using a simple emoji, and have a private conversation about my day. The app turns our conversation into a storybook that I can read and decide whether to share.

**US-2: Storybook Sharing with Parent (P0)**
As a child, after my book is created, I tap a button to share it with Mom. Mom receives the book on her device and comes to read it with me at bedtime. Most nights it's fun — we went to the lake, I played with my friend — and sometimes it's about something harder.

**US-3: Storybook Sharing with Extended Family (P0)**
As a child, I share my [TRUNCATED IN PASTE — paste rest of US-3 onward here]
