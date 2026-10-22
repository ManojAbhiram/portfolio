---
# gstack: design-md-format=spec
name: Abhiram Kollepara Portfolio
description: A calm, light engineering spec sheet that reads as an extension of the resume, with evidence first and one teal accent.
colors:
  background: "#F6F7F9"
  surface: "#FFFFFF"
  text: "#12161C"
  text-muted: "#4A5361"
  line: "#D9DDE3"
  line-strong: "#B9C0CA"
  primary: "#0B6B6F"
  on-primary: "#FFFFFF"
  primary-hover: "#085458"
  accent-soft: "#E3F1F1"
  success: "#2F7D32"
  warning: "#8A5A00"
  error: "#B3303F"
typography:
  display:
    fontFamily: Satoshi
    fontWeight: 700
    fontSize: clamp(2.1rem, 5.2vw, 3.5rem)
    letterSpacing: -0.02em
  heading:
    fontFamily: Satoshi
    fontWeight: 700
    fontSize: 1.6rem
    letterSpacing: -0.01em
  body:
    fontFamily: Source Sans 3
    fontSize: 1.0625rem
    lineHeight: 1.6
  label:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    letterSpacing: 0.04em
  mono:
    fontFamily: JetBrains Mono
    fontFeature: tnum
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  metric:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
---

# Abhiram Kollepara Portfolio

## Overview

**Creative North Star:** An engineering spec sheet. Claims are backed by numbers and laid out the way the resume lays them out, so a recruiter or engineer can verify in seconds.
**Product context:** Personal portfolio for Kollepara Naga Sai Manoj Abhiram, a Software Engineer at Deepta AI (Go, Kafka, REST APIs, OCR, RAG, Agentic AI). Readers are HR screeners and engineering hiring teams who skim for about 30 seconds on a laptop, in daylight.
**Mode per surface:** Persuade for the hero and contact. Read for Experience, Projects and Skills. Operate for the arcade game modal.
**Memorable thing:** Backend plus GenAI, shown through production metrics and one live demo.
**Reference sites:** None opened. Direction drew on recruiter-advice guides that agree on a 30-second skim, metrics over tool lists, and obvious contact details.
**Key characteristics:**
- Light page, one teal accent, no gradients, no glow.
- Section order mirrors the resume: Summary, Experience, Projects, Live demo, Skills, Education, Certifications, Contact.
- The Skills block is a four-row table with the same category names as the resume.
- Resume PDF, email, LinkedIn and GitHub are visible on the first screen.

## Colors

**Strategy:** Restrained. Neutrals carry the page and teal appears only on links, primary buttons, metric chips and list markers.
**Light or dark:** Light, decided by the use scene (laptop, daylight, short skim). Muted text #4A5361 on #F6F7F9 stays above 7:1. Teal #0B6B6F on white stays above 5:1.
Metric chips use a pale teal tint behind teal text. State colours (success, warning, error) are used only inside the arcade modal and the backend status badge, and games.js reads them through the legacy names --rose, --amber, --cyan and --lime.

## Typography

Satoshi 700 is the display and heading face, loaded from Fontshare (api.fontshare.com, weights 500 and 700). Source Sans 3 is the body face, loaded from Google Fonts at 400, 600 and 700, and it is the same family the resume uses. JetBrains Mono at 400 and 500 carries dates, labels and metrics. All three were fetched live and confirmed to load. The display size never exceeds 3.5rem because this is a document, not a poster. Headings differ from body by size and weight, not only weight.

## Layout

Single column, maximum width 1080px with a fluid gutter of 20px to 48px. Left aligned. Sections are separated by a hairline that matches the content width and about 80px of vertical space. The hero spec block is a two-column definition list that collapses to one column below 720px. Skills rows are a 220px label plus a wrapping inline list, stacking below 720px. The arcade grid is three columns above 900px and one column below.

## Elevation & Depth

Flat. Borders and tints create hierarchy. The only shadow is a soft offset shadow on arcade cards on hover and under the game modal. No zero-offset glow.

## Shapes

Small radii: 4px for chips, 6px for buttons and inputs, 8px for cards, 10px for the modal and chat bubbles. Not one large radius everywhere.

## Components

- **Primary button:** teal fill, white text. Hover darkens to #085458. Focus uses a 2px teal outline with a 3px offset.
- **Secondary button:** white fill, hairline border, border and text turn teal on hover.
- **Metric chip:** mono text on pale teal, no wrapping.
- **Arcade card:** white surface, hairline border, border turns teal on hover. One card level only, never nested.
- **Nav:** sticky, translucent page colour, active section underlined in teal. Below 820px it becomes a toggle menu with aria-expanded.
- **Game modal:** white panel, page-colour header and footer, dialog role with a labelled title.

## Do's and Don'ts

- Do keep section names and order aligned with the resume PDF.
- Do put numbers inside the bullets they prove, as metric chips.
- Do keep one accent colour and use it sparingly.
- Do keep a visible focus outline on every interactive element.
- Do label the arcade honestly as live or offline.
- Don't add particle canvases, glows, boot screens or custom cursors.
- Don't use display type above 3.5rem or gradient text or gradient buttons.
- Don't put cards inside cards or give every item an equal-weight box.
- Don't add stat strips of three big numbers with tiny labels.
- Don't claim skills or tools that are not on the resume.

## Motion

- **Approach:** minimal-functional
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms)
- **The one authored moment:** the game modal opening for the arcade demo. Reduced-motion preference shortens all transitions to near zero.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-10-22 | Initial design system created | Created by /design-consultation. Replaced the dark neon terminal look with a light resume-aligned spec sheet for HR and engineering review. |
| 2026-10-22 | Skills shown as four resume-category rows | Fixes the uneven stack columns and mirrors the resume exactly. |
| 2026-10-22 | Removed boot screen, particle canvas, custom cursor | They delayed content by about 2 seconds and competed with the proof. |
