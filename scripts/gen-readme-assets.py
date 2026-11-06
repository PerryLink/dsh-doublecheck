#!/usr/bin/env python3
"""README visuals for dsh-doublecheck, drawn from the delivery gate itself.

Two figures, both read off the shipped code and the README's own sample run:

  hero 1440x576 (Pillow, 4 files: zh/en x light/dark)
      Left column: kicker, plugin name, the headline, two value lines, the
      subtitle, meta, footer. Right side: the artefact a `/gate run` settles —
      a gate report with four phase rows, one red check (coverage 61% against
      the 80% minimum), one minor warning, and the settled verdict.

  flow 1100x660 (hand-written SVG, 2 files: light/dark)
      A gate board, not a node row. The durable session log is a rail on the
      left; a manifold feeds four phase rows. The rows are grouped by the
      evidence kind that produces them: requirements + tests are deterministic
      folds (0 model calls), consistency + review each fork one reviewer.
      Only a failing check crosses into the verdict rail; warnings and skips
      are drawn as never flipping it. The footer carries the artefacts and the
      bounded one-line projection.

Every number comes from the repository: the four phases and their checks
(src/domain/gate.ts), the defaults (minConfirmed 6, minCoveragePct 80,
maxFindings 5, tools read/glob/grep), the verdict rule `deriveGateVerdict`,
the CLI exit codes (src/ci.ts), and the 120-unit projection line
(src/domain/projection.ts). The sample values (6/6, 61% < 80%, 12 edits,
3 approvals, latest risk low) restate the README's own sample run.

Text inside the SVG stays on command-surface tokens and short English labels
(phase names, tool names, config keys, file names, status words), so all five
README languages share one pair.

Run once:  python scripts/gen-readme-assets.py
Requires:  Pillow + Windows fonts msyh.ttc / msyhbd.ttc / consola.ttf.
"""
from __future__ import annotations

import os
import sys
from html import escape as esc

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")

FONT_CJK = r"C:\Windows\Fonts\msyh.ttc"
FONT_CJK_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"
FONT_MONO = r"C:\Windows\Fonts\consola.ttf"
FONT_MONO_BOLD = r"C:\Windows\Fonts\consolab.ttf"
for _path in (FONT_CJK, FONT_CJK_BOLD, FONT_MONO, FONT_MONO_BOLD):
    if not os.path.exists(_path):
        sys.exit(f"FATAL: font missing: {_path}")

# Fail loudly here (not at draw time) when the probed CJK font is broken or
# truncated: Chinese must never render as tofu boxes. This is the one
# precondition every PerryLink asset script checks, so extending a figure with
# Chinese labels can never silently produce empty glyphs.
_probe = ImageFont.truetype(FONT_CJK, 16).getmask("证")
if _probe.getbbox() is None:
    sys.exit(f"FATAL: {FONT_CJK} renders no glyph for 证 (tofu guard); "
             "install a working Microsoft YaHei and re-run.")

RADIUS = 22  # card radius, family range 18-22

FONT_FILES = {
    "cjk": FONT_CJK,
    "cjk_bold": FONT_CJK_BOLD,
    "mono": FONT_MONO,
    "mono_bold": FONT_MONO_BOLD,
}

# --- palette -----------------------------------------------------------------
SKIN = {
    "light": dict(
        bg_from="#f9f6fd", bg_to="#e4eaf8",
        card="#ffffff", edge="#e6e2ef",
        text="#141419", sub="#4d5261", faint="#8f94a4",
        accent="#4B67B4", accent_soft="#eceaf9",
        ok="#16a34a", ok_bg="#eaf6ef",
        fail="#dc2626", fail_bg="#fdecec",
        warn="#b45309", warn_bg="#fdf3e9",
        shadow=(30, 24, 62), glow="#7a68c9",
    ),
    "dark": dict(
        bg_from="#131a2a", bg_to="#0c1016",
        card="#1b2231", edge="#2e374b",
        text="#f0f3f9", sub="#a8b1c4", faint="#737b8d",
        accent="#8496f5", accent_soft="#232c44",
        ok="#3fb950", ok_bg="#16281c",
        fail="#f85149", fail_bg="#2e1a1b",
        warn="#d9a441", warn_bg="#2a2216",
        shadow=(0, 0, 0), glow="#8496f5",
    ),
}

