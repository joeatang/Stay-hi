#!/usr/bin/env python3
"""
Generate PWA icons with proper visibility and masking
Creates 192x192 and 512x512 icons with Hi logo on colored background
"""

from PIL import Image, ImageDraw
import os

# Colors from theme
BG_COLOR = "#FFD166"  # Hi yellow - high contrast
LOGO_PATH = "public/assets/brand/hi-logo-light.png"
OUTPUT_DIR = "public/assets/brand"

def create_pwa_icon(size, is_maskable=False):
    """Create PWA icon with proper padding and background"""
    
    # Create base image with yellow background
    img = Image.new('RGBA', (size, size), BG_COLOR)
    
    # Load logo
    try:
        logo = Image.open(LOGO_PATH)
    except:
        print(f"❌ Error: Could not load logo from {LOGO_PATH}")
        return None
    
    # Calculate padding (maskable needs 10% safe zone, regular needs less)
    if is_maskable:
        # Maskable: 80% of canvas (10% padding on each side)
        logo_size = int(size * 0.8)
        padding = int(size * 0.1)
    else:
        # Regular: 85% of canvas for better visibility
        logo_size = int(size * 0.85)
        padding = int(size * 0.075)
    
    # Resize logo maintaining aspect ratio
    logo.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
    
    # Center the logo
    logo_x = (size - logo.width) // 2
    logo_y = (size - logo.height) // 2
    
    # Paste logo onto background
    img.paste(logo, (logo_x, logo_y), logo if logo.mode == 'RGBA' else None)
    
    return img

def main():
    print("🎨 Generating PWA icons...")
    
    # Generate 192x192 (any + maskable)
    icon_192 = create_pwa_icon(192, is_maskable=False)
    if icon_192:
        output_path = os.path.join(OUTPUT_DIR, "hi-logo-192.png")
        icon_192.save(output_path, "PNG", optimize=True)
        print(f"✅ Created: {output_path}")
    
    # Generate 512x512 (any)
    icon_512 = create_pwa_icon(512, is_maskable=False)
    if icon_512:
        output_path = os.path.join(OUTPUT_DIR, "hi-logo-512.png")
        icon_512.save(output_path, "PNG", optimize=True)
        print(f"✅ Created: {output_path}")
    
    # Generate 512x512 maskable (with 10% safe zone)
    icon_512_maskable = create_pwa_icon(512, is_maskable=True)
    if icon_512_maskable:
        output_path = os.path.join(OUTPUT_DIR, "hi-logo-512-maskable.png")
        icon_512_maskable.save(output_path, "PNG", optimize=True)
        print(f"✅ Created: {output_path}")
    
    # Generate apple-touch-icon (180x180 for iOS)
    icon_180 = create_pwa_icon(180, is_maskable=False)
    if icon_180:
        output_path = os.path.join(OUTPUT_DIR, "apple-touch-icon.png")
        icon_180.save(output_path, "PNG", optimize=True)
        print(f"✅ Created: {output_path}")
    
    print("\n🎉 Icon generation complete!")
    print("\nNext steps:")
    print("1. Update manifest.json to use hi-logo-512-maskable.png")
    print("2. Add apple-touch-icon to HTML <head>")
    print("3. Test on home screen - logo should be clearly visible")

if __name__ == "__main__":
    main()
