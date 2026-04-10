#!/bin/bash
# Generate App Icons from logo.png using sips (built-in macOS tool)

LOGO="/Users/it/Projects/AlShuailFund/AlShuailFund/AlShuailFund/AlShuailFund/Assets.xcassets/Logo.imageset/logo.png"
DEST="/Users/it/Projects/AlShuailFund/AlShuailFund/AlShuailFund/AlShuailFund/Assets.xcassets/AppIcon.appiconset"

# First create a square version of the logo with white/gradient background
# Using Python since sips can't do compositing
python3 << 'PYTHON'
from PIL import Image, ImageDraw
import os

logo_path = "/Users/it/Projects/AlShuailFund/AlShuailFund/AlShuailFund/AlShuailFund/Assets.xcassets/Logo.imageset/logo.png"
dest = "/Users/it/Projects/AlShuailFund/AlShuailFund/AlShuailFund/AlShuailFund/Assets.xcassets/AppIcon.appiconset"

logo = Image.open(logo_path).convert("RGBA")

def make_icon(size):
    icon = Image.new('RGB', (size, size), (255, 255, 255))
    draw = ImageDraw.Draw(icon)
    for y in range(size):
        ratio = y / size
        r = int(102 + (118 - 102) * ratio)
        g = int(126 + (75 - 126) * ratio)
        b = int(234 + (162 - 234) * ratio)
        draw.line([(0, y), (size, y)], fill=(r, g, b))
    padding = int(size * 0.1)
    available = size - (padding * 2)
    logo_ratio = logo.width / logo.height
    if logo_ratio > 1:
        new_w = available
        new_h = int(available / logo_ratio)
    else:
        new_h = available
        new_w = int(available * logo_ratio)
    logo_resized = logo.resize((new_w, new_h), Image.LANCZOS)
    x = (size - new_w) // 2
    y_pos = (size - new_h) // 2
    icon.paste(logo_resized, (x, y_pos), logo_resized)
    return icon

sizes = {
    "AppIcon-1024.png": 1024,
    "AppIcon-120.png": 120,
    "AppIcon-152.png": 152,
}

for fname, size in sizes.items():
    icon = make_icon(size)
    path = os.path.join(dest, fname)
    icon.save(path, "PNG")
    print(f"✅ {fname}: {size}x{size}")

print("\nDone!")
PYTHON
