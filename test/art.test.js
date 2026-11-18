import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { FONT_FILES } from '../src/assets.js';
import { loadFont } from '../src/font.js';
import {
	ICON_FRAC,
	MARK_H,
	MARK_W,
	TILE_SIZE,
	banner,
	coloursFrom,
	mark,
	tile,
	wordmark
} from '../src/logo.js';
import { encodePNG, ico } from '../src/png.js';
import { render } from '../src/raster.js';
import { bounds, circle, circlePath, num, place, rect, ring, svg } from '../src/scene.js';
import { LOGO, streamLogo } from '../src/stream.js';
import { decodePNG, icoImages } from './png-decode.js';

const root = join(import.meta.dirname, '..');
const fonts = Object.fromEntries(
	Object.entries(FONT_FILES).map(([key, file]) => [key, loadFont(readFileSync(join(root, file)))])
);
const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-6, `${message}: ${a} vs ${b}`);

describe('svg', () => {
	it('writes rects, circles and paths', () => {
		const scene = {
			w: 10,
			h: 5,
			label: 'x',
			items: [
				{ fill: '#000000', shape: rect(0, 0, 10, 5) },
				{ fill: '#ffffff', shape: rect(1, 1, 2, 2, 0.5) },
				{ fill: '#00ff00', shape: circle(5, 2.5, 1.006) },
				{
					fill: '#ff0000',
					shape: [
						{ op: 'M', pts: [[0, 0]] },
						{ op: 'L', pts: [[1.006, 0]] },
						{ op: 'L', pts: [[1, 1]] },
						{ op: 'Z', pts: [] }
					]
				}
			]
		};
		assert.equal(
			svg(scene),
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 5" width="10" height="5" role="img" aria-label="x">' +
				'<rect x="0" y="0" width="10" height="5" fill="#000000"/>' +
				'<rect x="1" y="1" width="2" height="2" rx="0.5" fill="#ffffff"/>' +
				'<circle cx="5" cy="2.5" r="1.01" fill="#00ff00"/>' +
				'<path fill="#ff0000" d="M0 0 L1.01 0 L1 1 Z"/>' +
				'</svg>\n'
		);
	});

	it('normalises negative zero', () => {
		assert.equal(num(-0.001), '0');
	});

	it('rounds negative values away from zero', () => {
		assert.equal(num(-1.125), '-1.13');
	});
});

describe('circlePath', () => {
	const ends = (path) => path.filter((c) => c.op !== 'Z').map((c) => c.pts.at(-1));

	it('passes through the four extremes', () => {
		assert.deepEqual(ends(circlePath(0, 0, 2)), [
			[2, 0],
			[0, 2],
			[-2, 0],
			[0, -2],
			[2, 0]
		]);
	});

	it('runs the other way when reversed', () => {
		assert.deepEqual(ends(circlePath(0, 0, 2, true)), [
			[2, 0],
			[0, -2],
			[-2, 0],
			[0, 2],
			[2, 0]
		]);
	});
});

describe('place', () => {
	it('scales and moves every kind of shape', () => {
		const items = place(
			[
				{ fill: '#000000', shape: rect(1, 1, 2, 2, 1) },
				{ fill: '#000000', shape: circle(1, 1, 1) },
				{ fill: '#000000', shape: [{ op: 'M', pts: [[1, 1]] }] }
			],
			2,
			10,
			20
		);
		assert.deepEqual(items[0].shape, rect(12, 22, 4, 4, 2));
		assert.deepEqual(items[1].shape, circle(12, 22, 2));
		assert.deepEqual(items[2].shape, [{ op: 'M', pts: [[12, 22]] }]);
	});
});

