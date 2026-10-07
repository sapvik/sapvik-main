import urllib.request
import re
import os

fonts_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'fonts')
css_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'css', 'fonts.css')
os.makedirs(fonts_dir, exist_ok=True)

url = 'https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap'
req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
})

css_content = urllib.request.urlopen(req, timeout=15).read().decode('utf-8')

# Split into @font-face blocks
blocks = re.findall(r'/\* ([^*]+) \*/\s*(@font-face\s*\{[^}]+\})', css_content, re.DOTALL)

local_css_blocks = []
downloaded = set()

for subset, block in blocks:
    subset = subset.strip()
    if subset != 'latin':
        continue # Download only latin character set to keep asset weight small
    
    # Extract url
    url_match = re.search(r'url\((https://[^\)]+\.woff2)\)', block)
    if not url_match:
        continue
    
    font_url = url_match.group(1)
    
    # Extract family and weight
    family = re.search(r"font-family:\s*'([^']+)'", block).group(1)
    weight = re.search(r"font-weight:\s*(\d+)", block).group(1)
    style = re.search(r"font-style:\s*(\w+)", block).group(1) if 'font-style:' in block else 'normal'
    
    safe_family = family.lower().replace(' ', '-')
    filename = f"{safe_family}-{weight}-{style}.woff2"
    filepath = os.path.join(fonts_dir, filename)
    
    if filename not in downloaded:
        print(f"Downloading {filename}...")
        try:
            font_data = urllib.request.urlopen(font_url, timeout=15).read()
            with open(filepath, 'wb') as f:
                f.write(font_data)
            downloaded.add(filename)
        except Exception as e:
            print(f"Failed to download {font_url}: {e}")
            continue

    # Replace remote URL with local path in font-face rule
    local_block = block.replace(font_url, f"../assets/fonts/{filename}")
    local_css_blocks.append(f"/* {subset} */\n{local_block}")

with open(css_path, 'w', encoding='utf-8') as f:
    f.write("/* Self-Hosted Fonts for SAPVIK (High Performance, Privacy-First) */\n\n")
    f.write("\n\n".join(local_css_blocks))
    f.write("\n")

print(f"Downloaded {len(downloaded)} font files. Created {css_path}")
