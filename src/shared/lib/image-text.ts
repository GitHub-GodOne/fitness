import sharp from 'sharp';

/**
 * Add text overlay to an image using SVG compositing.
 *
 * Supports two input modes:
 * - Buffer: pass image data directly
 * - URL string: fetches the image first
 *
 * Returns a PNG buffer with the text rendered at the bottom center.
 */
export async function addTextToImage(
  imageInput: Buffer | string,
  text: string
): Promise<Buffer> {
  let imageBuffer: Buffer;

  if (typeof imageInput === 'string') {
    const response = await fetch(imageInput);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    imageBuffer = Buffer.from(await response.arrayBuffer());
  } else {
    imageBuffer = imageInput;
  }

  const image = sharp(imageBuffer);
  const { width, height } = await image.metadata();

  if (!width || !height) {
    throw new Error('Failed to get image dimensions');
  }

  let fontSize = Math.floor(width / 40);
  const sidePadding = width * 0.18;
  const maxTextWidth = width - sidePadding * 2;
  const bottomPadding = fontSize * 3;
  // Max vertical space available for text (bottom 40% of image)
  const maxTextAreaHeight = height * 0.4;
  const minFontSize = Math.max(12, Math.floor(width / 80));

  // Dynamically reduce font size if text overflows vertically
  let lines: string[];
  let lineHeight: number;
  let totalHeight: number;

  while (fontSize >= minFontSize) {
    lineHeight = fontSize * 1.5;
    lines = wrapTextSafe(text, maxTextWidth, fontSize);
    totalHeight = lineHeight * lines.length;

    if (totalHeight + bottomPadding <= maxTextAreaHeight) {
      break;
    }
    fontSize = Math.floor(fontSize * 0.9);
  }

  // Final calculation with resolved font size
  lineHeight = fontSize * 1.5;
  lines = wrapTextSafe(text, maxTextWidth, fontSize);
  totalHeight = lineHeight * lines.length;

  // Clamp startY so text never goes above the image
  const idealStartY = height - bottomPadding - totalHeight + lineHeight;
  const startY = Math.max(lineHeight, idealStartY);

  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${width / 2}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('\n');

  const svg = `
<svg width="${width}" height="${height}">
  <defs>
    <clipPath id="textClip">
      <rect x="0" y="0" width="${width}" height="${height}" />
    </clipPath>
  </defs>
  <style>
    .text {
      font-family: 'Great Vibes', 'Noto Serif', 'DejaVu Serif', Georgia, serif;
      font-size: ${fontSize}px;
      fill: white;
      text-anchor: middle;
      filter: drop-shadow(0 6px 10px rgba(0,0,0,0.75));
    }
  </style>
  <text x="${width / 2}" y="${startY}" class="text" clip-path="url(#textClip)">
    ${tspans}
  </text>
</svg>
`;

  return image
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toBuffer();
}

function wrapTextSafe(
  text: string,
  maxWidthPx: number,
  fontSize: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  // Use conservative multiplier (0.55) to account for wider fallback fonts on Linux/Ubuntu
  // 'Great Vibes' is narrow cursive; fallback serif fonts are significantly wider
  const charPx = fontSize * 0.55;
  const maxUnits = maxWidthPx / charPx;
  let line = '';

  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    const units = estimateWidthUnits(test);

    if (units <= maxUnits) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function estimateWidthUnits(text: string): number {
  let w = 0;
  for (const ch of text) {
    if (ch === ' ') w += 0.38;
    else if (/[A-Z]/.test(ch)) w += 0.9;
    else if (/[.,]/.test(ch)) w += 0.28;
    else w += 0.78;
  }
  return w;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