# --- hero copy ---------------------------------------------------------------
COPY = {
    "zh": dict(
        kicker="DEEPSEEK HARNESS · 交付质量门禁",
        name="dsh-doublecheck",
        headline="先证后交",
        v1="需求先拷问，测试先红后绿；",
        v2="交接之前，门禁给出裁决。",
        sub="两个插件行，同一份可重放的会话日志。",
        meta="四阶段清单 · remind / warn / block · 不联网",
        footer="Apache-2.0 · github.com/PerryLink/dsh-doublecheck",
        report="gate-report.md",
        settled="已定 · 1 个红灯",
        verdict_label="裁  决",
        verdict_word="返工",
        verdict_badge="1 红灯",
        verdict_sub="rework · 回到纪律循环",
        rows=[
            ("1 · 需求拷问", "6/6 关键问题 · spec 已提交", "PASS"),
            ("2 · 测试证据", "最近一次绿 · 覆盖率 61% < 80%", "FAIL"),
            ("3 · 实现一致性", "12 处改动已映射 · 1 处 minor 未映射", "WARN"),
            ("4 · 评审结论", "dsh-auto-review · 3 次通过 · 风险 low", "PASS"),
        ],
        red_label="红  项",
        red_item="1 · tests/coverage",
        red_detail="覆盖率 61% 低于 80% 下限",
        audit="只含计数、id 与裁决 · 密钥已脱敏",
    ),
    "en": dict(
        kicker="DEEPSEEK HARNESS · DELIVERY GATE",
        name="dsh-doublecheck",
        headline="Prove it first.",
        v1="Grill first, test red then green,",
        v2="and let the gate settle the handoff.",
        sub="Two plugin rows over one replayable session log.",
        meta="four-phase checklist · remind / warn / block · no network",
        footer="Apache-2.0 · github.com/PerryLink/dsh-doublecheck",
        report="gate-report.md",
        settled="settled · 1 red",
        verdict_label="VERDICT",
        verdict_word="rework",
        verdict_badge="1 red",
        verdict_sub="re-opens the discipline loop",
        rows=[
            ("1 · requirements", "6/6 key questions · spec committed", "PASS"),
            ("2 · tests", "latest run green · coverage 61% < 80%", "FAIL"),
            ("3 · consistency", "12 edits mapped · 1 minor unmapped", "WARN"),
            ("4 · review", "dsh-auto-review · 3 approved · risk low", "PASS"),
        ],
        red_label="RED  ITEMS",
        red_item="1 · tests/coverage",
        red_detail="61% coverage below the 80% minimum",
        audit="counts · ids · verdicts only — secrets redacted",
    ),
}


# --- small helpers -----------------------------------------------------------
def fnt(size: float, kind: str = "cjk") -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_FILES[kind], int(round(size)))


def hx(color: str) -> tuple[int, int, int]:
    color = color.lstrip("#")
    return tuple(int(color[i:i + 2], 16) for i in (0, 2, 4))


def gradient(w: int, h: int, top: str, bottom: str) -> Image.Image:
    img = Image.new("RGBA", (w, h))
    draw = ImageDraw.Draw(img)
    a, b = hx(top), hx(bottom)
    for y in range(h):
        t = 0.18 * (y / h) + 0.82 * (y / h) ** 1.4
        draw.line([(0, y), (w, y)],
                  fill=tuple(int(p + (q - p) * t) for p, q in zip(a, b)) + (255,))
    return img


def glow(img: Image.Image, cx: int, cy: int, r: int, color: str,
         alpha: int = 26) -> Image.Image:
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    rgb = hx(color)
    for i in range(10, 0, -1):
        rr = r * i / 10
        draw.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                     fill=rgb + (int(alpha * (1 - i / 11)),))
    layer = layer.filter(ImageFilter.GaussianBlur(r / 12))
    return Image.alpha_composite(img, layer)


