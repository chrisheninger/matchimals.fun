// Renders the physical 38-card deck for DriveThruCards and assembles their
// required upload format: one PDF per deck, pages alternating back, face,
// back, face in deck order, US Poker size (2.75" × 3.75" with bleed, trim
// 2.5" × 3.5"), 300 DPI, DeviceCMYK with ≤240% total ink, PDF/X-1a:2003.
//
//   bun run print:cards
//
// Outputs (gitignored):
//   print/matchimals-deck.pdf    the 38-card deck (order this for real runs)
//   print/matchimals-proof.pdf   deck + 2 color-calibration cards (order this
//                                as the first proof; the extra cards turn the
//                                proof into a color-matching instrument)
//   print/preview/*.png          per-face previews and review montages (sRGB)
//   print/README.md              upload checklist
//
// The deck: card 1 = How to play / Scoring, card 2 = animal legend / QR to
// www.matchimals.com, then two copies of each of the 18 designs. Faces are
// rendered from the same components the app uses (react-dom/server renders
// the svgs-based markup), so print matches the game by construction.
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import QRCode from "qrcode";

import Animals from "../src/Animals";
import Logo from "../src/Logo";
import { animals } from "../src/constants/animals";
import { colors } from "../src/constants/colors";
import { deck } from "../src/constants/cards";
import type { Card } from "../src/constants/cards";

const root = path.resolve(import.meta.dirname, "..");
const OUT = path.join(root, "print");
const PREVIEW = path.join(OUT, "preview");

const SITE_URL = "https://www.matchimals.com";
const SITE_LABEL = "www.matchimals.com";

// ---- DriveThruCards US Poker geometry (spec as of Aug 2026) ----
const DPI = 300;
const TRIM_W = 2.5 * DPI; // 750
const TRIM_H = 3.5 * DPI; // 1050
const BLEED = 0.125 * DPI; // 37.5 per side
const W = TRIM_W + BLEED * 2; // 825
const H = TRIM_H + BLEED * 2; // 1125
const SAFE = BLEED * 2; // keep content ≥ 1/8" inside the trim line
const S = TRIM_W / 100; // app card units (100×140) → print px
const CX = W / 2;
const CY = H / 2;
const ANIMAL = 60 * S;
const CORNER_R = 8 * S; // previews only; the die radius is the printer's

// Dimbo metrics (from fontkit): cap height 1508 / 2048 units per em.
const DIMBO = path.join(root, "assets/fonts/Dimbo.ttf");
const CAP = 1508 / 2048;
const FONT = {
  fontFiles: [DIMBO],
  loadSystemFonts: false,
  defaultFontFamily: "Dimbo",
};

const PAPER = "#FDFAF3";
const INK = colors.grayDark;

// ---- svg helpers ----
const svgOpen = (w: number, h: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Re-target a rendered <svg> root to a position/size, keeping its viewBox and
// children untouched. Optionally override the viewBox (used to crop nested
// card faces to their trim area).
function placeSvg(
  markup: string,
  x: number,
  y: number,
  w: number,
  h: number,
  viewBox?: string
) {
  return markup.replace(
    /^<svg[^>]*viewBox="([^"]+)"[^>]*>/,
    (_, vb) =>
      `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${
        viewBox ?? vb
      }">`
  );
}

function text(
  x: number,
  yTop: number,
  size: number,
  fill: string,
  anchor: "start" | "middle" | "end",
  s: string
) {
  const baseline = yTop + CAP * size;
  return `<text x="${x}" y="${baseline}" font-family="Dimbo" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${esc(
    s
  )}</text>`;
}

// White text with the game's 1px-at-card-scale drop shadow.
function shadowText(
  x: number,
  yTop: number,
  size: number,
  anchor: "start" | "middle" | "end",
  s: string,
  shadow = S
) {
  const baseline = yTop + CAP * size;
  const attrs = (fill: string) =>
    `font-family="Dimbo" font-size="${size}" fill="${fill}" text-anchor="${anchor}"`;
  return (
    `<text x="${x + shadow}" y="${baseline + shadow}" ${attrs(
      "rgba(0,0,0,0.69)"
    )}>${esc(s)}</text>` +
    `<text x="${x}" y="${baseline}" ${attrs("#ffffff")}>${esc(s)}</text>`
  );
}

function lines(
  x: number,
  yTop: number,
  size: number,
  lineHeight: number,
  fill: string,
  anchor: "start" | "middle" | "end",
  content: string[]
) {
  return content
    .map((line, i) => text(x, yTop + i * lineHeight, size, fill, anchor, line))
    .join("");
}

const animalMarkup = new Map<number, string>();
function animalAt(id: number, cx: number, cy: number, size = ANIMAL) {
  if (!animalMarkup.has(id)) {
    animalMarkup.set(
      id,
      renderToStaticMarkup(React.createElement(Animals[animals[id].animal]))
    );
  }
  return placeSvg(
    animalMarkup.get(id)!,
    cx - size / 2,
    cy - size / 2,
    size,
    size
  );
}

