"""Encode our browser-captured preview frames as a labelled README GIF."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
frames = [Image.open(path).convert('RGB') for path in sorted((root / 'test-results' / 'demo').glob('*.png'))]
if not frames:
    raise SystemExit('Run node src/browser/capture-demo.mjs first.')
target = root / 'public' / 'kiln-demo.gif'
swatches = Image.new('RGB', (160 * len(frames), 120))
for i, frame in enumerate(frames):
    swatches.paste(frame.resize((160, 120)), (160 * i, 0))
palette = swatches.quantize(colors=128)
frames = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
frames[0].save(target, save_all=True, append_images=frames[1:], duration=650, loop=0, optimize=True, disposal=1)
print(f'{target}: {len(frames)} frames, {target.stat().st_size} bytes')