def card(img: Image.Image, box: tuple[int, int, int, int], skin: dict,
         radius: int = RADIUS, fill: str | None = None,
         edge: str | None = None, shadow: bool = True,
         shadow_alpha: int = 46, dy: int = 14, blur: int = 22) -> Image.Image:
    """A soft-shadowed rounded card."""
    if shadow:
        x0, y0, x1, y1 = box
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).rounded_rectangle(
            [x0 + 2, y0 + dy, x1 + 2, y1 + dy],
            radius=radius, fill=skin["shadow"] + (shadow_alpha,))
        img = Image.alpha_composite(img, layer.filter(ImageFilter.GaussianBlur(blur)))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(box, radius=radius,
                           fill=fill or skin["card"],
                           outline=edge or skin["edge"], width=1)
    return img


def fit(draw: ImageDraw.ImageDraw, text: str, font, limit: int,
        note: str) -> float:
    w = draw.textlength(text, font=font)
    if w > limit:
        raise SystemExit(
            f"FATAL: {note} overflows: {w:.0f}px > {limit}px — {text!r}")
    return w


def status_color(skin: dict, status: str) -> str:
    return {"PASS": skin["ok"], "FAIL": skin["fail"], "WARN": skin["warn"]}[status]


# ---------------------------------------------------------------------------
# Hero banner (1440x576)
# ---------------------------------------------------------------------------
def hero(lang: str, skin_name: str) -> Image.Image:
    s, c = SKIN[skin_name], COPY[lang]
    W, H = 1440, 576
    img = gradient(W, H, s["bg_from"], s["bg_to"])
    img = glow(img, 1180, 120, 330, s["glow"], 30)
    img = glow(img, 260, 560, 240, s["glow"], 16)

    d = ImageDraw.Draw(img)
    x = 64
    limit = 664

    # kicker pill ------------------------------------------------------------
    kicker_font = fnt(14, "cjk_bold")
    kw = d.textlength(c["kicker"], font=kicker_font)
    pill_box = (x, 62, int(x + kw + 46), 96)
    d.rounded_rectangle(pill_box, radius=17, fill=s["accent_soft"],
                        outline=s["edge"], width=1)
    d.ellipse([x + 14, 74, x + 22, 82], fill=s["accent"])
    d.text((x + 30, 79), c["kicker"], font=kicker_font, fill=s["accent"],
           anchor="lm")

    # name ------------------------------------------------------------------
    name_font = fnt(31, "cjk_bold")
    d.text((x, 172), c["name"], font=name_font, fill=s["text"], anchor="ls")
    fit(d, c["name"], name_font, limit, "hero name")

    # headline --------------------------------------------------------------
    head_size = 88 if lang == "zh" else 82
    head_font = fnt(head_size, "cjk_bold")
    d.text((x - 4, 272), c["headline"], font=head_font, fill=s["text"],
           anchor="ls")
    fit(d, c["headline"], head_font, limit, "hero headline")

    # two value lines -------------------------------------------------------
    v_font = fnt(32, "cjk_bold")
    d.text((x, 332), c["v1"], font=v_font, fill=s["text"], anchor="ls")
    d.text((x, 378), c["v2"], font=v_font, fill=s["text"], anchor="ls")
    fit(d, c["v1"], v_font, limit, "hero value line 1")
    fit(d, c["v2"], v_font, limit, "hero value line 2")

    # subtitle / meta / footer ---------------------------------------------
    sub_font = fnt(25, "cjk")
    meta_font = fnt(20, "cjk")
    foot_font = fnt(18, "cjk")
    d.text((x, 428), c["sub"], font=sub_font, fill=s["sub"], anchor="ls")
    d.text((x, 468), c["meta"], font=meta_font, fill=s["faint"], anchor="ls")
    d.text((x, 528), c["footer"], font=foot_font, fill=s["faint"], anchor="ls")
    fit(d, c["sub"], sub_font, limit, "hero subtitle")
    fit(d, c["meta"], meta_font, limit, "hero meta")
    fit(d, c["footer"], foot_font, limit, "hero footer")

    # thin family accent rule above the footer ------------------------------
    d.rounded_rectangle([x, 496, x + 42, 499], radius=2, fill=s["accent"])

    # right panel: the settled gate report ----------------------------------
    px, py, pw, ph = 744, 44, 652, 508
    img = card(img, (px, py, px + pw, py + ph), s, radius=22,
               shadow_alpha=64, dy=16, blur=26)
    d = ImageDraw.Draw(img)
    pad = 30
    left = px + pad
    right = px + pw - pad

    d.text((left, py + 40), c["report"], font=fnt(15, "mono_bold"),
           fill=s["accent"], anchor="lm")
    d.text((right, py + 40), c["settled"], font=fnt(12.5, "cjk"),
           fill=s["faint"], anchor="rm")
    d.line([left, py + 60, right, py + 60], fill=s["edge"], width=1)

    # verdict block
    d.text((left, py + 88), c["verdict_label"], font=fnt(11.5, "cjk_bold"),
           fill=s["accent"], anchor="ls")
    word_font = fnt(48, "mono_bold") if lang == "en" else fnt(48, "cjk_bold")
    word = c["verdict_word"]
    d.text((left - 2, py + 146), word, font=word_font, fill=s["fail"],
           anchor="ls")
    ww = d.textlength(word, font=word_font)
    badge = c["verdict_badge"]
    badge_font = fnt(14, "cjk_bold")
    bw = d.textlength(badge, font=badge_font) + 30
    bx0 = int(left + ww + 18)
    d.rounded_rectangle([bx0, py + 120, bx0 + bw, py + 156],
                        radius=18, fill=s["fail_bg"], outline=s["fail"], width=1)
    d.text((bx0 + bw / 2, py + 138), badge, font=badge_font, fill=s["fail"],
           anchor="mm")
    d.text((left, py + 182), c["verdict_sub"], font=fnt(14, "cjk"),
           fill=s["sub"], anchor="ls")
    d.line([left, py + 198, right, py + 198], fill=s["edge"], width=1)

    # four phase rows
    row_top = py + 210
    row_h = 44
    for i, (name, evidence, status) in enumerate(c["rows"]):
        top = row_top + i * row_h
        color = status_color(s, status)
        if status == "FAIL":
            d.rounded_rectangle([left - 12, top - 3, right + 10, top + 40],
                                radius=10, fill=s["fail_bg"])
        d.ellipse([left + 2, top + 10, left + 13, top + 21], fill=color)
        d.text((left + 26, top + 20), name, font=fnt(17, "cjk_bold"),
               fill=s["text"], anchor="ls")
        d.text((right, top + 20), status, font=fnt(11.5, "mono_bold"),
               fill=color, anchor="rs")
        d.text((left + 26, top + 40), evidence, font=fnt(14, "cjk"),
               fill=s["sub"], anchor="ls")
        fit(d, evidence, fnt(14, "cjk"), right - left - 80, "hero row evidence")

    # red items block
    d.line([left, py + 394, right, py + 394], fill=s["edge"], width=1)
    box = (left - 16, py + 404, right + 10, py + 470)
    d.rounded_rectangle(box, radius=14, fill=s["fail_bg"],
                        outline=hx(s["fail"]) + (90,), width=1)
    d.text((left, py + 426), c["red_label"], font=fnt(11.5, "cjk_bold"),
           fill=s["fail"], anchor="ls")
    d.text((left, py + 452), c["red_item"], font=fnt(14.5, "mono_bold"),
           fill=s["fail"], anchor="ls")
    d.text((right, py + 452), c["red_detail"], font=fnt(12.5, "cjk"),
           fill=s["sub"], anchor="rs")
    fit(d, c["red_detail"], fnt(12.5, "cjk"), right - left - 200,
        "hero red detail")

    # audit line
    d.text((left, py + 494), c["audit"], font=fnt(12, "cjk"),
           fill=s["faint"], anchor="ls")
    fit(d, c["audit"], fnt(12, "cjk"), right - left, "hero audit")

    return img


