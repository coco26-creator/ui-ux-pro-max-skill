---
name: ui-ux-pro-max
description: |
  UI/UX design intelligence with searchable database of 50+ styles, color palettes, font pairings, UX guidelines, and chart types across 9 technology stacks. Use when the user asks to design, build, review, or improve UI components, pages, or layouts. Use when selecting color palettes, typography, or visual styles for a project. Use when reviewing code for accessibility or UX issues. Trigger with phrases like "design a landing page", "choose a color palette", "review my UI", "build a dashboard", "pick fonts for my app".
allowed-tools: Read, Write, Edit, Bash(python3:*), Glob, Grep
version: 2.0.1
author: nextlevelbuilder
license: MIT
---

# UI/UX Pro Max - Design Intelligence

Searchable design system generator for web and mobile applications. Recommends styles, palettes, typography, and UX patterns matched to product type, industry, and stack.

## Overview

This skill provides a Python-based search tool over curated CSV databases covering styles, colors, typography, UX guidelines, charts, and landing page patterns. It generates complete design systems with reasoning-based recommendations and supports 10 technology stacks. All script paths use `{baseDir}` for portable installation.

## Prerequisites

- Python 3.x installed and available as `python3`
- The skill's `scripts/` and `data/` directories (included via symlinks from `src/ui-ux-pro-max/`)

## Instructions

1. Extract requirements from the user request: product type (SaaS, e-commerce, portfolio, dashboard), style keywords (minimal, playful, dark mode), industry (healthcare, fintech, gaming), and stack (React, Vue, Next.js, or default to `html-tailwind`).

2. Generate a design system using the `--design-system` flag (always run this first):
   ```bash
   python3 {baseDir}/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
   ```
   This searches 5 domains in parallel (product, style, color, landing, typography), applies reasoning rules, and returns a complete design system with anti-patterns to avoid.

3. Optionally persist the design system for cross-session retrieval:
   ```bash
   python3 {baseDir}/scripts/search.py "<query>" --design-system --persist -p "Project Name" [--page "page-name"]
   ```
   Creates `design-system/MASTER.md` and optional page-specific overrides in `design-system/pages/`.

4. Supplement with domain-specific searches as needed:
   ```bash
   python3 {baseDir}/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
   ```
   Domains: `product`, `style`, `typography`, `color`, `landing`, `chart`, `ux`, `react`, `web`, `prompt`.

5. Get stack-specific implementation guidelines:
   ```bash
   python3 {baseDir}/scripts/search.py "<keyword>" --stack html-tailwind
   ```
   Stacks: `html-tailwind`, `react`, `nextjs`, `vue`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`, `jetpack-compose`.

6. Run the pre-delivery checklist before delivering UI code: verify no emoji icons (use SVG), all clickable elements have `cursor-pointer`, light/dark mode contrast meets 4.5:1 minimum, responsive at 375px/768px/1024px/1440px, and `prefers-reduced-motion` is respected.

## Output

- A complete design system recommendation: pattern, style, colors, typography, effects, and anti-patterns
- Stack-specific implementation guidelines
- Optionally persisted `design-system/MASTER.md` with page-level overrides
- ASCII box (default) or Markdown (`-f markdown`) output formats

## Error Handling

- If `python3` is not found, prompt the user to install Python 3.x for their OS (macOS: `brew install python3`, Ubuntu: `sudo apt install python3`, Windows: `winget install Python.Python.3.12`).
- If search returns no results, retry with broader keywords or a different domain.
- If `--persist` fails to write files, check directory permissions in the project root.

## Examples

**Example 1: SaaS dashboard design system**
```bash
python3 {baseDir}/scripts/search.py "saas analytics dashboard professional" --design-system -p "MetricsPro"
```

**Example 2: E-commerce landing page with persisted design**
```bash
python3 {baseDir}/scripts/search.py "ecommerce fashion luxury" --design-system --persist -p "Luxe Store" --page "homepage"
```

**Example 3: Domain-specific deep dive**
```bash
python3 {baseDir}/scripts/search.py "glassmorphism dark" --domain style
python3 {baseDir}/scripts/search.py "elegant serif luxury" --domain typography
```

## Resources

- Design data: `{baseDir}/data/` (styles.csv, colors.csv, typography.csv, ux-guidelines.csv, charts.csv, landing.csv, products.csv, ui-reasoning.csv)
- Stack guidelines: `{baseDir}/data/stacks/`
- Search scripts: `{baseDir}/scripts/search.py`, `{baseDir}/scripts/design_system.py`, `{baseDir}/scripts/core.py`
- Repository: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
