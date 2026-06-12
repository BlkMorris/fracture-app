from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


OUT = "brand/pulse-editorial/fracture-pulse-editorial-brand-sheet.pdf"
W, H = landscape(letter)

NIGHT = colors.HexColor("#101114")
CHALK = colors.HexColor("#FCFCF8")
ORANGE = colors.HexColor("#FF5A1F")
CYAN = colors.HexColor("#14B8C8")
WARM = colors.HexColor("#D9D4CC")
INK_2 = colors.HexColor("#323338")
MIST = colors.HexColor("#F0EEE7")


def hex_to_rgb(hex_color):
    value = hex_color.lstrip("#")
    return tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4))


def set_hex(c, hex_color):
    c.setFillColorRGB(*hex_to_rgb(hex_color))


def text(c, value, x, y, size=12, color=NIGHT, font="Helvetica", leading=None):
    c.setFillColor(color)
    c.setFont(font, size)
    if "\n" not in value:
        c.drawString(x, y, value)
        return
    leading = leading or size * 1.25
    for index, line in enumerate(value.split("\n")):
        c.drawString(x, y - index * leading, line)


def label(c, value, x, y, color=ORANGE):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x, y, value.upper())


def wrap(c, value, x, y, width, size=11, leading=15, color=INK_2, font="Helvetica"):
    c.setFillColor(color)
    c.setFont(font, size)
    words = value.split()
    line = ""
    for word in words:
        proposed = f"{line} {word}".strip()
        if stringWidth(proposed, font, size) <= width:
            line = proposed
        else:
            c.drawString(x, y, line)
            y -= leading
            line = word
    if line:
        c.drawString(x, y, line)
    return y - leading


def rule(c, x, y, w, color=WARM, stroke=1):
    c.setStrokeColor(color)
    c.setLineWidth(stroke)
    c.line(x, y, x + w, y)


def page_header(c, section, number, dark=False):
    color = CHALK if dark else NIGHT
    accent = CYAN if dark else ORANGE
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(42, H - 34, "FRACTURE")
    c.setFillColor(accent)
    c.circle(116, H - 30, 3, fill=1, stroke=0)
    c.setFillColor(color)
    c.setFont("Helvetica", 8)
    c.drawRightString(W - 42, H - 34, f"{section} / {number:02d}")


def footer(c, dark=False):
    color = WARM if dark else INK_2
    c.setFillColor(color)
    c.setFont("Helvetica", 7)
    c.drawString(42, 26, "Pulse Editorial brand sheet")
    c.drawRightString(W - 42, 26, "Built for live, modern news experiences")


def chip(c, value, x, y, fill, stroke=None, fg=NIGHT):
    c.setFillColor(fill)
    c.roundRect(x, y, stringWidth(value, "Helvetica-Bold", 8) + 18, 18, 9, fill=1, stroke=0)
    if stroke:
        c.setStrokeColor(stroke)
        c.roundRect(x, y, stringWidth(value, "Helvetica-Bold", 8) + 18, 18, 9, fill=0, stroke=1)
    c.setFillColor(fg)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x + 9, y + 5, value)


def cover(c):
    c.setFillColor(CHALK)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(NIGHT)
    c.rect(0, 0, W, 112, fill=1, stroke=0)
    page_header(c, "Identity", 1)
    c.setFillColor(ORANGE)
    c.rect(42, H - 142, 142, 12, fill=1, stroke=0)
    c.setFillColor(CYAN)
    c.rect(194, H - 142, 68, 12, fill=1, stroke=0)
    text(c, "PULSE", 42, H - 236, 86, NIGHT, "Helvetica-Bold")
    text(c, "EDITORIAL", 42, H - 310, 86, NIGHT, "Helvetica-Bold")
    wrap(
        c,
        "A live-news identity for Fracture: bright, fast, credible, and kinetic without borrowing the visual language of artificial intelligence products.",
        48,
        H - 357,
        440,
        15,
        20,
        INK_2,
    )
    c.setFillColor(NIGHT)
    c.rect(W - 258, 126, 216, 300, fill=1, stroke=0)
    c.setStrokeColor(CHALK)
    c.setLineWidth(1)
    for y in [384, 342, 300, 258, 216, 174]:
        c.line(W - 236, y, W - 64, y)
    label(c, "live now", W - 232, 396, CYAN)
    text(c, "Breaking\nwithout\nbreaking\ntrust.", W - 232, 314, 38, CHALK, "Helvetica-Bold", 40)
    c.setFillColor(ORANGE)
    c.circle(W - 75, 392, 5, fill=1, stroke=0)
    c.setFillColor(CYAN)
    c.rect(W - 236, 150, 78, 7, fill=1, stroke=0)
    footer(c)


