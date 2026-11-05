#!/usr/bin/env python3
"""Generate README image assets for dsh-doublecheck (docs/assets/).

Outputs (idempotent overwrite):
  dsh-doublecheck-flow-light.svg / dsh-doublecheck-flow-dark.svg
      Hero workflow diagram: the six discipline stages, the two guard seams
      that observe them, and the four-phase delivery gate that settles the
      verdict. Two hand-written SVG files (vector — never rasterized to
      webp). Text inside is command-surface tokens only (stage names, tool
      names, command names, config keys, file names), so all five README
      languages share the same pair and the diagram never needs a
      translation pass.

There is no benchmark data in this repository, so no evidence bar chart is
generated (and no chart is invented). The older single-theme
`dsh-doublecheck-flow.svg` / `dsh-doublecheck-hero.png` are kept on disk so
existing external links keep resolving; the READMEs reference the new pair.

Run once:  python scripts/gen-readme-assets.py
Requires:  Pillow (pip install pillow)
"""
from __future__ import annotations

import os
import sys

from PIL import ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")

# --- palette: PerryLink family (accent) + GitHub page backgrounds ----------
FAMILY = "#4B67B4"   # family accent (badges labelColor family uses #2B3245)
GREEN = {"light": "#16a34a", "dark": "#3fb950"}
SKIN = {
    "light": dict(bg="#ffffff", box="#f6f8fa", border="#d0d7de",
                  text="#1f2328", sub="#57606a", track="#eaeef2"),
    "dark": dict(bg="#0d1117", box="#161b22", border="#30363d",
                 text="#f0f6fc", sub="#8b949e", track="#21262d"),
}

# --- CJK font probe: Chinese must never render as tofu boxes ----------------
# Shared with the family asset-template. This diagram is drawn with command
# tokens (ASCII) only, but the probe stays: it is the one precondition every
# PerryLink asset script checks, so extending a chart with Chinese labels can
# never silently produce tofu boxes.
FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyh.ttc",      # Microsoft YaHei
    r"C:\Windows\Fonts\simhei.ttf",    # SimHei
    r"C:\Windows\Fonts\Deng.ttf",      # DengXian
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/System/Library/Fonts/PingFang.ttc",
]
FONT_PATH = next((p for p in FONT_CANDIDATES if os.path.exists(p)), None)
if FONT_PATH is None:
    sys.exit("FATAL: no CJK font found (looked for msyh.ttc, simhei.ttf, "
             "Deng.ttf, Noto Sans CJK, PingFang). Refusing to render Chinese "
             "as tofu boxes; install one of the probed fonts and re-run.")

# Fail loudly here (not at draw time) when the probed file is not a usable
# font at all — a truncated font download would otherwise surface later.
ImageFont.truetype(FONT_PATH, 16)

# --- SVG text: the install-side font stacks GitHub renders with ------------
SANS = "ui-sans-serif,system-ui,-apple-system,Segoe UI,Noto Sans,sans-serif"
MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"

# ---------------------------------------------------------------------------
# Hero workflow SVG (light + dark)
# ---------------------------------------------------------------------------
# The discipline loop, in order. `sub` is the surface token that proves the
# stage (a tool name, a test colour, a config key), never a sentence.
STAGES = [
    ("grill", "doublecheck_skills"),
    ("design", "doublecheck_spec"),
    ("red", "test:red"),
    ("green", "test:green"),
    ("review", "modules.adversary"),
    ("verify", "doublecheck_report"),
]
# Durable evidence the gate folds back out of the session log.
EVIDENCE_BAR = ("doublecheck/state · doublecheck/gate · gate-report.md · "
                "gate-report.json")
GATE_NODES = [
    ("/gate run", "4 phases"),
    ("deliverable | rework", "settled verdict"),
    ("doublecheck-gate --format json|sarif", "exit 0 | 1 | 2"),
]
FOOTER = "no network · session-log folds · stateVersion 3"


