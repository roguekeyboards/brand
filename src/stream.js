// Draws the Twitch stream logo, to place over the live picture. The animated starting soon and be
// right back screens are src/holding.html.
import { mark, onDark } from './logo.js';
import { place, rect } from './scene.js';

// The stream logo: the on-dark mark for an OBS image source, placed and sized there. Drawn at 128px,
// so it's pixel for pixel on a 1080p canvas. The tiled version sits on a rounded navy square, so it
// reads over any picture; the clear one leaves the square transparent. The mark is the same size and
// place in both, so either can stand in for the other.
export const LOGO = { size: 128, radius: 28, frac: 0.62 };

/** The stream logo, on a navy tile if tiled, else on a transparent square. */
export function streamLogo(c, tiled, label) {
	const art = mark(onDark(c));
	const s = (LOGO.size * LOGO.frac) / art.w;
	const inset = (LOGO.size - art.w * s) / 2;
	const items = place(art.items, s, inset, inset);
	return {
		w: LOGO.size,
		h: LOGO.size,
		label,
		items: tiled
			? [{ fill: c.navy, shape: rect(0, 0, LOGO.size, LOGO.size, LOGO.radius) }, ...items]
			: items
	};
}