def identity(c):
    c.setFillColor(CHALK)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    page_header(c, "Brand System", 2)
    label(c, "positioning", 42, H - 86)
    text(c, "The Site Feels Alive Before It Explains Itself", 42, H - 124, 31, NIGHT, "Helvetica-Bold")
    wrap(
        c,
        "Pulse Editorial makes Fracture feel like a modern newsroom product: immediate, scannable, and decisive. The brand should suggest movement through live status, timestamp rhythm, active rails, and sharp editorial hierarchy.",
        42,
        H - 156,
        430,
        12,
        17,
    )
    label(c, "voice", 42, H - 248, CYAN)
    voice = [
        ("Direct", "Short, useful, confident labels."),
        ("Current", "Language should imply freshness without hype."),
        ("Editorial", "Headlines carry judgment and structure."),
        ("Precise", "Metadata is compact and never decorative filler."),
    ]
    y = H - 282
    for title, body in voice:
        c.setFillColor(NIGHT)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(42, y, title)
        wrap(c, body, 132, y, 330, 11, 15)
        rule(c, 42, y - 16, 420, WARM)
        y -= 45
    c.setFillColor(NIGHT)
    c.rect(526, 96, 222, 350, fill=1, stroke=0)
    label(c, "do", 552, 404, CYAN)
    text(c, "Use live cues, status strips,\nclear section rhythm,\nand bold horizontal flow.", 552, 366, 18, CHALK, "Helvetica-Bold", 23)
    label(c, "don't", 552, 252, ORANGE)
    text(c, "No AI sparkles.\nNo chatbot-first layout.\nNo soft glass panels.\nNo vague tech optimism.", 552, 214, 18, CHALK, "Helvetica-Bold", 23)
    footer(c)


def color_type(c):
    c.setFillColor(CHALK)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    page_header(c, "Visual Tokens", 3)
    label(c, "color", 42, H - 86)
    palette = [
        ("Night", "#101114", NIGHT),
        ("Chalk", "#FCFCF8", CHALK),
        ("Pulse Orange", "#FF5A1F", ORANGE),
        ("Cyan", "#14B8C8", CYAN),
        ("Warm Gray", "#D9D4CC", WARM),
    ]
    x = 42
    for name, value, col in palette:
        c.setFillColor(col)
        c.rect(x, H - 186, 118, 76, fill=1, stroke=0)
        c.setStrokeColor(NIGHT if col != NIGHT else WARM)
        c.rect(x, H - 186, 118, 76, fill=0, stroke=1)
        text(c, name, x, H - 210, 10, NIGHT, "Helvetica-Bold")
        text(c, value, x, H - 226, 9, INK_2)
        x += 140
    label(c, "type", 42, H - 282, CYAN)
    text(c, "Top Stories Move Fast", 42, H - 334, 44, NIGHT, "Helvetica-Bold")
    text(c, "Sharp grotesk display for headlines. Tight sans body. Mono only for timestamps, counters, and feed mechanics.", 44, H - 362, 12, INK_2)
    text(c, "LIVE NOW  /  UPDATED 2M AGO  /  14 SOURCES", 44, H - 404, 10, ORANGE, "Courier-Bold")
    c.setFillColor(MIST)
    c.rect(480, 92, 268, 168, fill=1, stroke=0)
    label(c, "usage ratio", 506, 226)
    c.setFillColor(NIGHT)
    c.rect(506, 176, 160, 18, fill=1, stroke=0)
    c.setFillColor(ORANGE)
    c.rect(506, 148, 72, 18, fill=1, stroke=0)
    c.setFillColor(CYAN)
    c.rect(506, 120, 48, 18, fill=1, stroke=0)
    text(c, "Night + Chalk do the heavy lifting.", 590, 180, 10)
    text(c, "Orange signals urgency.", 590, 152, 10)
    text(c, "Cyan signals utility.", 590, 124, 10)
    footer(c)


