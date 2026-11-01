// A design is built once as a scene (filled shapes in absolute coordinates), and that same scene
// is written out as SVG and rasterized to PNG, so the vector and bitmap versions of a design can't
// disagree.
//
// A scene is { w, h, label, items }. Each item is { fill: '#rrggbb', shape }, painted in order. A
// shape is rect(...), circle(...) or a path: a list of { op, pts }, with op one of SVG's M, L, Q, C
// and Z, and pts holding 1 point for M and L, 2 for Q (control, end), 3 for C (control, control,
// end) and none for Z. Paths are filled with the nonzero rule.

// Places cubic Bézier control points to approximate a quarter circle.
const KAPPA = 0.5522847498;

/** An axis-aligned rectangle with corner radius r. */
export function rect(x, y, w, h, r = 0) {
	return { rect: true, x, y, w, h, r };
}

/** A filled circle. */
export function circle(cx, cy, r) {
	return { circle: true, cx, cy, r };
}

/**
 * A circle as a closed path of four cubic curves, clockwise on screen, or counterclockwise if
 * reversed. The rasterizer draws circle(...) shapes with it.
 */
export function circlePath(cx, cy, r, reversed = false) {
	const k = r * KAPPA;
	// Quarter by quarter: right, bottom, left, top (y points down).
	let quarters = [
		[
			[cx + r, cy + k],
			[cx + k, cy + r],
			[cx, cy + r]
		],
		[
			[cx - k, cy + r],
			[cx - r, cy + k],
			[cx - r, cy]
		],
		[
			[cx - r, cy - k],
			[cx - k, cy - r],
			[cx, cy - r]
		],
		[
			[cx + k, cy - r],
			[cx + r, cy - k],
			[cx + r, cy]
		]
	];
	if (reversed) {
		const ends = [[cx + r, cy], ...quarters.map((q) => q[2])];
		quarters = quarters.map((q, i) => [q[1], q[0], ends[i]]).reverse();
	}
	return [
		{ op: 'M', pts: [[cx + r, cy]] },
		...quarters.map((pts) => ({ op: 'C', pts })),
		{ op: 'Z', pts: [] }
	];
}

/** A ring: the area between two circles around the same centre. */
export function ring(cx, cy, outer, inner) {
	return [...circlePath(cx, cy, outer), ...circlePath(cx, cy, inner, true)];
}

/** Maps every point of the path through f. */
export function transform(path, f) {
	return path.map((c) => ({ op: c.op, pts: c.pts.map(f) }));
}

/** Scales the items by s around the origin, then moves them by (dx, dy). */
export function place(items, s, dx, dy) {
	const at = ([x, y]) => [x * s + dx, y * s + dy];
	return items.map(({ fill, shape }) => {
		if (shape.rect) {
			const [x, y] = at([shape.x, shape.y]);
			return { fill, shape: rect(x, y, shape.w * s, shape.h * s, shape.r * s) };
		}
		if (shape.circle) {
			const [cx, cy] = at([shape.cx, shape.cy]);
			return { fill, shape: circle(cx, cy, shape.r * s) };
		}
		return { fill, shape: transform(shape, at) };
	});
}

/**
 * The box around the items' shapes, as { minX, minY, maxX, maxY }. For paths it bounds every
 * point, curve control points included, which for glyph outlines is their ink.
 */
export function bounds(items) {
	const xs = [];
	const ys = [];
	for (const { shape } of items) {
		if (shape.rect) {
			xs.push(shape.x, shape.x + shape.w);
			ys.push(shape.y, shape.y + shape.h);
		} else if (shape.circle) {
			xs.push(shape.cx - shape.r, shape.cx + shape.r);
			ys.push(shape.cy - shape.r, shape.cy + shape.r);
		} else {
			for (const { pts } of shape) {
				for (const [x, y] of pts) {
					xs.push(x);
					ys.push(y);
				}
			}
		}
	}
	return {
		minX: Math.min(...xs),
		minY: Math.min(...ys),
		maxX: Math.max(...xs),
		maxY: Math.max(...ys)
	};
}

/** Formats a coordinate to at most two decimals, the precision every asset is drawn at. */
export function num(v) {
	const rounded = (Math.sign(v) * Math.round(Math.abs(v) * 100)) / 100;
	return String(rounded === 0 ? 0 : rounded); // normalises -0
}

/** Renders the scene as a standalone SVG document. */
export function svg(scene) {
	const { w, h, label, items } = scene;
	let out =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(w)} ${num(h)}" ` +
		`width="${num(w)}" height="${num(h)}" role="img" aria-label="${label}">`;
	for (const { fill, shape } of items) {
		if (shape.rect) {
			const radius = shape.r > 0 ? ` rx="${num(shape.r)}"` : '';
			out +=
				`<rect x="${num(shape.x)}" y="${num(shape.y)}" ` +
				`width="${num(shape.w)}" height="${num(shape.h)}"${radius} fill="${fill}"/>`;
		} else if (shape.circle) {
			out += `<circle cx="${num(shape.cx)}" cy="${num(shape.cy)}" r="${num(shape.r)}" fill="${fill}"/>`;
		} else {
			out += `<path fill="${fill}" d="${pathData(shape)}"/>`;
		}
	}
	return `${out}</svg>\n`;
}

function pathData(path) {
	return path.map((c) => c.op + c.pts.map(([x, y]) => `${num(x)} ${num(y)}`).join(' ')).join(' ');
}
