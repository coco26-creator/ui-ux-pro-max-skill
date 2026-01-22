# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Antigravity Kit is an AI-powered design intelligence toolkit providing searchable databases of UI styles, color palettes, font pairings, chart types, and UX guidelines. It works as a skill/workflow for AI coding assistants (Claude Code, Windsurf, Cursor, etc.).

## Search Command

```bash
python3 source/scripts/search.py "<query>" --domain <domain> [-n <max_results>]
```

**Domain search:**
- `product` - Product type recommendations (SaaS, e-commerce, portfolio)
- `style` - UI styles (glassmorphism, minimalism, brutalism)
- `typography` - Font pairings with Google Fonts imports
- `color` - Color palettes by product type
- `landing` - Page structure and CTA strategies
- `chart` - Chart types and library recommendations
- `ux` - Best practices and anti-patterns
- `prompt` - AI prompts and CSS keywords

**Stack search:**
```bash
python3 source/scripts/search.py "<query>" --stack <stack>
```
Available stacks: `html-tailwind` (default), `react`, `nextjs`, `vue`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`

## Architecture

```
ui-ux-pro-max-skill/
├── source/                          # SINGLE SOURCE OF TRUTH
│   ├── data/                        # CSV databases (styles, colors, typography, etc.)
│   ├── scripts/                     # Python search engine (BM25 + regex)
│   └── skill.md                     # Template with {{script_path}} variable
│
├── agents/                          # Per-agent configurations
│   ├── .shared/config.yaml          # Shared data/scripts config
│   ├── claude/config.yaml           # Claude-specific config
│   ├── cursor/config.yaml           # Cursor-specific config
│   └── .../                         # Other agents
│
├── cli/
│   └── src/commands/
│       ├── init.ts                  # Install for user projects
│       ├── sync.ts                  # Generate from source → agent folders
│       └── build.ts                 # Generate from source → cli/assets
│
└── ...generated folders (.claude, .cursor, .windsurf, etc.)
```

## Development Workflow

**When modifying data or skill content:**

```bash
# 1. Edit source files only
edit source/data/*.csv
edit source/skill.md

# 2. Sync to all agent folders
bun run cli/src/index.ts sync

# 3. Build cli/assets for distribution
bun run cli/src/index.ts build
```

**CLI Commands:**

```bash
# Check what would be synced (dry-run)
bun run cli/src/index.ts sync --check

# Sync specific agent only
bun run cli/src/index.ts sync --agent claude

# Sync all agents
bun run cli/src/index.ts sync

# Build cli/assets
bun run cli/src/index.ts build
```

## Agent Config Format

Each agent has `agents/{name}/config.yaml`:

```yaml
output: ".claude/skills/ui-ux-pro-max"
depends_on: [.shared]  # optional

files:
  - from: source/data
    to: data
    type: copy
    
  - from: source/skill.md
    to: SKILL.md
    type: template
    frontmatter:
      name: ui-ux-pro-max
      description: "..."
    vars:
      script_path: "skills/ui-ux-pro-max/scripts/search.py"
```

## Prerequisites

Python 3.x (no external dependencies required)

## Git Workflow

Never push directly to `main`. Always:

1. Create a new branch: `git checkout -b feat/...` or `fix/...`
2. Commit changes
3. Push branch: `git push -u origin <branch>`
4. Create PR: `gh pr create`