def components(c):
    c.setFillColor(CHALK)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    page_header(c, "Interface System", 4)
    label(c, "homepage source of truth", 42, H - 86)
    text(c, "Bright Broadcast Dashboard", 42, H - 116, 28, NIGHT, "Helvetica-Bold")
    wrap(
        c,
        "The Pulse homepage is a white editorial surface with a heavy masthead, red live blocks, crisp tab rhythm, one dominant black lead module, a right live-update rail, and horizontal timeline mechanics.",
        42,
        H - 142,
        420,
        11,
        15,
    )

    c.setStrokeColor(WARM)
    c.setFillColor(CHALK)
    c.rect(42, 86, 704, 282, fill=1, stroke=1)
    c.setFillColor(NIGHT)
    c.setFont("Helvetica-Bold", 26)
    c.drawString(56, 340, "FRACTURE")
    c.setFillColor(ORANGE)
    c.rect(226, 332, 66, 20, fill=1, stroke=0)
    text(c, "LIVE NOW", 236, 338, 7, CHALK, "Helvetica-Bold")
    text(c, "Top Stories     Newest     Watchlist", 56, 310, 9, NIGHT, "Helvetica-Bold")
    c.setStrokeColor(ORANGE)
    c.line(56, 304, 108, 304)

    c.setFillColor(NIGHT)
    c.rect(56, 172, 516, 116, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#232323"))
    c.rect(284, 172, 288, 116, fill=1, stroke=0)
    c.setFillColor(ORANGE)
    c.rect(68, 258, 28, 16, fill=1, stroke=0)
    text(c, "LIVE", 74, 263, 6, CHALK, "Helvetica-Bold")
    text(c, "Ceasefire talks resume\nas pressure mounts", 68, 218, 21, CHALK, "Helvetica-Bold", 23)
    label(c, "world  /  28m ago", 68, 194, CYAN)
    text(c, "GENEVA", 480, 260, 11, CHALK, "Helvetica-Bold")
    c.setFillColor(ORANGE)
    c.rect(526, 256, 34, 16, fill=1, stroke=0)
    text(c, "LIVE", 536, 261, 6, CHALK, "Helvetica-Bold")

    c.setFillColor(CHALK)
    c.rect(588, 172, 142, 116, fill=1, stroke=1)
    label(c, "live updates", 604, 264, NIGHT)
    for i, y in enumerate([242, 220, 198, 176]):
        c.setFillColor(ORANGE if i % 2 == 0 else CYAN)
        c.circle(604, y + 2, 3, fill=1, stroke=0)
        text(c, "12:3" + str(i) + "  WORLD", 616, y, 6, NIGHT, "Courier-Bold")
        rule(c, 616, y - 5, 88, WARM)

    for i, x in enumerate([56, 184, 312, 440]):
        c.setFillColor(MIST)
        c.rect(x, 114, 112, 42, fill=1, stroke=1)
        label(c, ["business", "tech", "policy", "world"][i], x + 8, 142, CYAN if i % 2 else ORANGE)
        text(c, "Compact story card", x + 8, 128, 8, NIGHT, "Helvetica-Bold")

    c.setFillColor(ORANGE)
    c.rect(56, 92, 48, 16, fill=1, stroke=0)
    text(c, "LIVE TIMELINE", 62, 98, 5, CHALK, "Helvetica-Bold")
    rule(c, 112, 100, 588, WARM)
    for x in [152, 252, 352, 452, 552, 652]:
        c.setFillColor(CYAN if x > 252 else ORANGE)
        c.circle(x, 100, 3, fill=1, stroke=0)

    label(c, "component rules", 42, 58, ORANGE)
    wrap(c, "Keep modules rectilinear, compact, and scan-first. Use photos for news signal, mono timestamps for live mechanics, and orange only for active urgency.", 142, 58, 520, 9, 12)
    footer(c)


def motion(c):
    c.setFillColor(CHALK)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    page_header(c, "Motion + Interaction", 5)
    label(c, "dynamic behavior", 42, H - 86)
    text(c, "Motion Should Prove Freshness", 42, H - 124, 34, NIGHT, "Helvetica-Bold")
    wrap(
        c,
        "Pulse Editorial motion is functional: it marks new information, confirms interaction, and helps people understand update order. It should never feel like ambience.",
        42,
        H - 156,
        470,
        12,
        17,
    )
    items = [
        ("Live dot", "Subtle 1.8s opacity pulse; no glow halo."),
        ("Story hover", "Image crop shifts 2-4%; headline underline draws left to right."),
        ("Feed update", "New item slides in 8px, settles in 180ms."),
        ("Counters", "Digits tick vertically, not with bouncy easing."),
        ("Tabs", "Active rail moves horizontally under label."),
    ]
    y = H - 236
    for title, body in items:
        c.setFillColor(ORANGE if title in ["Live dot", "Feed update"] else CYAN)
        c.circle(54, y + 4, 5, fill=1, stroke=0)
        text(c, title, 74, y, 13, NIGHT, "Helvetica-Bold")
        wrap(c, body, 180, y, 430, 11, 15)
        y -= 50
    c.setFillColor(NIGHT)
    c.rect(570, 150, 148, 220, fill=1, stroke=0)
    c.setFillColor(ORANGE)
    c.circle(596, 332, 5, fill=1, stroke=0)
    text(c, "LIVE\n02:14\n02:15\n02:16", 616, 326, 16, CHALK, "Courier-Bold", 38)
    c.setStrokeColor(CYAN)
    c.setLineWidth(3)
    c.line(594, 166, 696, 166)
    footer(c)


def marketing(c):
    c.setFillColor(NIGHT)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    page_header(c, "Application", 6, dark=True)
    label(c, "marketing use", 42, H - 86, CYAN)
    text(c, "Make the Product Look\nLike It Is Updating\nRight Now.", 42, H - 172, 43, CHALK, "Helvetica-Bold", 48)
    wrap(
        c,
        "Hero, ads, launch graphics, and social cards should use actual interface fragments: live strips, headline stacks, update counters, and editorial modules. The product is the visual asset.",
        46,
        H - 228,
        390,
        13,
        18,
        WARM,
    )
    c.setFillColor(CHALK)
    c.rect(508, 116, 220, 300, fill=1, stroke=0)
    label(c, "launch card", 532, 378, ORANGE)
    text(c, "Fracture", 532, 336, 30, NIGHT, "Helvetica-Bold")
    text(c, "Live context for people\nwho read past headlines.", 532, 300, 17, NIGHT, "Helvetica-Bold", 21)
    c.setFillColor(ORANGE)
    c.rect(532, 250, 94, 7, fill=1, stroke=0)
    c.setFillColor(CYAN)
    c.rect(532, 232, 54, 7, fill=1, stroke=0)
    text(c, "LIVE NOW", 532, 188, 11, ORANGE, "Courier-Bold")
    text(c, "Updated 2m ago", 532, 166, 10, INK_2, "Courier")
    footer(c, dark=True)


def build():
    c = canvas.Canvas(OUT, pagesize=landscape(letter))
    for page in [cover, identity, color_type, components, motion, marketing]:
        page(c)
        c.showPage()
    c.save()


if __name__ == "__main__":
    build()