def esc(text: str) -> str:
    return (text.replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;"))


def flow_svg(skin: str) -> str:
    s = SKIN[skin]
    w, h = 1200, 470
    x0, x1 = 45, 1155
    nw, nh, gap = 155, 92, 36
    y0 = 138
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}" role="img" '
        f'aria-label="dsh-doublecheck workflow: grill to design to red to '
        f'green to review to verify, folded by /gate run into a deliverable '
        f'or rework verdict">',
        '<title>dsh-doublecheck workflow</title>',
        f'<rect width="{w}" height="{h}" rx="18" fill="{s["bg"]}"/>',
        f'<text x="{x0}" y="58" fill="{s["text"]}" font-family="{SANS}" '
        f'font-size="30" font-weight="700">dsh-doublecheck</text>',
        f'<text x="{x0}" y="88" fill="{s["sub"]}" font-family="{MONO}" '
        f'font-size="16">{esc("tools/pre-execute · tools/post-execute · "
                             "agent/turn-stopping")}</text>',
        f'<line x1="{x0}" y1="112" x2="{x1}" y2="112" '
        f'stroke="{s["border"]}"/>',
    ]
    step = nw + gap
    for i, (label, sub) in enumerate(STAGES):
        x = x0 + i * step
        accent = GREEN[skin] if i == len(STAGES) - 1 else (
            FAMILY if i == 0 else s["border"])
        parts.append(
            f'<rect x="{x}" y="{y0}" width="{nw}" height="{nh}" rx="14" '
            f'fill="{s["box"]}" stroke="{accent}" stroke-width="2"/>')
        parts.append(
            f'<text x="{x + nw // 2}" y="{y0 + 38}" fill="{s["text"]}" '
            f'text-anchor="middle" font-family="{MONO}" font-size="16" '
            f'font-weight="700">{esc(label)}</text>')
        parts.append(
            f'<text x="{x + nw // 2}" y="{y0 + 66}" fill="{s["sub"]}" '
            f'text-anchor="middle" font-family="{MONO}" '
            f'font-size="12">{esc(sub)}</text>')
        if i < len(STAGES) - 1:
            ax, ay = x + nw + 5, y0 + nh // 2
            parts.append(
                f'<path d="M{ax} {ay}h{gap - 20}" stroke="{s["sub"]}" '
                f'stroke-width="3"/>')
            parts.append(
                f'<path d="M{ax + gap - 22} {ay - 7}l10 7-10 7" fill="none" '
                f'stroke="{s["sub"]}" stroke-width="3" '
                f'stroke-linecap="round" stroke-linejoin="round"/>')

    # Durable-evidence bar: what each stage leaves in the session log.
    by, bh = 254, 46
    parts.append(
        f'<rect x="{x0}" y="{by}" width="{x1 - x0}" height="{bh}" rx="12" '
        f'fill="{s["box"]}" stroke="{FAMILY}" stroke-width="2"/>')
    parts.append(
        f'<text x="{x0 + (x1 - x0) // 2}" y="{by + 29}" fill="{s["text"]}" '
        f'text-anchor="middle" font-family="{MONO}" '
        f'font-size="13">{esc(EVIDENCE_BAR)}</text>')

    # Gate row: the command, the verdict it settles, the CI serializer.
    gy, gh, gw = 324, 62, 300
    positions = [x0, x0 + gw + 24, x0 + 2 * (gw + 24)]
    last_w = x1 - positions[2]
    widths = [gw, gw, last_w]
    for i, ((label, sub), gx, bw) in enumerate(zip(GATE_NODES, positions,
                                                   widths)):
        accent = GREEN[skin] if i == 1 else FAMILY
        parts.append(
            f'<rect x="{gx}" y="{gy}" width="{bw}" height="{gh}" rx="12" '
            f'fill="{s["box"]}" stroke="{accent}" stroke-width="2"/>')
        parts.append(
            f'<text x="{gx + bw // 2}" y="{gy + 28}" fill="{s["text"]}" '
            f'text-anchor="middle" font-family="{MONO}" font-size="14" '
            f'font-weight="700">{esc(label)}</text>')
        parts.append(
            f'<text x="{gx + bw // 2}" y="{gy + 47}" fill="{s["sub"]}" '
            f'text-anchor="middle" font-family="{MONO}" '
            f'font-size="11">{esc(sub)}</text>')
    for gx, bw in zip(positions[:-1], widths[:-1]):
        ax, ay = gx + bw + 3, gy + gh // 2
        parts.append(
            f'<path d="M{ax} {ay}h12" stroke="{s["sub"]}" stroke-width="3"/>')
        parts.append(
            f'<path d="M{ax + 4} {ay - 6}l9 6-9 6" fill="none" '
            f'stroke="{s["sub"]}" stroke-width="3" stroke-linecap="round" '
            f'stroke-linejoin="round"/>')

    parts.append(
        f'<text x="{x0}" y="436" fill="{s["sub"]}" font-family="{MONO}" '
        f'font-size="13">{esc(FOOTER)}</text>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n"


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for skin in ("light", "dark"):
        path = os.path.join(OUT, f"dsh-doublecheck-flow-{skin}.svg")
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(flow_svg(skin))
    print("wrote 2 SVG assets to docs/assets/ "
          "(dsh-doublecheck-flow-{light,dark}.svg)")


if __name__ == "__main__":
    main()