// ---- game card face ----
// Four edge-color quadrants drawn as sectors from the card center through the
// TRIM corners, extended past the bleed rect (the canvas clips), so the
// visible diagonals land exactly on the trim corners like in the app.
function quadrants(card: Card) {
  const TL = [BLEED, BLEED];
  const TR = [W - BLEED, BLEED];
  const BR = [W - BLEED, H - BLEED];
  const BL = [BLEED, H - BLEED];
  const ext = ([x, y]: number[]) => `${CX + (x - CX) * 3},${CY + (y - CY) * 3}`;
  const quad = (a: number[], b: number[], fill: string) =>
    `<polygon points="${CX},${CY} ${ext(a)} ${ext(b)}" fill="${fill}"/>`;
  return [
    quad(TL, TR, animals[card.top].color),
    quad(TR, BR, animals[card.right].color),
    quad(BR, BL, animals[card.bottom].color),
    quad(BL, TL, animals[card.left].color),
  ].join("");
}

// Score digits on the right and bottom edges only, matching CardFront — that
// placement guarantees exactly one score is visible at every matched seam.
function cardFaceSvg(card: Card) {
  const fs = 13.125 * S;
  return (
    svgOpen(W, H) +
    quadrants(card) +
    shadowText(
      BLEED + 83.125 * S,
      BLEED + 28 * S,
      fs,
      "start",
      String(animals[card.right].score)
    ) +
    shadowText(
      CX,
      BLEED + 95 * S,
      fs,
      "middle",
      String(animals[card.bottom].score)
    ) +
    animalAt(card.top, CX, BLEED) +
    animalAt(card.right, W - BLEED, CY) +
    animalAt(card.bottom, CX, H - BLEED) +
    animalAt(card.left, BLEED, CY) +
    `</svg>`
  );
}

// ---- card back: the app's low-poly mosaic regenerated at print resolution,
// ---- sampling colors from the original card-back.png so the flow matches.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let mosaicCache: string | null = null;
async function mosaicSvg(withLogo: boolean): Promise<string> {
  if (mosaicCache === null) {
    const { data, info } = await sharp(
      path.join(root, "src/Card/card-back.png")
    )
      .raw()
      .toBuffer({ resolveWithObject: true });
    const sample = (x: number, y: number) => {
      const ox = Math.min(
        info.width - 1,
        Math.max(0, Math.round((x / W) * info.width))
      );
      const oy = Math.min(
        info.height - 1,
        Math.max(0, Math.round((y / H) * info.height))
      );
      const i = (oy * info.width + ox) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const rand = mulberry32(20260823);
    const cell = 57;
    const cols = Math.ceil(W / cell) + 2;
    const rows = Math.ceil(H / cell) + 2;
    const px: number[][] = [];
    const py: number[][] = [];
    for (let r = 0; r <= rows; r++) {
      px[r] = [];
      py[r] = [];
      for (let c = 0; c <= cols; c++) {
        px[r][c] = (c - 1) * cell + (rand() * 2 - 1) * 0.45 * cell;
        py[r][c] = (r - 1) * cell + (rand() * 2 - 1) * 0.45 * cell;
      }
    }
    const tris: string[] = [];
    const tri = (a: number[], b: number[], c: number[]) => {
      const cx = (a[0] + b[0] + c[0]) / 3;
      const cy = (a[1] + b[1] + c[1]) / 3;
      const jitter = 1 + (rand() * 2 - 1) * 0.05;
      const [rr, gg, bb] = sample(cx, cy).map((v) =>
        Math.max(0, Math.min(255, Math.round(v * jitter)))
      );
      // Self-stroke so antialiasing between neighbors never shows a hairline.
      tris.push(
        `<polygon points="${a},${b},${c}" fill="rgb(${rr},${gg},${bb})" stroke="rgb(${rr},${gg},${bb})" stroke-width="2"/>`
      );
    };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p00 = [px[r][c], py[r][c]];
        const p10 = [px[r][c + 1], py[r][c + 1]];
        const p01 = [px[r + 1][c], py[r + 1][c]];
        const p11 = [px[r + 1][c + 1], py[r + 1][c + 1]];
        if (rand() < 0.5) {
          tri(p00, p10, p11);
          tri(p00, p11, p01);
        } else {
          tri(p10, p11, p01);
          tri(p10, p01, p00);
        }
      }
    }
    mosaicCache =
      `<rect width="${W}" height="${H}" fill="#ffffff"/>` + tris.join("");
  }
  let body = mosaicCache;
  if (withLogo) {
    const logoW = 84 * S;
    const logoH = logoW * (320 / 1304);
    body += placeSvg(
      renderToStaticMarkup(React.createElement(Logo, { width: logoW })),
      CX - logoW / 2,
      CY - logoH / 2,
      logoW,
      logoH
    );
  }
  return svgOpen(W, H) + body + `</svg>`;
}

