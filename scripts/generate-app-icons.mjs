// Renders the app icons: every registered animal on the wood table, at the
// sizes iOS and the web need. Run `bun run generate:icons` after adding or
// changing an animal; the outputs are committed.
//
//   assets/app-icons/Icon-App-1024x1024.png        primary icon
//   assets/app-icons/animals/<Animal>.appiconset/  one alternate icon set per
//                                                  animal, copied into the Xcode
//                                                  asset catalog by
//                                                  plugins/withAnimalAppIcons.js
//   public/icons/*.png                             favicon, touch and PWA icons
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

import { defaultAppIcon } from "../src/constants/appIcon";

const root = path.resolve(import.meta.dirname, "..");
const animalsDir = path.join(root, "src/Animals");
const woodPath = path.join(root, "src/Table/wood-background.jpg");
const appIconsDir = path.join(root, "assets/app-icons");
const alternatesDir = path.join(appIconsDir, "animals");
const webIconsDir = path.join(root, "public/icons");

const SIZE = 1024;
// The animal art fills 60/64 of its viewBox, so a 778px canvas puts ~730px of
// animal on the icon; nudged down so the face sits on the optical centre.
const ART_SIZE = 778;
const ART_OFFSET_Y = 28;

// Square crop of the table texture, pulled a touch darker and cooler than the
// in-game table so the animal pops, and lightly sharpened since the crop is
// upscaled.
const WOOD_GAIN = [0.8443, 0.8389, 0.871];
const WOOD_SHARPEN = { sigma: 1.5, amount: 0.6 };
// Linear contrast stretch about mid-grey: y = slope * x + intercept, for x in 0..1
const WOOD_CONTRAST = { slope: 1.17085, intercept: -0.085425 };

// Alternate icons only ever show at home-screen, Spotlight and Settings sizes,
// so no 1024 marketing image is included (it would add ~1MB per icon).
const ALTERNATE_SIZES = [
  { idiom: "iphone", size: 29, scale: 2 },
  { idiom: "iphone", size: 29, scale: 3 },
  { idiom: "iphone", size: 40, scale: 2 },
  { idiom: "iphone", size: 40, scale: 3 },
  { idiom: "iphone", size: 60, scale: 2 },
  { idiom: "iphone", size: 60, scale: 3 },
  { idiom: "ipad", size: 29, scale: 2 },
  { idiom: "ipad", size: 40, scale: 2 },
  { idiom: "ipad", size: 76, scale: 2 },
  { idiom: "ipad", size: 83.5, scale: 2 },
];

const WEB_ICONS = [
  ["favicon.png", 32],
  ["apple-touch-icon-60x60.png", 60],
  ["apple-touch-icon-120x120.png", 120],
  ["apple-touch-icon-152x152.png", 152],
  ["apple-touch-icon-167x167.png", 167],
  ["apple-touch-icon-180x180.png", 180],
  ["pwa-icon-192x192.png", 192],
  ["pwa-icon-256x256.png", 256],
  ["pwa-icon-384x384.png", 384],
  ["pwa-icon-512x512.png", 512],
];

const SVG_TAGS = {
  Path: "path",
  Ellipse: "ellipse",
  Circle: "circle",
  Rect: "rect",
  Polygon: "polygon",
  G: "g",
};

async function registeredAnimals() {
  const index = await readFile(path.join(animalsDir, "index.ts"), "utf8");
  const registry = /const Animals = \{([^}]*)\}/.exec(index);
  if (!registry) {
    throw new Error(
      "Could not find the Animals registry in src/Animals/index.ts"
    );
  }
  return registry[1]
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

// The animal components are static react-native-svg markup, which is plain SVG
// once the JSX is rewritten.
async function animalSvg(name, size) {
  const tsx = await readFile(path.join(animalsDir, `${name}.tsx`), "utf8");
  const start = tsx.indexOf("<Svg");
  const end = tsx.lastIndexOf("</Svg>");
  if (start < 0 || end < 0) {
    throw new Error(`${name}.tsx has no <Svg> element`);
  }
  const markup = tsx.slice(start, end);
  const rootEnd = markup.indexOf(">");
  const viewBox = /viewBox="([^"]+)"/.exec(markup.slice(0, rootEnd))?.[1];
  if (!viewBox) {
    throw new Error(`${name}.tsx has no viewBox`);
  }
  const children = markup
    .slice(rootEnd + 1)
    .replace(/<(\/?)([A-Z][A-Za-z]*)/g, (_, slash, tag) => {
      if (!SVG_TAGS[tag]) {
        throw new Error(
          `${name}.tsx uses <${tag}>, which this script can't convert`
        );
      }
      return `<${slash}${SVG_TAGS[tag]}`;
    })
    .replace(/=\{"([^"]*)"\}/g, '="$1"')
    .replace(/=\{([^}]*)\}/g, '="$1"')
    .replace(
      /\s([a-z]+[A-Z][A-Za-z]*)=/g,
      (_, attr) => ` ${attr.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}=`
    );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}">${children}</svg>`;
}

