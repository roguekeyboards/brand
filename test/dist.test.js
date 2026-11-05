// Checks the committed dist/ still matches what its sources build, by pixel for the images. PNG and
// ICO bytes can vary with the zlib doing the compressing, so check-generated only compares the SVG
// and CSS files byte for byte.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { before, describe, it } from 'node:test';
import { DIST_DIR, TOKENS_FILE, build, readSources } from '../src/assets.js';
import { parseTokens, lookup } from '../src/tokens.js';
import { decodePNG, icoImages } from './png-decode.js';

const root = join(import.meta.dirname, '..');

describe('dist', () => {
	let built;
	let committed;

	before(() => {
		built = build(readSources(root));
		const dist = join(root, DIST_DIR);
		committed = new Map(
			readdirSync(dist, { recursive: true, withFileTypes: true })
				.filter((e) => e.isFile())
				.map((e) => {
					const path = join(e.parentPath, e.name);
					return [relative(dist, path), readFileSync(path)];
				})
		);
	});

	it('has exactly the built files', () => {
		assert.deepEqual(
			[...built.keys()].sort(),
			[...committed.keys()].sort(),
			'dist/ is out of date: run `mise run gen` and commit the result'
		);
	});

	it('holds the assets its consumers import', () => {
		for (const name of [
			'favicon.svg',
			'favicon.ico',
			'favicon-16.png',
			'favicon-32.png',
			'apple-touch-icon.png',
			'icon-192.png',
			'icon-512.png',
			'mark-on-dark.svg',
			'mark-on-light.svg',
			'mark-on-dark.png',
			'mark-on-light.png',
			'wordmark-on-dark.svg',
			'wordmark-on-light.svg',
			'wordmark-on-dark.png',
			'wordmark-on-light.png',
			'discord-avatar.png',
			'twitch-banner.png',
			'twitch-player-banner.png',
			'stream-holding.html',
			'stream-logo.png',
			'stream-logo-clear.png',
			'tokens.css'
		]) {
			assert.ok(built.has(name), name);
		}
	});

	it('fills in every placeholder in the holding screen', () => {
		const html = built.get('stream-holding.html').toString();
		assert.doesNotMatch(html, /\{\{/);
		assert.match(html, /base64,d09G/); // a woff2 file starts "wOF2"
		assert.match(html, /<div class="wordmark"><svg /);
	});

	it('declares only web fonts it ships', () => {
		const css = built.get('fonts.css').toString();
		const urls = [...css.matchAll(/url\('\.\/(.+?)'\)/g)].map((m) => m[1]);
		assert.equal(urls.length, 5);
		for (const url of urls) {
			assert.ok(built.has(url), url);
		}
	});

	it('ships each font family with its licence', () => {
		for (const file of ['sora']) {
			assert.match(built.get(`fonts/${file}-OFL.txt`).toString(), /SIL Open Font License/);
		}
	});

	it('holds web fonts that match their sources', () => {
		for (const [name, want] of built) {
			if (name.startsWith('fonts/')) {
				assert.ok(want.equals(committed.get(name)), name);
			}
		}
	});

	const assertSamePixels = (name, want, got) => {
		const a = decodePNG(want);
		const b = decodePNG(got);
		assert.deepEqual([b.width, b.height], [a.width, a.height], `${name}: size changed`);
		assert.ok(
			Buffer.from(a.pix).equals(Buffer.from(b.pix)),
			`${name} differs from its source; run \`mise run gen\``
		);
	};

	it('holds images that match their sources', () => {
		for (const [name, want] of built) {
			const got = committed.get(name);
			if (got === undefined) continue; // reported above
			if (name.endsWith('.png')) {
				assertSamePixels(name, want, got);
			} else if (name.endsWith('.ico')) {
				const wantImages = icoImages(want);
				const gotImages = icoImages(got);
				assert.equal(gotImages.length, wantImages.length, name);
				wantImages.forEach((image, i) => assertSamePixels(name, image, gotImages[i]));
			}
		}
	});
});

describe('tokens.json', () => {
	const tokens = parseTokens(readFileSync(join(root, TOKENS_FILE), 'utf8'));

	it('parses', () => {
		assert.equal(lookup(tokens.theme, 'accent'), '#e8a33d');
	});

	// The logo is drawn in the theme's own colours, so the two sections must agree wherever they
	// describe the same colour.
	it('has logo colours that match the theme', () => {
		for (const [logo, theme] of [
			['navy', 'bg'],
			['white', 'text'],
			['mist', 'text-muted'],
			['amber', 'accent'],
			['light', 'bg-light'],
			['navy', 'text-on-light'],
			['slate', 'text-muted-on-light']
		]) {
			assert.equal(lookup(tokens.logo, logo), lookup(tokens.theme, theme), `${logo} vs ${theme}`);
		}
	});
});
