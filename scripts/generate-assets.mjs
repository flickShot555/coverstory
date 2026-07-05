// Generates all Coverstory brand assets from a single keyhole design.
// Run: node scripts/generate-assets.mjs
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const publicDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public"
);

// Keyhole: circle on top + a tapered shaft with a triangular notch at the base.
const KEYHOLE = `
  <circle cx="256" cy="216" r="74" fill="#ffffff"/>
  <path d="M228 272 L284 272 L312 364 L278 364 L256 338 L234 364 L200 364 Z" fill="#ffffff"/>
`;

// Violet rounded-square app icon with the white keyhole.
const iconSvg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="115" fill="#7c3aed"/>
  ${KEYHOLE}
</svg>`;

// Standalone logo — keyhole only, transparent background, for the nav.
const logoSvg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  ${KEYHOLE}
</svg>`;

// 1200x630 social preview.
const ogSvg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g" cx="50%" cy="42%" r="65%">
      <stop offset="0%" stop-color="#2d1b69"/>
      <stop offset="100%" stop-color="#0a0a0f"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <g transform="translate(508,120) scale(0.36)">
    <rect width="512" height="512" rx="115" fill="#7c3aed"/>
    ${KEYHOLE}
  </g>
  <text x="600" y="440" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="92" font-weight="800" fill="#ffffff" letter-spacing="-2">Coverstory</text>
  <text x="600" y="500" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#b7b7c2">Hyperlocal, believable excuses — on demand.</text>
</svg>`;

async function main() {
  const iconBuffer = Buffer.from(iconSvg);

  // App icons
  await sharp(iconBuffer).resize(512, 512).png().toFile(
    path.join(publicDir, "icon-512.png")
  );
  await sharp(iconBuffer).resize(192, 192).png().toFile(
    path.join(publicDir, "icon-192.png")
  );

  // Favicon (32x32 -> .ico)
  const favPng = await sharp(iconBuffer).resize(32, 32).png().toBuffer();
  const ico = await pngToIco([favPng]);
  await writeFile(path.join(publicDir, "favicon.ico"), ico);

  // Standalone logo
  await writeFile(path.join(publicDir, "logo.svg"), logoSvg, "utf8");

  // Social preview
  await sharp(Buffer.from(ogSvg)).resize(1200, 630).png().toFile(
    path.join(publicDir, "og-image.png")
  );

  console.log("Generated: icon-512.png, icon-192.png, favicon.ico, logo.svg, og-image.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