# ---------------------------------------------------------------------------
# Flow diagram (1100x660, hand-written SVG)
# ---------------------------------------------------------------------------
SANS = "Segoe UI, Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif"
MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

FLOW_TEXT = dict(
    kicker="DELIVERY GATE · /gate run",
    title="Four phases, two kinds of evidence, one verdict",
    desc="Every check reads the durable session log; one failing check flips "
         "the verdict — warnings and skips never do.",
    log_label="SESSION LOG",
    log_sub="append-only · replay = state",
    log_tokens=["tool/call", "tool/result", "user/message",
                "autoReview/verdict"],
    log_durable_label="DURABLE FACTS",
    log_durable=["doublecheck/state", "doublecheck/gate"],
    log_file_label="OPTIONAL FILE",
    log_file="dsh-eval report",
    log_file_note="default off",
    log_note="no network",
    log_note2="replay-stable",
    group_a="DETERMINISTIC FOLD · 0 MODEL CALLS",
    group_b="FORKED REVIEWER · UP TO 1 SUBAGENT EACH",
    rows=[
        dict(num="1", name="requirements", status="PASS",
             source="doublecheck_spec · ask_user_question",
             chips=[("6/6 key questions", "pass"), ("spec committed", "pass")]),
        dict(num="2", name="tests", status="FAIL",
             source="shell test runs · [exit code: N] · coverage %",
             chips=[("latest run green", "pass"),
                    ("coverage 61% < 80%", "fail")]),
        dict(num="3", name="consistency", status="WARN",
             source="forked reviewer · read|glob|grep · maxFindings 5",
             chips=[("12 edits mapped", "pass"),
                    ("[minor] unmapped edit", "warn")]),
        dict(num="4", name="review", status="PASS",
             source="autoReview/verdict · else local reviewer",
             chips=[("3 approvals", "pass"), ("latest risk low", "pass")]),
    ],
    rail_label="VERDICT",
    rail_red="red item",
    rail_rule="one FAIL is enough",
    rail_word="rework",
    rail_sub="warn · skip never flip",
    rail_check_label="RED CHECK",
    rail_check="tests/coverage",
    rail_check_detail="61% < 80% minimum",
    ghost_label="deliverable",
    ghost_sub="0 red items",
    out_label="OUTPUTS",
    out_chips=["gate-report.md", "gate-report.json"],
    out_cmd="doublecheck-gate --format json|sarif → exit 1",
    proj_label="PROJECTION",
    proj="gate:rework r1 | stage:green | test:green edits:12 spec:yes review:yes",
    proj_note="≤ 120 chars",
)


