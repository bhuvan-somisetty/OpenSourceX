"""Generates docs/assets/tech-stack.svg, the tech-stack image shown in the README.

Run: python scripts/brand/tech-stack.py
Edit STACK below when the stack changes, then re-run and commit the SVG.
"""
from html import escape
from pathlib import Path

STACK = [
    ("Frontend", "#7d9bff", [
        "Next.js 16 (App Router)", "React 19", "TypeScript 5.9", "CSS design tokens",
        "react-markdown", "remark-gfm",
    ]),
    ("Backend & API", "#5ad1e6", [
        "Node.js 24", "Next.js Route Handlers", "Zod 4", "pino logging", "pg-boss 12 worker",
        "Rate limiting",
    ]),
    ("Data", "#4ade9a", [
        "PostgreSQL 17", "Neon (production)", "Docker Postgres (local)", "SQL migrations",
        "Postgres full-text search", "Recorded program snapshots",
    ]),
    ("AI", "#c4a1ff", [
        "Vercel AI SDK 7", "Google Gemini", "Groq", "Cerebras", "OpenRouter",
        "Vercel AI Gateway", "Anthropic / OpenAI (optional)", "Offline answer engine",
    ]),
    ("Live public APIs", "#f6c453", [
        "GitHub REST", "npm", "PyPI", "crates.io", "RubyGems", "Packagist", "NuGet",
        "Go module proxy", "OSV.dev", "Hacker News", "Stack Exchange", "Wikipedia",
    ]),
    ("Auth & security", "#ff7a95", [
        "Auth.js v5", "GitHub OAuth", "Google OAuth", "Guest sessions",
        "security.txt (RFC 9116)", "Contact-data guard",
    ]),
    ("Testing & quality", "#ff9d5c", [
        "Vitest 5", "Playwright", "ESLint 10", "Prettier 3", "GitHub Actions CI", "pnpm audit",
    ]),
    ("Tooling & hosting", "#8fb0ff", [
        "pnpm 12 workspaces", "Monorepo", "tsx", "Docker Compose", "Vercel", "sharp",
    ]),
]

W = 1200
PAD = 40
COL_GAP = 24
COLS = 2
COL_W = (W - 2 * PAD - COL_GAP) / COLS
PILL_H = 30
PILL_GAP_X = 8
PILL_GAP_Y = 10
CHAR_W = 7.4  # approx width per character at 13px
FONT = "Inter, Segoe UI, Helvetica, Arial, sans-serif"


def pill_w(text: str) -> float:
    return len(text) * CHAR_W + 28


def layout_section(items):
    rows, row, x = [], [], 0.0
    inner = COL_W - 40
    for it in items:
        w = pill_w(it)
        if row and x + w > inner:
            rows.append(row)
            row, x = [], 0.0
        row.append((it, x, w))
        x += w + PILL_GAP_X
    if row:
        rows.append(row)
    return rows


def section_height(rows):
    return 64 + len(rows) * (PILL_H + PILL_GAP_Y) + 10


sections = [(name, color, layout_section(items)) for name, color, items in STACK]
heights = [section_height(r) for _, _, r in sections]
# two columns, rows paired so both cards in a row share one height
row_heights = [max(heights[i], heights[i + 1] if i + 1 < len(heights) else 0) for i in range(0, len(heights), COLS)]
TOP = 150
H = TOP + sum(row_heights) + (len(row_heights) - 1) * 20 + PAD + 30

out = [
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{int(H)}" viewBox="0 0 {W} {int(H)}" font-family="{FONT}">',
    "<defs>",
    '<radialGradient id="bg" cx="50%" cy="0%" r="90%"><stop offset="0" stop-color="#121a33"/><stop offset="1" stop-color="#05070c"/></radialGradient>',
    '<linearGradient id="arrow" x1="4" y1="16" x2="31" y2="16" gradientUnits="userSpaceOnUse"><stop stop-color="#8FA8FF"/><stop offset="1" stop-color="#6F8CFF"/></linearGradient>',
    "</defs>",
    f'<rect width="{W}" height="{int(H)}" rx="24" fill="url(#bg)"/>',
    # logo
    '<g transform="translate(46 44) scale(2.0)">',
    '<g transform="translate(16 16) rotate(-45 0 0) translate(-16 -16)">',
    '<path fill="#F2F4F8" d="M11 3C27 9 27 23 11 29C20 23 20 9 11 3Z"/>',
    '<path d="M11 3L7 16L11 29" fill="none" stroke="#F2F4F8" stroke-opacity="0.6" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    '<path d="M7 16H26" stroke="url(#arrow)" stroke-width="3.2" stroke-linecap="round"/>',
    '<path d="M22.5 10L31.5 16L22.5 22L25 16Z" fill="url(#arrow)"/>',
    "</g></g>",
    f'<text x="128" y="78" fill="#F2F4F8" font-size="34" font-weight="700">OpenSourceX tech stack</text>',
    f'<text x="128" y="110" fill="#9aa3b5" font-size="16">TypeScript monorepo · Next.js on Vercel · PostgreSQL · free AI providers with an offline fallback</text>',
]

y = TOP
for r, rh in enumerate(row_heights):
    for c in range(COLS):
        i = r * COLS + c
        if i >= len(sections):
            break
        name, color, rows = sections[i]
        x0 = PAD + c * (COL_W + COL_GAP)
        out.append(f'<rect x="{x0:.0f}" y="{y:.0f}" width="{COL_W:.0f}" height="{rh:.0f}" rx="16" fill="#ffffff" fill-opacity="0.035" stroke="#ffffff" stroke-opacity="0.09"/>')
        out.append(f'<rect x="{x0 + 20:.0f}" y="{y + 26:.0f}" width="10" height="10" rx="3" fill="{color}"/>')
        out.append(f'<text x="{x0 + 40:.0f}" y="{y + 36:.0f}" fill="#F2F4F8" font-size="17" font-weight="700">{escape(name)}</text>')
        py = y + 54
        for row in rows:
            for text, px, pw in row:
                X = x0 + 20 + px
                out.append(f'<rect x="{X:.1f}" y="{py:.0f}" width="{pw:.1f}" height="{PILL_H}" rx="15" fill="{color}" fill-opacity="0.12" stroke="{color}" stroke-opacity="0.45"/>')
                out.append(f'<text x="{X + pw / 2:.1f}" y="{py + 20:.0f}" fill="#e6eaf3" font-size="13" text-anchor="middle">{escape(text)}</text>')
            py += PILL_H + PILL_GAP_Y
    y += rh + 20

out.append(f'<text x="{W / 2:.0f}" y="{H - 26:.0f}" fill="#6c7588" font-size="13" text-anchor="middle">opensource-x.vercel.app</text>')
out.append("</svg>")

dest = Path(__file__).resolve().parents[2] / "docs" / "assets" / "tech-stack.svg"
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text("\n".join(out), encoding="utf-8", newline="\n")
print(f"wrote {dest} ({W}x{int(H)})")
