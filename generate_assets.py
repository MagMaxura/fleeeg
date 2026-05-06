from PIL import Image, ImageDraw, ImageFont
import math, os

BG = (15, 23, 42)       # #0f172a
GOLD = (245, 158, 11)   # #f59e0b
WHITE = (255, 255, 255)

os.makedirs("assets", exist_ok=True)

# ─── ICON 1024x1024 ───────────────────────────────────────────────
def draw_truck(draw, cx, cy, size):
    """Draw a simple truck silhouette centered at (cx, cy)."""
    s = size
    # Cab
    cab_x = cx + s * 0.10
    cab_y = cy - s * 0.22
    cab_w = s * 0.34
    cab_h = s * 0.36
    r = s * 0.06
    draw.rounded_rectangle(
        [cab_x, cab_y, cab_x + cab_w, cab_y + cab_h],
        radius=r, fill=GOLD
    )
    # Windshield
    ws_margin = s * 0.04
    draw.rounded_rectangle(
        [cab_x + ws_margin, cab_y + ws_margin,
         cab_x + cab_w - ws_margin, cab_y + cab_h * 0.55],
        radius=r * 0.5, fill=BG
    )
    # Cargo box
    box_x = cx - s * 0.42
    box_y = cy - s * 0.22
    box_w = s * 0.52
    box_h = s * 0.36
    draw.rounded_rectangle(
        [box_x, box_y, box_x + box_w, box_y + box_h],
        radius=r, fill=GOLD
    )
    # Chassis bar
    bar_y = cy + s * 0.14
    draw.rectangle(
        [cx - s * 0.44, bar_y, cx + s * 0.44, bar_y + s * 0.05],
        fill=GOLD
    )
    # Wheels
    wheel_r = s * 0.11
    wheel_y = cy + s * 0.18
    for wx in [cx - s * 0.27, cx + s * 0.27]:
        draw.ellipse(
            [wx - wheel_r, wheel_y, wx + wheel_r, wheel_y + wheel_r * 2],
            fill=BG, outline=GOLD, width=int(s * 0.025)
        )
        # Hub
        hub_r = wheel_r * 0.35
        hub_cx = wx
        hub_cy = wheel_y + wheel_r
        draw.ellipse(
            [hub_cx - hub_r, hub_cy - hub_r,
             hub_cx + hub_r, hub_cy + hub_r],
            fill=GOLD
        )

def make_icon(size=1024):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded square background
    pad = size * 0.04
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=size * 0.18, fill=BG
    )

    # Truck
    draw_truck(draw, size // 2, size // 2 - size * 0.04, size * 0.55)

    # "F" letter below truck — simple bold block letter
    letter_size = int(size * 0.13)
    try:
        # Try a bold system font
        font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", letter_size)
    except:
        font = ImageFont.load_default()

    text = "fleteen"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    tx = (size - tw) // 2
    ty = int(size * 0.67)
    draw.text((tx, ty), text, fill=GOLD, font=font)

    return img

icon = make_icon(1024)
icon.save("assets/icon.png")
print("icon.png OK")

# Also save without background (foreground only for adaptive icons)
fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
draw_fg = ImageDraw.Draw(fg)
draw_truck(draw_fg, 512, 480, 560)
fg.save("assets/icon-foreground.png")
print("icon-foreground.png OK")

# Background layer (solid dark color)
bg_img = Image.new("RGBA", (1024, 1024), BG + (255,))
bg_img.save("assets/icon-background.png")
print("icon-background.png OK")

# ─── SPLASH SCREEN 2732x2732 ──────────────────────────────────────
def make_splash(size=2732):
    img = Image.new("RGBA", (size, size), BG + (255,))
    draw = ImageDraw.Draw(img)

    # Truck centered, larger
    draw_truck(draw, size // 2, size // 2 - size * 0.05, size * 0.40)

    # "fleteen" wordmark
    word_size = int(size * 0.09)
    try:
        font_big = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", word_size)
    except:
        font_big = ImageFont.load_default()

    text = "fleteen"
    bbox = draw.textbbox((0, 0), text, font=font_big)
    tw = bbox[2] - bbox[0]
    tx = (size - tw) // 2
    ty = int(size * 0.60)
    draw.text((tx, ty), text, fill=GOLD, font=font_big)

    # Tagline
    tag_size = int(size * 0.028)
    try:
        font_tag = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", tag_size)
    except:
        font_tag = ImageFont.load_default()

    tag = "tu flete, en minutos"
    bbox2 = draw.textbbox((0, 0), tag, font=font_tag)
    tw2 = bbox2[2] - bbox2[0]
    tx2 = (size - tw2) // 2
    draw.text((tx2, ty + word_size + int(size * 0.02)), tag,
              fill=(148, 163, 184), font=font_tag)  # slate-400

    return img

splash = make_splash(2732)
splash.save("assets/splash.png")
print("splash.png OK")

# Also save a smaller splash for faster loading
splash_small = make_splash(1024)
splash_small.save("assets/splash-dark.png")
print("splash-dark.png OK")

print("\nTodos los assets generados en /assets/")