async function renderWood() {
  const { width, height } = await sharp(woodPath).metadata();
  const side = Math.min(width, height);
  const square = sharp(woodPath)
    .extract({
      left: Math.floor((width - side) / 2),
      top: Math.floor((height - side) / 2),
      width: side,
      height: side,
    })
    .resize(SIZE, SIZE, { kernel: "lanczos3" });
  const [plain, blurred] = await Promise.all([
    square.clone().raw().toBuffer({ resolveWithObject: true }),
    square
      .clone()
      .blur(WOOD_SHARPEN.sigma)
      .raw()
      .toBuffer({ resolveWithObject: true }),
  ]);
  if (plain.info.channels !== 3) {
    throw new Error(
      `Expected an RGB wood texture, got ${plain.info.channels} channels`
    );
  }
  const pixels = Buffer.alloc(plain.data.length);
  for (let i = 0; i < pixels.length; i++) {
    const gain = WOOD_GAIN[i % 3];
    const value = gain * plain.data[i];
    const sharpened =
      value + WOOD_SHARPEN.amount * (value - gain * blurred.data[i]);
    const contrasted =
      WOOD_CONTRAST.slope * sharpened + WOOD_CONTRAST.intercept * 255;
    pixels[i] = Math.max(0, Math.min(255, Math.round(contrasted)));
  }
  return sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 3 } })
    .png()
    .toBuffer();
}

async function renderIcon(wood, name) {
  const svg = await animalSvg(name, ART_SIZE);
  const art = new Resvg(svg, { fitTo: { mode: "width", value: ART_SIZE } })
    .render()
    .asPng();
  const inset = (SIZE - ART_SIZE) / 2;
  return sharp(wood)
    .composite([{ input: art, left: inset, top: inset + ART_OFFSET_Y }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const resized = (icon, pixels, png = { compressionLevel: 9 }) =>
  sharp(icon)
    .resize(pixels, pixels, { kernel: "lanczos3" })
    .png(png)
    .toBuffer();

// Browsers fetch these on every visit, so they are quantized to a palette.
const webIcon = (icon, pixels) =>
  resized(icon, pixels, { compressionLevel: 9, palette: true, quality: 90 });

async function writeAlternateIconSet(icon, name) {
  const dir = path.join(alternatesDir, `${name}.appiconset`);
  await mkdir(dir, { recursive: true });
  const images = [];
  for (const { idiom, size, scale } of ALTERNATE_SIZES) {
    const filename = `${idiom}-${size}@${scale}x.png`;
    await writeFile(
      path.join(dir, filename),
      await resized(icon, Math.round(size * scale))
    );
    images.push({
      filename,
      idiom,
      scale: `${scale}x`,
      size: `${size}x${size}`,
    });
  }
  const contents = { images, info: { author: "xcode", version: 1 } };
  await writeFile(
    path.join(dir, "Contents.json"),
    `${JSON.stringify(contents, null, 2)}\n`
  );
}

const animals = await registeredAnimals();
if (!animals.includes(defaultAppIcon)) {
  throw new Error(
    `The default app icon "${defaultAppIcon}" is not a registered animal`
  );
}
const wood = await renderWood();
await rm(alternatesDir, { recursive: true, force: true });
for (const name of animals) {
  const icon = await renderIcon(wood, name);
  if (name === defaultAppIcon) {
    await writeFile(path.join(appIconsDir, "Icon-App-1024x1024.png"), icon);
    for (const [filename, pixels] of WEB_ICONS) {
      await writeFile(
        path.join(webIconsDir, filename),
        await webIcon(icon, pixels)
      );
    }
    console.log(`${name} (primary + web icons)`);
  } else {
    await writeAlternateIconSet(icon, name);
    console.log(name);
  }
}
console.log(`\n${animals.length} icons written`);