// Soft quadrant wash behind the rules text — a quiet echo of the card faces.
function rulesBackground() {
  const wash = [
    colors.redMedium,
    colors.blueMedium,
    colors.greenMedium,
    colors.yellowLight,
  ];
  const TL = [BLEED, BLEED];
  const TR = [W - BLEED, BLEED];
  const BR = [W - BLEED, H - BLEED];
  const BL = [BLEED, H - BLEED];
  const ext = ([x, y]: number[]) => `${CX + (x - CX) * 3},${CY + (y - CY) * 3}`;
  const quad = (a: number[], b: number[], fill: string) =>
    `<polygon points="${CX},${CY} ${ext(a)} ${ext(
      b
    )}" fill="${fill}" opacity="0.07"/>`;
  return (
    `<rect width="${W}" height="${H}" fill="${PAPER}"/>` +
    quad(TL, TR, wash[0]) +
    quad(TR, BR, wash[1]) +
    quad(BR, BL, wash[2]) +
    quad(BL, TL, wash[3])
  );
}

// A game card face nested at mini scale, cropped to trim, rounded corners.
let miniClipId = 0;
function miniCard(card: Card, x: number, y: number, w: number) {
  const h = w * (TRIM_H / TRIM_W);
  const r = CORNER_R * (w / TRIM_W);
  const id = `mini${miniClipId++}`;
  return (
    `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}"/></clipPath>` +
    `<g clip-path="url(#${id})">` +
    placeSvg(
      cardFaceSvg(card),
      x,
      y,
      w,
      h,
      `${BLEED} ${BLEED} ${TRIM_W} ${TRIM_H}`
    ) +
    `</g>`
  );
}

// ---- rules card faces ----
function heading(yTop: number, s: string, fill = colors.redMedium, size = 40) {
  return text(CX, yTop, size, fill, "middle", s);
}

function rulesHowToPlay(): string {
  const body = (yTop: number, content: string[]) =>
    lines(CX, yTop, 34, 46, INK, "middle", content);
  return (
    svgOpen(W, H) +
    rulesBackground() +
    text(CX, 120, 64, INK, "middle", "HOW TO PLAY") +
    text(
      CX,
      196,
      30,
      colors.blueDark,
      "middle",
      "a matching game for 2 players"
    ) +
    heading(288, "SETUP", colors.redMedium) +
    body(344, [
      "Shuffle all 36 cards into one",
      "face-down deck, then flip the top",
      "card into the middle of the table.",
    ]) +
    heading(520, "ON YOUR TURN", colors.blueMedium) +
    body(576, [
      "Flip the top card of the deck",
      "face up and add it to the table.",
      "It must touch at least one card,",
      "and every edge that touches a",
      "neighbor must match — the two",
      "halves make the whole animal!",
    ]) +
    heading(890, "CAN'T PLAY IT?", colors.greenMedium) +
    body(946, ["Slide the card under the deck.", "Your turn is over."]) +
    `</svg>`
  );
}

function rulesScoring(): string {
  const body = (yTop: number, content: string[]) =>
    lines(CX, yTop, 34, 46, INK, "middle", content);
  const miniW = 225;
  const miniH = miniW * (TRIM_H / TRIM_W);
  const gap = 8;
  const mx = CX - miniW - gap / 2;
  const my = 210;
  return (
    svgOpen(W, H) +
    rulesBackground() +
    text(CX, 120, 64, INK, "middle", "SCORING") +
    miniCard(deck[0], mx, my, miniW) +
    miniCard(deck[13], mx + miniW + gap, my, miniW) +
    body(my + miniH + 40, [
      "Every edge you match scores that",
      "animal's number, shown right at",
      "the edge. Add them up and keep",
      "a running total on paper.",
    ]) +
    heading(830, "GAME OVER", colors.blueMedium) +
    body(886, [
      "When the deck runs out, or no",
      "card can be played, the highest",
      "total wins!",
    ]) +
    `</svg>`
  );
}

function rulesLegend(): string {
  const ids = Object.keys(animals)
    .map(Number)
    .sort((a, b) => a - b);
  const cols = 4;
  const cellW = 160;
  const cellH = 112;
  const gap = 8;
  const gridW = cols * cellW + (cols - 1) * gap;
  const x0 = (W - gridW) / 2;
  const y0 = 190;
  const cells = ids
    .map((id, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = x0 + col * (cellW + gap);
      const y = y0 + row * (cellH + gap);
      return (
        `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="14" ry="14" fill="${animals[id].color}"/>` +
        animalAt(id, x + 50, y + cellH / 2, 76) +
        shadowText(
          x + 122,
          y + (cellH - CAP * 40) / 2,
          40,
          "middle",
          String(animals[id].score),
          3
        )
      );
    })
    .join("");
  return (
    svgOpen(W, H) +
    `<rect width="${W}" height="${H}" fill="${PAPER}"/>` +
    text(CX, 105, 54, INK, "middle", "THE ANIMALS") +
    cells +
    `</svg>`
  );
}