def flow_palette(skin: str) -> dict:
    s = SKIN[skin]
    return dict(
        bg_from=s["bg_from"], bg_to=s["bg_to"],
        card=s["card"], edge=s["edge"],
        text=s["text"], sub=s["sub"], faint=s["faint"],
        accent=s["accent"], accent_soft=s["accent_soft"],
        ok=s["ok"], ok_bg=s["ok_bg"],
        fail=s["fail"], fail_bg=s["fail_bg"],
        warn=s["warn"], warn_bg=s["warn_bg"],
        shadow="#1b1735" if skin == "light" else "#000000",
        shadow_op="0.14" if skin == "light" else "0.5",
    )


def flow_svg(skin: str) -> str:
    p = flow_palette(skin)
    t = FLOW_TEXT
    W, H = 1100, 660
    parts: list[str] = []
    add = parts.append

    add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
        f'viewBox="0 0 {W} {H}" role="img" aria-labelledby="fig-title fig-desc">')
    add('<title id="fig-title">dsh-doublecheck delivery gate — four phases, '
        'two kinds of evidence, one verdict</title>')
    add('<desc id="fig-desc">The durable session log feeds four phase rows: '
        'requirements and tests fold deterministically with no model call, '
        'consistency and review each fork one read-only reviewer. Only a '
        'failing check crosses into the verdict rail; warnings and skips '
        'never flip the verdict. The footer carries gate-report.md, '
        'gate-report.json, the CI exit code and the bounded one-line '
        'projection.</desc>')
    add('<defs>')
    add(f'<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{p["bg_from"]}"/>'
        f'<stop offset="1" stop-color="{p["bg_to"]}"/></linearGradient>')
    add(f'<filter id="soft" x="-25%" y="-25%" width="150%" height="170%">'
        f'<feDropShadow dx="0" dy="7" stdDeviation="9" '
        f'flood-color="{p["shadow"]}" flood-opacity="{p["shadow_op"]}"/>'
        f'</filter>')
    add(f'<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">'
        f'<stop offset="0" stop-color="{p["accent"]}" stop-opacity="0.06"/>'
        f'<stop offset="1" stop-color="{p["accent"]}" stop-opacity="0"/></radialGradient>')
    for mid, color in (("arr-acc", p["accent"]), ("arr-fail", p["fail"]),
                       ("arr-mut", p["sub"])):
        add(f'<marker id="{mid}" viewBox="0 0 10 10" refX="8.5" refY="5" '
            f'markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">'
            f'<path d="M0.5 0.5 L9.5 5 L0.5 9.5 z" fill="{color}"/></marker>')
    add('</defs>')

    add(f'<rect width="{W}" height="{H}" rx="22" fill="url(#bg)"/>')
    add(f'<circle cx="1000" cy="70" r="230" fill="url(#glow)"/>')
    add(f'<circle cx="110" cy="640" r="180" fill="url(#glow)"/>')

    def txt(x, y, s, size, fill, family=SANS, weight=400, anchor="start",
            spacing=None, opacity=None):
        attrs = (f'x="{x}" y="{y}" fill="{fill}" font-family="{family}" '
                 f'font-size="{size}"')
        if weight != 400:
            attrs += f' font-weight="{weight}"'
        if anchor != "start":
            attrs += f' text-anchor="{anchor}"'
        if spacing:
            attrs += f' letter-spacing="{spacing}"'
        if opacity is not None:
            attrs += f' opacity="{opacity}"'
        add(f'<text {attrs}>{esc(s)}</text>')

    def rect(x, y, w, h, r=0, fill="none", stroke=None, sw=1, shadow=False,
             opacity=None, dash=None):
        attrs = (f'x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" '
                 f'fill="{fill}"')
        if stroke:
            attrs += f' stroke="{stroke}" stroke-width="{sw}"'
        if shadow:
            attrs += ' filter="url(#soft)"'
        if opacity is not None:
            attrs += f' opacity="{opacity}"'
        if dash:
            attrs += f' stroke-dasharray="{dash}"'
        add(f'<rect {attrs}/>')

    def line(x1, y1, x2, y2, color, sw=1, opacity=None, dash=None):
        attrs = (f'x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
                 f'stroke="{color}" stroke-width="{sw}"')
        if opacity is not None:
            attrs += f' opacity="{opacity}"'
        if dash:
            attrs += f' stroke-dasharray="{dash}"'
        add(f'<line {attrs}/>')

    def arrow(x1, y1, x2, y2, color, marker, sw=1.4, opacity=None):
        attrs = (f'd="M{x1} {y1} H{x2}" fill="none" stroke="{color}" '
                 f'stroke-width="{sw}" marker-end="url(#{marker})"')
        if opacity is not None:
            attrs += f' opacity="{opacity}"'
        add(f'<path {attrs}/>')

    # -- header -------------------------------------------------------------
    txt(44, 46, t["kicker"], 11.5, p["accent"], MONO, 700, spacing="1.6")
    txt(44, 82, t["title"], 27, p["text"], SANS, 700)
    txt(44, 106, t["desc"], 13, p["sub"])

    # -- left rail: the durable session log ---------------------------------
    rail_x, rail_y, rail_w, rail_h = 44, 122, 176, 448
    rect(rail_x, rail_y, rail_w, rail_h, 16, p["card"], p["edge"], 1, shadow=True)
    tx = 64
    txt(tx, 152, t["log_label"], 12.5, p["accent"], MONO, 700, spacing="1.1")
    txt(tx, 172, t["log_sub"], 11, p["sub"])
    line(tx, 188, 200, 188, p["edge"])
    for i, token in enumerate(t["log_tokens"]):
        y = 214 + i * 24
        add(f'<circle cx="{tx + 4}" cy="{y - 4}" r="2.4" fill="{p["accent"]}"/>')
        txt(tx + 16, y, token, 11, p["text"], MONO)
    line(tx, 302, 200, 302, p["edge"])
    txt(tx, 324, t["log_durable_label"], 11, p["accent"], MONO, 700,
        spacing="0.8")
    for i, token in enumerate(t["log_durable"]):
        y = 348 + i * 22
        add(f'<circle cx="{tx + 4}" cy="{y - 4}" r="2.4" fill="{p["accent"]}" '
            f'opacity="0.55"/>')
        txt(tx + 16, y, token, 11, p["text"], MONO)
    line(tx, 386, 200, 386, p["edge"])
    txt(tx, 408, t["log_file_label"], 11, p["accent"], MONO, 700,
        spacing="0.8")
    add(f'<circle cx="{tx + 4}" cy="{432 - 4}" r="2.4" '
        f'fill="{p["accent"]}" opacity="0.55"/>')
    txt(tx + 16, 432, t["log_file"], 11, p["text"], MONO)
    txt(tx, 454, t["log_file_note"], 11, p["faint"])
    line(tx, 474, 200, 474, p["edge"])
    txt(tx, 498, t["log_note"], 11, p["faint"])
    txt(tx, 518, t["log_note2"], 11, p["faint"])

    # -- manifold from the rail into the four rows --------------------------
    bus_x = 228
    row_x, row_w = 236, 594
    rows = [(154, 246), (254, 346), (378, 470), (478, 570)]
    centers = [(a + b) // 2 for a, b in rows]
    line(220, centers[0], bus_x, centers[0], p["accent"], 1.4)
    line(bus_x, centers[0], bus_x, centers[-1], p["accent"], 1.4, opacity=0.5)
    for cy in centers:
        arrow(bus_x, cy, row_x - 3, cy, p["accent"], "arr-acc")

    # -- group labels ------------------------------------------------------
    for label, y in ((t["group_a"], 144), (t["group_b"], 368)):
        add(f'<rect x="{row_x}" y="{y - 11}" width="8" height="8" rx="2" '
            f'fill="{p["accent"]}"/>')
        txt(row_x + 18, y, label, 11.5, p["accent"], MONO, 700, spacing="0.6")

    # -- phase rows --------------------------------------------------------
    for (top, bottom), row in zip(rows, t["rows"]):
        h = bottom - top
        rect(row_x, top, row_w, h, 16, p["card"], p["edge"], 1, shadow=True)
        status = row["status"]
        color = {"PASS": p["ok"], "FAIL": p["fail"], "WARN": p["warn"]}[status]
        bg = {"PASS": p["ok_bg"], "FAIL": p["fail_bg"],
              "WARN": p["warn_bg"]}[status]
        if status == "FAIL":
            rect(row_x + 1, top + 1, row_w - 2, h - 2, 15, p["fail_bg"],
                 opacity="0.55" if skin == "light" else "0.42")
        # number badge
        rect(row_x + 16, top + 14, 26, 26, 8, bg, color, 1)
        txt(row_x + 29, top + 31, row["num"], 12, color, MONO, 700,
            anchor="middle")
        # status pill
        pill_w = 62
        rect(row_x + row_w - 16 - pill_w, top + 14, pill_w, 22, 11, bg, color, 1)
        txt(row_x + row_w - 16 - pill_w / 2, top + 29, status, 11, color,
            MONO, 700, anchor="middle")
        # name + source
        txt(row_x + 54, top + 32, row["name"], 15, p["text"], MONO, 700)
        txt(row_x + 54, top + 52, row["source"], 11, p["sub"])
        # check chips
        cxp = row_x + 54
        for label, kind in row["chips"]:
            chip_color = {"pass": p["ok"], "fail": p["fail"],
                          "warn": p["warn"]}[kind]
            chip_bg = {"pass": p["ok_bg"], "fail": p["fail_bg"],
                       "warn": p["warn_bg"]}[kind]
            cw = int(len(label) * 6.9 + 30)
            rect(cxp, top + 60, cw, 22, 11, chip_bg, chip_color, 1)
            add(f'<circle cx="{cxp + 11}" cy="{top + 71}" r="3" '
                f'fill="{chip_color}"/>')
            txt(cxp + 20, top + 75, label, 11, chip_color, MONO)
            cxp += cw + 8

    # -- arrows from rows into the verdict rail ----------------------------
    for (top, bottom), row in zip(rows, t["rows"]):
        cy = (top + bottom) // 2
        if row["status"] == "FAIL":
            arrow(row_x + row_w, cy, 852, cy, p["fail"], "arr-fail", 2.2)
        else:
            arrow(row_x + row_w, cy, 852, cy, p["sub"], "arr-mut", 1.2,
                  opacity="0.55")

    # -- verdict rail ------------------------------------------------------
    vx, vy, vw, vh = 856, 154, 200, 416
    rect(vx, vy, vw, vh, 18, p["card"], p["edge"], 1, shadow=True)
    ix = vx + 20
    txt(ix, 186, t["rail_label"], 11, p["accent"], MONO, 700, spacing="1.4")
    txt(ix - 2, 244, "1", 40, p["fail"], MONO, 700)
    txt(ix + 30, 244, t["rail_red"], 11.5, p["fail"], MONO, 700)
    txt(ix, 264, t["rail_rule"], 11, p["sub"])
    line(ix, 280, vx + vw - 20, 280, p["edge"])
    txt(ix, 314, t["rail_word"], 24, p["fail"], MONO, 700)
    txt(ix, 334, t["rail_sub"], 11, p["sub"])
    line(ix, 350, vx + vw - 20, 350, p["edge"])
    txt(ix, 374, t["rail_check_label"], 11, p["fail"], MONO, 700, spacing="0.8")
    txt(ix, 396, t["rail_check"], 11, p["text"], MONO, 700)
    txt(ix, 414, t["rail_check_detail"], 11, p["sub"])
    line(ix, 432, vx + vw - 20, 432, p["edge"])
    rect(ix, 452, 156, 60, 12, "none", p["faint"], 1, dash="4 4")
    txt(ix + 12, 478, t["ghost_label"], 13, p["faint"], MONO, 700)
    txt(ix + 12, 498, t["ghost_sub"], 11, p["faint"])

    # -- footer: artefacts + bounded projection ----------------------------
    fx, fy, fw, fh = 44, 586, 1012, 54
    rect(fx, fy, fw, fh, 14, p["card"], p["edge"], 1, shadow=True)
    txt(fx + 20, 608, t["out_label"], 11, p["accent"], MONO, 700, spacing="0.9")
    cxp = fx + 110
    for chip in t["out_chips"]:
        cw = int(len(chip) * 6.55 + 22)
        rect(cxp, 596, cw, 22, 11, p["accent_soft"], p["edge"], 1)
        txt(cxp + 11, 611, chip, 11, p["text"], MONO)
        cxp += cw + 8
    txt(cxp + 10, 611, t["out_cmd"], 11, p["sub"], MONO)
    txt(fx + 20, 632, t["proj_label"], 11, p["accent"], MONO, 700,
        spacing="0.9")
    txt(fx + 110, 632, t["proj"], 11, p["text"], MONO)
    txt(fx + fw - 20, 632, t["proj_note"], 11, p["faint"], MONO, 400,
        anchor="end")

    add('</svg>')
    return "\n".join(parts) + "\n"


# ---------------------------------------------------------------------------
def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for lang in ("zh", "en"):
        for skin in ("light", "dark"):
            path = os.path.join(OUT, f"dsh-doublecheck-hero-{lang}-{skin}.webp")
            image = hero(lang, skin).convert("RGB")
            image.save(path, "WEBP", quality=92, method=6)
            print("wrote", os.path.relpath(path, ROOT))
    for skin in ("light", "dark"):
        path = os.path.join(OUT, f"dsh-doublecheck-flow-v5-{skin}.svg")
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(flow_svg(skin))
        print("wrote", os.path.relpath(path, ROOT))


if __name__ == "__main__":
    main()
