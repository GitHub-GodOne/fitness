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

  const fontSize = Math.floor(width / 40);
  const lineHeight = fontSize * 1.5;
  const sidePadding = width * 0.18;
  const maxTextWidth = width - sidePadding * 2;

  const lines = wrapTextSafe(text, maxTextWidth, fontSize);
  const totalHeight = lineHeight * (lines.length - 1);
  const bottomPadding = fontSize * 3;
  const startY = height - bottomPadding - totalHeight;

  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${width / 2}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('\n');

  const svg = `
<svg width="${width}" height="${height}">
  <style>
    .text {
      font-family: 'Great Vibes', cursive;
      font-size: ${fontSize}px;
      fill: white;
      text-anchor: middle;
      filter: drop-shadow(0 6px 10px rgba(0,0,0,0.75));
    }
  </style>
  <text x="${width / 2}" y="${startY}" class="text">
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
  const charPx = fontSize * 0.48;
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
