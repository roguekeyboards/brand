// Draws Rogue Keyboards' logo artwork as scenes (see scene.js).
import { capHeight, layOut } from './font.js';
import { bounds, circle, place, rect, ring } from './scene.js';
import { lookup } from './tokens.js';

const COLOUR_NAMES = {
	navy: 'navy',
	white: 'white',
	amber: 'amber',
	mist: 'mist',
	slate: 'slate',
	light: 'light'
};

/** Reads the logo colours from tokens.json's logo palette. */
export function coloursFrom(palette) {
	const colours = {};
	for (const [key, name] of Object.entries(COLOUR_NAMES)) {
		colours[key] = lookup(palette, name);
		if (colours[key] === undefined) {
			throw new Error(`tokens.json logo section is missing "${name}"`);
		}
	}
	return colours;
}

/** The logo for dark backgrounds: white ring, dots and "rogue", mist "keyboards". */
export function onDark(c) {
	return { ink: c.white, accent: c.amber, keyboards: c.mist };
}

/**
 * The logo for light backgrounds: navy in place of white, and slate "keyboards", since mist is too
 * light to read on white. The amber dot stays amber.
 */
export function onLight(c) {
	return { ink: c.navy, accent: c.amber, keyboards: c.slate };
}

// The mark: a ring holding four dots laid out like arrow keys, an inverted T, the top one amber.
// Drawn in a 100-unit box; the visible artwork spans MARK_X0..MARK_X0+MARK_W, MARK_Y0..MARK_Y0+MARK_H.
const MARK_X0 = 4;
const MARK_Y0 = 4;
export const MARK_W = 92;
export const MARK_H = 92;
const RING = { cx: 50, cy: 50, outer: 46, inner: 40.5 };

// The dots, centred on (50, 50) so they can be placed around any centre. The first is the accent.
const DOT_R = 7;
const DOTS = [
	[50, 40],
	[32, 60],
	[50, 60],
	[68, 60]
];

// The dots centred on (cx, cy), scaled by s.
function dotItems(p, cx, cy, s) {
	return DOTS.map(([x, y], i) => ({
		fill: i === 0 ? p.accent : p.ink,
		shape: circle(cx + (x - 50) * s, cy + (y - 50) * s, DOT_R * s)
	}));
}

// Places the mark with its visible top-left at (x, y), scaled by s.
function markItems(p, x, y, s) {
	const tx = x - MARK_X0 * s;
	const ty = y - MARK_Y0 * s;
	const [cx, cy] = [tx + RING.cx * s, ty + RING.cy * s];
	return [
		{ fill: p.ink, shape: ring(cx, cy, RING.outer * s, RING.inner * s) },
		...dotItems(p, cx, cy, s)
	];
}

/** The mark alone, cropped to its artwork. */
export function mark(p) {
	return { w: MARK_W, h: MARK_H, label: 'Rogue Keyboards', items: markItems(p, 0, 0, 1) };
}

// The wordmark: "rogue" in Sora Regular, except for its o, which is Sora ExtraLight and holds the
// mark's dots, over a smaller "keyboards" in Sora Light, its right edge flush with the e's. Drawn
// with "rogue" at SIZE px.
const SIZE = 104;
const ROGUE_TRACKING = -2 / SIZE; // ems
const O_SHIFT = 7; // font units: centres the narrower ExtraLight o where the Regular one would sit
const O_COUNTER = [330.5, 262.5]; // font units: the centre of the ExtraLight o's counter
const DOTS_SCALE = 0.56; // mark units to px, at SIZE
const KEYBOARDS_SIZE = 24;
const KEYBOARDS_TRACKING = 3 / KEYBOARDS_SIZE; // ems
const KEYBOARDS_GAP = 26; // px from "rogue"'s baseline to the top of "keyboards"' k

