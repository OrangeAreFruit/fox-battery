// SPDX-FileCopyrightText: 2023 Deminder <tremminder@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

// Cartoon fox battery icon rendered as dynamic SVG.
// Geometry mirrors the preview SVGs in preview/fox-*.svg (viewBox 128x64).

const W = 128;
const H = 64;

const CREAM = '#FBF3E7';
const OUTLINE = '#3A2E25';
const BLUSH = '#FFA8C5';
const TEAR = '#60A5FA';

const GREEN = '#34D399'; // charging
const BLUE = '#38BDF8'; // > 20%
const YELLOW = '#FBBF24'; // 10..20%
const RED = '#F87171'; // <= 10%

// Battery body geometry (128x64 viewBox): tall capsule, no ears
const BX = 8;
const BY = 6;
const BW = 112;
const BH = 52;
const BR = 16;
// Fill: full body height, left-aligned, width = percentage of body width
const FILL_X = BX + 4.5;
const FILL_Y = BY + 4.5;
const FILL_MAX_W = BW - 9;
const FILL_H = BH - 9;
const FILL_R = 12;
const CX = 64;
const EYE_Y = 26;
const EYE_DX = 15;
const NOSE = 'M 62 29.5 L 66 29.5 L 64 32 Z';
const MOUTH_Y = 35;
const BLUSH_Y = 29;

const fmt = v => (Math.round(v * 10) / 10).toString();

function frame() {
  return (
    `<rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="${BR}" ` +
    `fill="${CREAM}" stroke="${OUTLINE}" stroke-width="5"/>`
  );
}

function fillBar(p, color) {
  // Minimum width (2 * FILL_R) keeps the left cap fully rounded at low
  // percentages; SVG would otherwise clamp rx to w/2 and leave a flat sliver.
  const w = Math.max(2 * FILL_R, FILL_MAX_W * p);
  const r = Math.min(FILL_R, w / 2);
  return (
    `<rect x="${FILL_X}" y="${FILL_Y}" width="${fmt(w)}" ` +
    `height="${FILL_H}" rx="${fmt(r)}" fill="${color}"/>`
  );
}

function nose() {
  return `<path d="${NOSE}" fill="${OUTLINE}"/>`;
}

function eyes(style) {
  let out = `<g stroke="${OUTLINE}" fill="none" stroke-width="2.5" stroke-linecap="round">`;
  for (const s of [-1, 1]) {
    const ex = CX + s * EYE_DX;
    if (style === 'happy') {
      out += `<path d="M ${fmt(ex - 3.8)} ${EYE_Y} A 3.8 3.8 0 0 1 ${fmt(ex + 3.8)} ${EYE_Y}"/>`;
    } else if (style === 'neutral') {
      out += `<circle cx="${fmt(ex)}" cy="${EYE_Y}" r="2.6" fill="${OUTLINE}" stroke="none"/>`;
    } else if (style === 'concerned') {
      out += `<circle cx="${fmt(ex)}" cy="${EYE_Y}" r="2.0" fill="${OUTLINE}" stroke="none"/>`;
    } else {
      // sad / crying: worried eyes
      out += `<path d="M ${fmt(ex - 2.5)} ${EYE_Y} A 2.5 2.5 0 0 1 ${fmt(ex + 2.5)} ${EYE_Y}"/>`;
    }
  }
  return out + '</g>';
}

function mouth(style) {
  if (style === 'happy')
    return `<g stroke="${OUTLINE}" fill="none" stroke-width="2.5" stroke-linecap="round">` +
      `<path d="M 57.5 ${MOUTH_Y} A 6.5 6.5 0 0 0 70.5 ${MOUTH_Y}"/></g>`;
  if (style === 'neutral')
    return `<g stroke="${OUTLINE}" fill="none" stroke-width="2.5" stroke-linecap="round">` +
      `<path d="M 58.5 ${MOUTH_Y} A 5.5 5.5 0 0 0 69.5 ${MOUTH_Y}"/></g>`;
  if (style === 'concerned')
    return `<g stroke="${OUTLINE}" fill="none" stroke-width="2.5" stroke-linecap="round">` +
      `<path d="M 58 35.5 L 70 35.5"/></g>`;
  if (style === 'sad')
    return `<g stroke="${OUTLINE}" fill="none" stroke-width="2.5" stroke-linecap="round">` +
      `<path d="M 58 ${MOUTH_Y} A 6 6 0 0 1 70 ${MOUTH_Y}"/></g>`;
  // crying: same downturned mouth as sad, tears do the talking
  return `<g stroke="${OUTLINE}" fill="none" stroke-width="2.5" stroke-linecap="round">` +
    `<path d="M 58 ${MOUTH_Y} A 6 6 0 0 1 70 ${MOUTH_Y}"/></g>`;
}

function blush() {
  return (
    `<circle cx="44" cy="${BLUSH_Y}" r="2.3" fill="${BLUSH}"/>` +
    `<circle cx="84" cy="${BLUSH_Y}" r="2.3" fill="${BLUSH}"/>`
  );
}

function tears() {
  // teardrops hanging just below each eye, clear of the worried eye arcs
  const drop = x =>
    `M ${x} 27.5 Q ${x + 4.5} 32 ${x} 35.5 Q ${x - 4.5} 32 ${x} 27.5 Z`;
  return `<path d="${drop(49)}" fill="${TEAR}"/>` + `<path d="${drop(79)}" fill="${TEAR}"/>`;
}

function bolt() {
  // 放大 + 白色描边：顶栏 16px 下充电状态也要一眼可辨
  return (
    `<path d="M 93 21 L 106 21 L 99 30 L 110 30 L 93 45 L 97 35 L 88 35 Z" ` +
    `fill="${OUTLINE}" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>`
  );
}

function faceStyle(charging, percentage) {
  if (charging) return 'happy';
  if (percentage >= 60) return 'happy';
  if (percentage >= 50) return 'neutral';
  if (percentage >= 20) return 'concerned';
  if (percentage >= 10) return 'sad';
  return 'crying';
}

function fillColor(charging, percentage) {
  if (charging) return GREEN;
  if (percentage > 20) return BLUE;
  if (percentage > 10) return YELLOW;
  return RED;
}

/**
 * Generate the fox battery SVG for the given state.
 *
 * @param {Object} opts - icon state
 * @param {number} opts.percentage - battery level in percent (0..100)
 * @param {boolean} opts.charging - whether the battery is charging
 * @param {number} opts.width - rendered width in pixels
 * @param {number} opts.height - rendered height in pixels
 * @returns {string} the SVG document
 */
export function foxSvg({ percentage, charging, width = 128, height = 64 }) {
  const style = faceStyle(charging, percentage);
  const color = fillColor(charging, percentage);
  const p = Math.min(1, Math.max(0, percentage / 100));

  const parts = [frame(), fillBar(p, color)];
  parts.push(eyes(style));
  parts.push(nose());
  parts.push(mouth(style));
  if (style === 'happy' || style === 'neutral') parts.push(blush());
  if (style === 'crying') parts.push(tears());
  if (charging) parts.push(bolt());
  // Ears removed by design: tall battery body without triangles on top

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${W} ${H}">` +
    parts.join('') +
    `</svg>`
  );
}
