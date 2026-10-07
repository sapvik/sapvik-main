import re
from PIL import Image

# 1. Update assets/logo.svg from user's SAPVIK_logo.svg (remove opaque background)
with open('SAPVIK_logo.svg', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the white background rect so it blends perfectly into any header/paper background
clean_svg = re.sub(r'<path d="M0 0 C635\.58.*?fill="#FDFDFD"[^>]*\/>', '', content)

# Also ensure viewBox is set if not present so it scales cleanly
if 'viewBox' not in clean_svg:
    clean_svg = clean_svg.replace('<svg version="1.1"', '<svg version="1.1" viewBox="0 0 1926 817"')

with open('assets/logo.svg', 'w', encoding='utf-8') as f:
    f.write(clean_svg)

print("assets/logo.svg successfully updated from SAPVIK_logo.svg")

# 2. Also copy the high-res official PNG with transparent background
im = Image.open('SAPVIK Tech Logo with Device Letters.png').convert("RGBA")
datas = im.getdata()
new_data = []
for item in datas:
    # If pixel is near-white (background), make it transparent
    if item[0] > 248 and item[1] > 248 and item[2] > 248:
        new_data.append((255, 255, 255, 0))
    else:
        new_data.append(item)
im.putdata(new_data)
im.save('assets/logo.png', 'PNG')
print("assets/logo.png created with clean transparent background")