describe('render', () => {
	const alphaAt = ({ width, pix }, x, y) => pix[(y * width + x) * 4 + 3];

	it('fills the shape', () => {
		const scene = { w: 4, h: 4, items: [{ fill: '#ff0000', shape: rect(0, 0, 2, 4) }] };
		const { pix } = render(scene, 4);
		assert.deepEqual([...pix.subarray(0, 4)], [0xff, 0, 0, 0xff]); // inside
		assert.deepEqual([...pix.subarray(12, 16)], [0, 0, 0, 0]); // outside, transparent
	});

	it('rejects bad colours', () => {
		const bad = { w: 1, h: 1, items: [{ fill: 'red', shape: rect(0, 0, 1, 1) }] };
		assert.throws(() => render(bad, 1), /want #rrggbb/);
	});

	it('antialiases a partly covered pixel', () => {
		const half = { w: 2, h: 1, items: [{ fill: '#000000', shape: rect(0, 0, 0.5, 1) }] };
		const alpha = render(half, 2).pix[3];
		assert.ok(alpha > 0x70 && alpha < 0x90, `alpha ${alpha}`);
	});

	it('fills a quadratic curve', () => {
		const path = [
			{ op: 'M', pts: [[0, 0]] },
			{
				op: 'Q',
				pts: [
					[8, 0],
					[8, 8]
				]
			},
			{ op: 'Z', pts: [] }
		];
		const image = render({ w: 8, h: 8, items: [{ fill: '#000000', shape: path }] }, 8);
		assert.equal(alphaAt(image, 6, 4), 0xff); // between the curve and its chord
		assert.equal(alphaAt(image, 6, 0), 0); // outside the curve
	});

	it('fills a circle', () => {
		const image = render(
			{ w: 20, h: 20, items: [{ fill: '#000000', shape: circle(10, 10, 8) }] },
			20
		);
		assert.equal(alphaAt(image, 10, 10), 0xff);
		assert.equal(alphaAt(image, 0, 0), 0);
	});

	it('leaves a ring hollow', () => {
		const image = render(
			{ w: 20, h: 20, items: [{ fill: '#000000', shape: ring(10, 10, 9, 6) }] },
			20
		);
		assert.equal(alphaAt(image, 10, 10), 0); // the hole
		assert.equal(alphaAt(image, 10, 2), 0xff); // the band
		assert.equal(alphaAt(image, 0, 0), 0); // outside
	});
});

describe('encodePNG', () => {
	const roundTrip = (scene, px) => decodePNG(encodePNG(render(scene, px)));

	it('round-trips an image with alpha', () => {
		const scene = { w: 4, h: 4, items: [{ fill: '#e8a33d', shape: rect(0, 0, 2, 4) }] };
		const { width, height, pix } = roundTrip(scene, 4);
		assert.deepEqual([width, height], [4, 4]);
		assert.deepEqual([...pix.subarray(0, 4)], [0xe8, 0xa3, 0x3d, 0xff]);
		assert.equal(pix[15], 0);
	});

	it('leaves out the alpha channel of an opaque image', () => {
		const scene = { w: 2, h: 2, items: [{ fill: '#121a2b', shape: rect(0, 0, 2, 2) }] };
		const data = encodePNG(render(scene, 2));
		assert.equal(data[25], 2); // truecolour without alpha
		assert.deepEqual([...decodePNG(data).pix.subarray(0, 4)], [0x12, 0x1a, 0x2b, 0xff]);
	});
});

describe('ico', () => {
	const png = (px) => {
		const scene = { w: 1, h: 1, items: [{ fill: '#121a2b', shape: rect(0, 0, 1, 1) }] };
		return encodePNG(render(scene, px));
	};

	it('points its directory at each image', () => {
		const small = png(16);
		const big = png(32);
		const file = ico(small, big);
		assert.equal(file.readUInt16LE(2), 1); // type: icon
		assert.equal(file.readUInt16LE(4), 2); // count
		assert.equal(file[6], 16);
		assert.equal(file[6 + 16], 32);
		const [first, second] = icoImages(file);
		assert.ok(first.equals(small));
		assert.ok(second.equals(big));
	});

	it('rejects images over 256px', () => {
		assert.throws(() => ico(png(257)), /at most 256px/);
	});
});

describe('logo', () => {
	const colours = {
		navy: '#000000',
		white: '#111111',
		amber: '#222222',
		mist: '#333333',
		slate: '#444444',
		light: '#555555'
	};
	const p = { ink: '#111111', accent: '#222222', keyboards: '#333333' };

	it('names the missing token', () => {
		assert.throws(
			() => coloursFrom([{ name: 'navy', value: '#121a2b' }]),
			/logo section is missing "white"/
		);
	});

	it('crops the mark to its artwork', () => {
		const scene = mark(p);
		assert.equal(scene.w, MARK_W);
		assert.equal(scene.h, MARK_H);
		const b = bounds(scene.items);
		close(b.minX, 0, 'left');
		close(b.minY, 0, 'top');
		close(b.maxX, MARK_W, 'right');
		close(b.maxY, MARK_H, 'bottom');
	});

	it('makes the top dot the accent', () => {
		const dots = mark(p).items.filter((i) => i.shape.circle);
		assert.equal(dots.length, 4);
		const top = dots.reduce((a, b) => (b.shape.cy < a.shape.cy ? b : a));
		assert.equal(top.fill, p.accent);
		assert.equal(dots.filter((d) => d.fill === p.accent).length, 1);
	});

	it('centres the mark on a tile', () => {
		const b = bounds(tile(colours, ICON_FRAC, 'x').items.slice(1)); // after the background
		close((b.minX + b.maxX) / 2, TILE_SIZE / 2, 'x centre');
		close((b.minY + b.maxY) / 2, TILE_SIZE / 2, 'y centre');
		close(b.maxX - b.minX, TILE_SIZE * ICON_FRAC, 'width');
	});

	describe('wordmark', () => {
		const scene = wordmark(fonts, p);
		const of = (fill) => scene.items.filter((i) => i.fill === fill);
		const rogue = bounds(of(p.ink).filter((i) => !i.shape.circle));
		const keyboards = bounds(of(p.keyboards));
		const dots = bounds(scene.items.filter((i) => i.shape.circle));

		it('is cropped to its artwork', () => {
			const b = bounds(scene.items);
			close(b.minX, 0, 'left');
			close(b.minY, 0, 'top');
			close(b.maxX, scene.w, 'right');
			close(b.maxY, scene.h, 'bottom');
		});

		it('sets "keyboards" flush right with "rogue", below it', () => {
			close(keyboards.maxX, rogue.maxX, 'right edges');
			assert.ok(keyboards.minY > dots.maxY);
		});

		it('puts the dots inside the o', () => {
			// The o is the second glyph: after the r, before the g.
			const glyphs = of(p.ink).filter((i) => !i.shape.circle);
			const o = bounds([glyphs[1]]);
			assert.ok(dots.minX > o.minX && dots.maxX < o.maxX, 'horizontally');
			assert.ok(dots.minY > o.minY && dots.maxY < o.maxY, 'vertically');
			// Centred on the counter, which sits a hair off the centre of the o's outside.
			const offset = (dots.minX + dots.maxX) / 2 - (o.minX + o.maxX) / 2;
			assert.ok(Math.abs(offset) < 0.1, `x centre off by ${offset}`);
		});
	});

	it('centres the wordmark on a banner', () => {
		const scene = banner(fonts, colours, 1200, 480, 520, 'x');
		const b = bounds(scene.items.slice(1));
		close(b.maxX - b.minX, 520, 'width');
		close((b.minX + b.maxX) / 2, 600, 'x centre');
		close((b.minY + b.maxY) / 2, 240, 'y centre');
	});
});

describe('stream', () => {
	const colours = {
		navy: '#000000',
		white: '#111111',
		amber: '#222222',
		mist: '#333333',
		slate: '#444444',
		light: '#555555'
	};

	it('centres the mark on the stream logo, the same with or without the tile', () => {
		const tiled = streamLogo(colours, true, 'x');
		const clear = streamLogo(colours, false, 'x');
		assert.deepEqual([tiled.w, tiled.h], [LOGO.size, LOGO.size]);
		assert.equal(tiled.items[0].fill, colours.navy);
		assert.deepEqual(tiled.items.slice(1), clear.items);
		const b = bounds(clear.items);
		close((b.minX + b.maxX) / 2, LOGO.size / 2, 'x centre');
		close((b.minY + b.maxY) / 2, LOGO.size / 2, 'y centre');
		assert.equal(render(clear, LOGO.size).pix[3], 0, 'clear corner is transparent');
	});
});