// The wordmark's items with "rogue"'s baseline at y = 0, starting at x = 0.
function wordmarkItems(fonts, p) {
	const scale = SIZE / fonts.regular.unitsPerEm;
	const track = ROGUE_TRACKING * SIZE;
	const run = (text) => [{ text, fill: p.ink }];

	const r = layOut(fonts.regular, run('r'), SIZE, 0, 0, 0);
	let x = r.width + track;
	const o = layOut(fonts.extraLight, run('o'), SIZE, 0, x + O_SHIFT * scale, 0);
	const counter = [x + (O_SHIFT + O_COUNTER[0]) * scale, -O_COUNTER[1] * scale];
	x += fonts.regular.charToGlyph('o').advanceWidth * scale + track;
	const gue = layOut(fonts.regular, run('gue'), SIZE, ROGUE_TRACKING, x, 0);
	const rogue = [...r.items, ...o.items, ...gue.items];

	const baseline = KEYBOARDS_GAP + capHeight(fonts.light, KEYBOARDS_SIZE);
	const kb = layOut(
		fonts.light,
		[{ text: 'keyboards', fill: p.keyboards }],
		KEYBOARDS_SIZE,
		KEYBOARDS_TRACKING,
		0,
		baseline
	);
	const flush = bounds(rogue).maxX - bounds(kb.items).maxX;

	return [
		...rogue,
		...dotItems(p, counter[0], counter[1], DOTS_SCALE),
		...place(kb.items, 1, flush, 0)
	];
}

/** The wordmark, cropped to its artwork. */
export function wordmark(fonts, p) {
	const items = wordmarkItems(fonts, p);
	const b = bounds(items);
	return {
		w: b.maxX - b.minX,
		h: b.maxY - b.minY,
		label: 'Rogue Keyboards',
		items: place(items, 1, -b.minX, -b.minY)
	};
}

/** The mark redrawn on a 32px grid: a 2px ring and 4px dots with 1px between them. */
export function favicon32(c) {
	const p = onDark(c);
	return {
		w: 32,
		h: 32,
		label: 'Rogue Keyboards',
		items: [
			{ fill: c.navy, shape: rect(0, 0, 32, 32, 7) },
			{ fill: p.ink, shape: ring(16, 16, 13, 11) },
			{ fill: p.accent, shape: circle(16, 13, 2) },
			{ fill: p.ink, shape: circle(11, 18, 2) },
			{ fill: p.ink, shape: circle(16, 18, 2) },
			{ fill: p.ink, shape: circle(21, 18, 2) }
		]
	};
}

/**
 * The mark redrawn on a 16px grid: a 1px ring and 2px dots. A circle that small only partly covers
 * its pixels and comes out grey, so the dots are 2px squares, barely rounded.
 */
export function favicon16(c) {
	const p = onDark(c);
	const dot = (x, y) => rect(x, y, 2, 2, 0.25);
	return {
		w: 16,
		h: 16,
		label: 'Rogue Keyboards',
		items: [
			{ fill: c.navy, shape: rect(0, 0, 16, 16, 3.5) },
			{ fill: p.ink, shape: ring(8, 8, 7, 6) },
			{ fill: p.accent, shape: dot(7, 5) },
			{ fill: p.ink, shape: dot(4, 8) },
			{ fill: p.ink, shape: dot(7, 8) },
			{ fill: p.ink, shape: dot(10, 8) }
		]
	};
}

// The drawing size of the square icons; they're rendered down from it.
export const TILE_SIZE = 1024;

// How much of a tile's width the ring spans. Discord crops its avatar to a circle, and iOS and
// Android round their icons' corners; at this size the ring clears all of them.
export const ICON_FRAC = 0.6;

/** The on-dark mark centred on a full-bleed navy square, spanning frac of its width. */
export function tile(c, frac, label) {
	const s = (TILE_SIZE * frac) / MARK_W;
	const at = (TILE_SIZE - MARK_W * s) / 2;
	return {
		w: TILE_SIZE,
		h: TILE_SIZE,
		label,
		items: [
			{ fill: c.navy, shape: rect(0, 0, TILE_SIZE, TILE_SIZE) },
			...markItems(onDark(c), at, at, s)
		]
	};
}

/** The on-dark wordmark centred on a w by h navy banner, scaled to width px wide. */
export function banner(fonts, c, w, h, width, label) {
	const art = wordmark(fonts, onDark(c));
	const s = width / art.w;
	return {
		w,
		h,
		label,
		items: [
			{ fill: c.navy, shape: rect(0, 0, w, h) },
			...place(art.items, s, (w - art.w * s) / 2, (h - art.h * s) / 2)
		]
	};
}