async function rulesQr(): Promise<{
  svg: string;
  qrRect: [number, number, number, number];
}> {
  const qrSvg = await QRCode.toString(SITE_URL, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
  const logoW = 84 * S;
  const logoH = logoW * (320 / 1304);
  const panel = { x: 112, y: 430, w: W - 224, h: 580 };
  const qr = { size: 330, x: CX - 165, y: 560 };
  return {
    svg:
      (await mosaicSvg(false)).replace("</svg>", "") +
      placeSvg(
        renderToStaticMarkup(React.createElement(Logo, { width: logoW })),
        CX - logoW / 2,
        200,
        logoW,
        logoH
      ) +
      `<rect x="${panel.x}" y="${panel.y}" width="${panel.w}" height="${panel.h}" rx="24" ry="24" fill="#ffffff"/>` +
      text(CX, 470, 44, colors.blueDark, "middle", "PLAY IT ANYWHERE") +
      placeSvg(qrSvg, qr.x, qr.y, qr.size, qr.size) +
      text(CX, 930, 36, INK, "middle", SITE_LABEL) +
      `</svg>`,
    qrRect: [qr.x, qr.y, qr.size, qr.size],
  };
}

// ---- calibration cards (proof PDF only) ----
type RegionOp =
  | {
      rect: [number, number, number, number];
      op: "cmyk";
      value: [number, number, number, number];
    }
  | { rect: [number, number, number, number]; op: "scaleInk"; factor: number }
  | { rect: [number, number, number, number]; op: "pureK" };

type CalCard = { svg: string; ops: RegionOp[] };

const PALETTE_NAMES = Object.keys(colors) as (keyof typeof colors)[];

function calPalette(): CalCard {
  const ops: RegionOp[] = [];
  const rows = PALETTE_NAMES.length + 1;
  const rowH = 50;
  const rowGap = 3;
  const y0 = 176;
  const labelX = 80;
  const patchX = 250;
  const patchW = 105;
  const patchGap = 8;
  let body =
    `<rect width="${W}" height="${H}" fill="#ffffff"/>` +
    text(CX, 84, 40, INK, "middle", "PROOF COLOR CHECK") +
    text(
      CX,
      136,
      24,
      INK,
      "middle",
      "A = as printed · B = 90% ink · C = 80% ink · D = pure hue"
    );
  PALETTE_NAMES.forEach((name, r) => {
    const y = y0 + r * (rowH + rowGap);
    body += text(labelX, y + (rowH - CAP * 24) / 2, 24, INK, "start", name);
    for (let v = 0; v < 4; v++) {
      const x = patchX + v * (patchW + patchGap);
      body += `<rect x="${x}" y="${y}" width="${patchW}" height="${rowH}" fill="${colors[name]}"/>`;
      const base = rgbHexToCmyk(colors[name]);
      const value: [number, number, number, number] =
        v === 0
          ? base
          : v === 1
          ? scaleCmyk(base, 0.9)
          : v === 2
          ? scaleCmyk(base, 0.8)
          : pureHue(base);
      ops.push({ rect: [x, y, patchW, rowH], op: "cmyk", value });
    }
  });
  const y = y0 + PALETTE_NAMES.length * (rowH + rowGap);
  body += text(labelX, y + (rowH - CAP * 24) / 2, 24, INK, "start", "black");
  const blacks: [number, number, number, number][] = [
    rgbHexToCmyk(colors.grayDark),
    [0.6, 0.4, 0.4, 1],
    [0, 0, 0, 1],
  ];
  const blackLabels = ["art", "60/40/40/100", "K only"];
  blacks.forEach((value, v) => {
    const x = patchX + v * (patchW + patchGap);
    body += `<rect x="${x}" y="${y}" width="${patchW}" height="${rowH}" fill="#17171b"/>`;
    body += text(
      x + patchW / 2,
      y + rowH + 6,
      18,
      INK,
      "middle",
      blackLabels[v]
    );
    ops.push({ rect: [x, y, patchW, rowH], op: "cmyk", value });
  });
  return { svg: svgOpen(W, H) + body + `</svg>`, ops };
}

async function calContext(): Promise<CalCard> {
  const miniW = 240;
  const miniH = miniW * (TRIM_H / TRIM_W);
  const leftX = CX - miniW - 20;
  const rightX = CX + 20;
  const miniY = 160;
  const qrSvg = await QRCode.toString(SITE_URL, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
  const qr = { size: 170, x: CX - 85, y: 856 };
  const chipY = 560;
  const chips = [colors.yellowLight, colors.greenLight, colors.blueLight];
  const hairY = 700;
  let body =
    `<rect width="${W}" height="${H}" fill="#ffffff"/>` +
    text(CX, 84, 40, INK, "middle", "PROOF CHECKS") +
    text(leftX + miniW / 2, miniY - 34, 24, INK, "middle", "100% ink") +
    text(rightX + miniW / 2, miniY - 34, 24, INK, "middle", "90% ink") +
    miniCard(deck[4], leftX, miniY, miniW) +
    miniCard(deck[4], rightX, miniY, miniW) +
    text(
      80,
      chipY - 40,
      24,
      INK,
      "start",
      "white score digits on light colors"
    ) +
    chips
      .map(
        (c, i) =>
          `<rect x="${
            80 + i * 230
          }" y="${chipY}" width="210" height="80" rx="12" fill="${c}"/>` +
          shadowText(
            80 + i * 230 + 105,
            chipY + (80 - CAP * 40) / 2,
            40,
            "middle",
            "10",
            3
          )
      )
      .join("") +
    text(
      80,
      hairY - 36,
      24,
      INK,
      "start",
      "fine lines: 0.5 / 0.75 / 1 / 1.5 px"
    ) +
    [0.5, 0.75, 1, 1.5]
      .map(
        (wd, i) =>
          `<rect x="80" y="${
            hairY + i * 22
          }" width="640" height="${wd}" fill="${INK}"/>`
      )
      .join("") +
    text(80, 812, 24, INK, "start", "Dimbo 24") +
    text(220, 806, 28, INK, "start", "Dimbo 28") +
    text(380, 800, 34, INK, "start", "Dimbo 34") +
    placeSvg(qrSvg, qr.x, qr.y, qr.size, qr.size) +
    text(CX + 110, qr.y + 60, 24, INK, "start", "scan me");
  return {
    svg: svgOpen(W, H) + body + `</svg>`,
    ops: [
      {
        rect: [rightX, miniY, miniW, Math.ceil(miniH)],
        op: "scaleInk",
        factor: 0.9,
      },
      { rect: [qr.x, qr.y, qr.size, qr.size], op: "pureK" },
    ],
  };
}

// ---- color: sRGB → DeviceCMYK ----
// GCR-style conversion tuned for this flat pastel art: black is generated only
// past 30% neutral density, deep shadows blend toward DriveThru's rich-black
// recipe (C60 M40 Y40 K100), and total ink is clamped to their 240% limit.
const TAC_LIMIT = 2.4;

function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function rgbToCmyk(
  r: number,
  g: number,
  b: number
): [number, number, number, number] {
  const c0 = 1 - r / 255;
  const m0 = 1 - g / 255;
  const y0 = 1 - b / 255;
  const k = Math.min(c0, m0, y0);
  const START = 0.3;
  let K = k <= START ? 0 : Math.pow((k - START) / (1 - START), 1.2);
  const denom = 1 - K;
  let c = denom < 1e-6 ? 0 : (c0 - K) / denom;
  let m = denom < 1e-6 ? 0 : (m0 - K) / denom;
  let y = denom < 1e-6 ? 0 : (y0 - K) / denom;
  c = Math.max(0, Math.min(1, c));
  m = Math.max(0, Math.min(1, m));
  y = Math.max(0, Math.min(1, y));
  const t = smoothstep(0.8, 1, k);
  if (t > 0) {
    c = c + (0.6 - c) * t;
    m = m + (0.4 - m) * t;
    y = y + (0.4 - y) * t;
    K = K + (1 - K) * t;
  }
  const tac = c + m + y + K;
  if (tac > TAC_LIMIT) {
    const scale = (TAC_LIMIT - K) / (c + m + y);
    c *= scale;
    m *= scale;
    y *= scale;
  }
  return [c, m, y, K];
}

function rgbHexToCmyk(hex: string): [number, number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return rgbToCmyk((n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
}

const scaleCmyk = (
  v: [number, number, number, number],
  f: number
): [number, number, number, number] => [v[0] * f, v[1] * f, v[2] * f, v[3] * f];

// Drop the smallest chromatic channel — a cleaner hue at slightly lower ink.
function pureHue(
  v: [number, number, number, number]
): [number, number, number, number] {
  const min = Math.min(v[0], v[1], v[2]);
  return [
    v[0] === min ? 0 : v[0],
    v[1] === min ? 0 : v[1],
    v[2] === min ? 0 : v[2],
    v[3],
  ];
}

// ---- raster pipeline ----
function rasterize(svg: string): {
  rgba: Buffer;
  width: number;
  height: number;
} {
  const rendered = new Resvg(svg, { font: FONT }).render();
  return {
    rgba: Buffer.from(rendered.pixels),
    width: rendered.width,
    height: rendered.height,
  };
}

// Flatten onto white and convert every pixel to CMYK ink bytes.
function toCmykBytes(rgba: Buffer, width: number, height: number): Buffer {
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0, o = 0; i < rgba.length; i += 4, o += 4) {
    const a = rgba[i + 3] / 255;
    const r = Math.round(rgba[i] * a + 255 * (1 - a));
    const g = Math.round(rgba[i + 1] * a + 255 * (1 - a));
    const b = Math.round(rgba[i + 2] * a + 255 * (1 - a));
    const [c, m, y, k] = rgbToCmyk(r, g, b);
    out[o] = Math.round(c * 255);
    out[o + 1] = Math.round(m * 255);
    out[o + 2] = Math.round(y * 255);
    out[o + 3] = Math.round(k * 255);
    // Byte rounding can nudge a pixel a hair over the 240% limit (612 ink
    // bytes) — shave the heaviest chromatic channel until it complies.
    let sum = out[o] + out[o + 1] + out[o + 2] + out[o + 3];
    while (sum > 612) {
      const heaviest =
        out[o] >= out[o + 1] && out[o] >= out[o + 2]
          ? o
          : out[o + 1] >= out[o + 2]
          ? o + 1
          : o + 2;
      out[heaviest]--;
      sum--;
    }
  }
  return out;
}

function applyOps(cmyk: Buffer, width: number, ops: RegionOp[]) {
  for (const { rect, op, ...rest } of ops) {
    const [rx, ry, rw, rh] = rect.map(Math.round);
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        const o = (y * width + x) * 4;
        if (op === "cmyk") {
          const value = (rest as { value: [number, number, number, number] })
            .value;
          cmyk[o] = Math.round(value[0] * 255);
          cmyk[o + 1] = Math.round(value[1] * 255);
          cmyk[o + 2] = Math.round(value[2] * 255);
          cmyk[o + 3] = Math.round(value[3] * 255);
        } else if (op === "scaleInk") {
          const factor = (rest as { factor: number }).factor;
          cmyk[o] = Math.round(cmyk[o] * factor);
          cmyk[o + 1] = Math.round(cmyk[o + 1] * factor);
          cmyk[o + 2] = Math.round(cmyk[o + 2] * factor);
          cmyk[o + 3] = Math.round(cmyk[o + 3] * factor);
        } else {
          const dark = cmyk[o] + cmyk[o + 1] + cmyk[o + 2] + cmyk[o + 3] > 300;
          cmyk[o] = 0;
          cmyk[o + 1] = 0;
          cmyk[o + 2] = 0;
          cmyk[o + 3] = dark ? 255 : 0;
        }
      }
    }
  }
}

function maxTac(cmyk: Buffer): number {
  let max = 0;
  for (let i = 0; i < cmyk.length; i += 4) {
    const tac = cmyk[i] + cmyk[i + 1] + cmyk[i + 2] + cmyk[i + 3];
    if (tac > max) max = tac;
  }
  return (max / 255) * 100;
}

// ---- minimal PDF/X-1a:2003 writer ----
// Raster-only pages (no fonts, no transparency, DeviceCMYK images), OutputIntent
// referencing the registered CGATS TR 001 condition, TrimBox 2.5"×3.5" centered.
class PdfWriter {
  private chunks: Buffer[] = [];
  private offsets: number[] = [0]; // object 0 is the free head
  private length = 0;

  private push(data: Buffer | string) {
    const buf = typeof data === "string" ? Buffer.from(data, "latin1") : data;
    this.chunks.push(buf);
    this.length += buf.length;
  }

  // Reserve an object number without writing it yet.
  reserve(): number {
    this.offsets.push(-1);
    return this.offsets.length - 1;
  }

  beginObject(id?: number): number {
    const num = id ?? this.reserve();
    this.offsets[num] = this.length;
    this.push(`${num} 0 obj\n`);
    return num;
  }

  endObject() {
    this.push("endobj\n");
  }

  dict(body: string) {
    this.push(`<< ${body} >>\n`);
  }

  stream(dictBody: string, data: Buffer) {
    this.push(`<< ${dictBody} /Length ${data.length} >>\nstream\n`);
    this.push(data);
    this.push("\nendstream\n");
  }

  header() {
    this.push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  }

  finish(rootId: number, infoId: number) {
    const xrefOffset = this.length;
    const count = this.offsets.length;
    let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
    for (let i = 1; i < count; i++) {
      xref += `${String(this.offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    this.push(xref);
    const id = createHash("md5")
      .update(Buffer.concat(this.chunks))
      .digest("hex")
      .toUpperCase();
    this.push(
      `trailer\n<< /Size ${count} /Root ${rootId} 0 R /Info ${infoId} 0 R /ID [<${id}> <${id}>] >>\nstartxref\n${xrefOffset}\n%%EOF\n`
    );
    return Buffer.concat(this.chunks);
  }
}

const PT_W = 2.75 * 72; // 198
const PT_H = 3.75 * 72; // 270
const PT_BLEED = 0.125 * 72; // 9

function buildPdf(
  title: string,
  pages: { imageKey: string }[],
  images: Map<string, Buffer>
): Buffer {
  const pdf = new PdfWriter();
  pdf.header();

  // Shared page content: paint the page's sole image across the full bleed box.
  const contentData = Buffer.from(
    `q ${PT_W} 0 0 ${PT_H} 0 0 cm /Im Do Q`,
    "latin1"
  );
  const contentId = pdf.beginObject();
  pdf.stream("", contentData);
  pdf.endObject();

  const imageIds = new Map<string, number>();
  for (const [key, cmyk] of images) {
    const data = deflateSync(cmyk, { level: 9 });
    const id = pdf.beginObject();
    pdf.stream(
      `/Type /XObject /Subtype /Image /Width ${W} /Height ${H} ` +
        `/ColorSpace /DeviceCMYK /BitsPerComponent 8 /Filter /FlateDecode`,
      data
    );
    pdf.endObject();
    imageIds.set(key, id);
  }

  const pagesId = pdf.reserve();
  const pageIds = pages.map(({ imageKey }) => {
    const id = pdf.beginObject();
    pdf.dict(
      `/Type /Page /Parent ${pagesId} 0 R ` +
        `/MediaBox [0 0 ${PT_W} ${PT_H}] /BleedBox [0 0 ${PT_W} ${PT_H}] ` +
        `/TrimBox [${PT_BLEED} ${PT_BLEED} ${PT_W - PT_BLEED} ${
          PT_H - PT_BLEED
        }] ` +
        `/Resources << /XObject << /Im ${imageIds.get(imageKey)} 0 R >> >> ` +
        `/Contents ${contentId} 0 R`
    );
    pdf.endObject();
    return id;
  });

  pdf.beginObject(pagesId);
  pdf.dict(
    `/Type /Pages /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] /Count ${pageIds.length}`
  );
  pdf.endObject();

  const outputIntentId = pdf.beginObject();
  pdf.dict(
    `/Type /OutputIntent /S /GTS_PDFX ` +
      `/OutputConditionIdentifier (CGATS TR 001) /RegistryName (http://www.color.org) ` +
      `/Info (U.S. Web Coated \\(SWOP\\) v2)`
  );
  pdf.endObject();

  const rootId = pdf.beginObject();
  pdf.dict(
    `/Type /Catalog /Pages ${pagesId} 0 R /OutputIntents [${outputIntentId} 0 R]`
  );
  pdf.endObject();

  const date = "D:20260823000000+00'00'";
  const infoId = pdf.beginObject();
  pdf.dict(
    `/Title (${title}) /Creator (matchimals.fun print pipeline) /Producer (scripts/print-cards.tsx) ` +
      `/CreationDate (${date}) /ModDate (${date}) /Trapped /False ` +
      `/GTS_PDFXVersion (PDF/X-1a:2003)`
  );
  pdf.endObject();

  return pdf.finish(rootId, infoId);
}

// ---- previews ----
async function trimmedPreview(svg: string): Promise<Buffer> {
  const png = new Resvg(svg, { font: FONT }).render().asPng();
  const mask = Buffer.from(
    `<svg width="${TRIM_W}" height="${TRIM_H}"><rect width="${TRIM_W}" height="${TRIM_H}" rx="${CORNER_R}" ry="${CORNER_R}" fill="#fff"/></svg>`
  );
  return sharp(png)
    .extract({
      left: Math.round(BLEED),
      top: Math.round(BLEED),
      width: TRIM_W,
      height: TRIM_H,
    })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function montage(
  tiles: Buffer[],
  cols: number,
  tileW: number
): Promise<Buffer> {
  const tileH = Math.round(tileW * (TRIM_H / TRIM_W));
  const gap = 14;
  const rows = Math.ceil(tiles.length / cols);
  const thumbs = await Promise.all(
    tiles.map((t) => sharp(t).resize(tileW, tileH).png().toBuffer())
  );
  return sharp({
    create: {
      width: cols * tileW + (cols + 1) * gap,
      height: rows * tileH + (rows + 1) * gap,
      channels: 4,
      background: "#ececec",
    },
  })
    .composite(
      thumbs.map((input, i) => ({
        input,
        left: gap + (i % cols) * (tileW + gap),
        top: gap + Math.floor(i / cols) * (tileH + gap),
      }))
    )
    .png()
    .toBuffer();
}

// ---- main ----
type Sheet = { key: string; svg: string; ops?: RegionOp[] };

async function main() {
  await mkdir(PREVIEW, { recursive: true });

  const back: Sheet = { key: "back", svg: await mosaicSvg(true) };
  const fronts: Sheet[] = deck.map((card, i) => ({
    key: `front-${i}`,
    svg: cardFaceSvg(card),
  }));
  const howTo: Sheet = { key: "rules-how-to-play", svg: rulesHowToPlay() };
  const scoring: Sheet = { key: "rules-scoring", svg: rulesScoring() };
  const legend: Sheet = { key: "rules-legend", svg: rulesLegend() };
  const qrPage = await rulesQr();
  const qr: Sheet = {
    key: "rules-qr",
    svg: qrPage.svg,
    ops: [{ rect: qrPage.qrRect, op: "pureK" }],
  };
  const cal1Data = calPalette();
  const cal2Data = await calContext();
  const cal1: Sheet = {
    key: "cal-palette",
    svg: cal1Data.svg,
    ops: cal1Data.ops,
  };
  const cal2: Sheet = {
    key: "cal-context",
    svg: cal2Data.svg,
    ops: cal2Data.ops,
  };

  // Deck order: rules first, then two copies of each design. DriveThru page
  // order: back of card 1, face of card 1, back of card 2, ...
  const gameCards = [...fronts, ...fronts].map((front) => ({
    back,
    face: front,
  }));
  const deckCards = [
    { back: scoring, face: howTo },
    { back: qr, face: legend },
    ...gameCards,
  ];
  const proofCards = [...deckCards, { back, face: cal1 }, { back, face: cal2 }];

  // Rasterize + convert each unique sheet once.
  const uniqueSheets = new Map<string, Sheet>();
  for (const { back: b, face } of proofCards) {
    uniqueSheets.set(b.key, b);
    uniqueSheets.set(face.key, face);
  }
  const cmykByKey = new Map<string, Buffer>();
  console.log(`Rendering ${uniqueSheets.size} unique sheets…`);
  for (const sheet of uniqueSheets.values()) {
    const { rgba, width, height } = rasterize(sheet.svg);
    if (width !== W || height !== H) {
      throw new Error(
        `${sheet.key}: rendered ${width}×${height}, expected ${W}×${H}`
      );
    }
    const cmyk = toCmykBytes(rgba, width, height);
    if (sheet.ops) applyOps(cmyk, width, sheet.ops);
    const tac = maxTac(cmyk);
    if (tac > 240.5) {
      throw new Error(
        `${sheet.key}: max total ink ${tac.toFixed(1)}% exceeds 240%`
      );
    }
    console.log(`  ${sheet.key}  max ink ${tac.toFixed(1)}%`);
    cmykByKey.set(sheet.key, cmyk);
  }

  const toPages = (cards: { back: Sheet; face: Sheet }[]) =>
    cards.flatMap(({ back: b, face }) => [
      { imageKey: b.key },
      { imageKey: face.key },
    ]);
  const imagesFor = (cards: { back: Sheet; face: Sheet }[]) => {
    const map = new Map<string, Buffer>();
    for (const { back: b, face } of cards) {
      map.set(b.key, cmykByKey.get(b.key)!);
      map.set(face.key, cmykByKey.get(face.key)!);
    }
    return map;
  };

  const deckPdf = buildPdf(
    "Matchimals",
    toPages(deckCards),
    imagesFor(deckCards)
  );
  const proofPdf = buildPdf(
    "Matchimals proof",
    toPages(proofCards),
    imagesFor(proofCards)
  );
  await writeFile(path.join(OUT, "matchimals-deck.pdf"), deckPdf);
  await writeFile(path.join(OUT, "matchimals-proof.pdf"), proofPdf);
  console.log(
    `matchimals-deck.pdf: ${deckCards.length} cards, ${
      deckCards.length * 2
    } pages, ${(deckPdf.length / 1e6).toFixed(1)} MB`
  );
  console.log(
    `matchimals-proof.pdf: ${proofCards.length} cards, ${
      proofCards.length * 2
    } pages, ${(proofPdf.length / 1e6).toFixed(1)} MB`
  );

  // sRGB previews for review (the PDFs hold the CMYK conversions).
  const previewOrder = [
    howTo,
    scoring,
    legend,
    qr,
    back,
    ...fronts,
    cal1,
    cal2,
  ];
  const previews: Buffer[] = [];
  for (const sheet of previewOrder) {
    const png = await trimmedPreview(sheet.svg);
    await writeFile(path.join(PREVIEW, `${sheet.key}.png`), png);
    previews.push(png);
  }
  await writeFile(
    path.join(PREVIEW, "montage.png"),
    await montage(previews, 5, 240)
  );
  console.log(`previews: ${previewOrder.length} faces + montage.png`);

  const readme = `# Print files for DriveThruCards

Generated by \`bun run print:cards\` — do not edit by hand.

- **matchimals-proof.pdf** — order this as the first proof deck. It is the full
  38-card deck plus 2 color-calibration cards (palette variants + in-context
  checks). Compare the printed calibration cards against a screen, pick the
  closest variants, and the script's color conversion gets tuned to match.
- **matchimals-deck.pdf** — the 38-card deck for the real order (no
  calibration cards). Re-proof after any color tuning.

Upload settings (DriveThruCards title setup):
- Card format: US Poker (2.5" × 3.5"), Premium stock
- File: single PDF, pages alternate back, face, back, face in deck order
- Pages are 2.75" × 3.75" (1/8" bleed on all sides), 300 DPI, DeviceCMYK,
  PDF/X-1a:2003, total ink ≤ 240%
- Deck: 38 cards / 76 pages — card 1 = How to play / Scoring, card 2 =
  The animals / QR, then two copies of each of the 18 designs
`;
  await writeFile(path.join(OUT, "README.md"), readme);
}

await main();
