# Rogue Keyboards brand

Rogue Keyboards' logo, icons and design tokens, in one place so every site, app and social account uses the same artwork.

- **Source of truth:** `tokens.json` (colours and font stacks), the designs in `src/logo.js` and the fonts in `fonts/`.
- **Generated:** everything in `dist/`, by `mise run gen`. Never edit `dist/` by hand.
- **npm:** `@roguekeyboards/brand` on GitHub Packages, published when a release is.
- **Brand sheet:** [`docs/brand-sheet.pdf`](docs/brand-sheet.pdf), a one-page overview to share.

## The logo

- **Wordmark:** "rogue" in Sora Regular over "keyboards" in Sora Light, right-aligned. The o is Sora ExtraLight and holds four dots laid out like arrow keys, an inverted T, the top one amber.
- **Mark:** the same four dots inside a ring. Use it where the wordmark won't fit: icons, avatars, favicons.

The wordmark already contains the dots, so the two aren't used side by side.

## Colours

| Token   | Hex       | Use                                         |
| ------- | --------- | ------------------------------------------- |
| `navy`  | `#121a2b` | Background                                  |
| `white` | `#f4f5f7` | Wordmark and mark on navy                   |
| `amber` | `#e8a33d` | The top dot, on navy and light; the accent  |
| `mist`  | `#a9afbb` | "keyboards" on navy                         |
| `slate` | `#4a5466` | "keyboards" on light                        |
| `light` | `#ffffff` | Light background; navy replaces white on it |

Mist is too faint on white and slate too faint on navy, so "keyboards" switches between them.

## Files

| File                                                                        | Use                                                                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `wordmark-on-dark.svg` / `-on-light.svg`, and `.png` (1200 wide)            | The logo: headers, nav bars, documents. Transparent background.                                              |
| `mark-on-dark.svg` / `-on-light.svg`, and `.png` (512)                      | The mark alone. Transparent background.                                                                      |
| `favicon.svg`, `favicon.ico` (16/32/48), `favicon-16.png`, `favicon-32.png` | Browser tab icons, drawn on the pixel grid at 16 and 32                                                      |
| `apple-touch-icon.png` (180)                                                | iOS home screen                                                                                              |
| `icon-192.png`, `icon-512.png`                                              | Web app manifest                                                                                             |
| `discord-avatar.png` / `.svg` (1024)                                        | Discord server or application icon. Discord crops it to a circle; the ring fits.                             |
| `twitch-banner.png` / `.svg` (1200×480)                                     | Twitch profile banner                                                                                        |
| `twitch-player-banner.png` / `.svg` (1920×1080)                             | Twitch video player banner, shown while offline                                                              |
| `fonts.css`                                                                 | `@font-face` rules for Sora (200-600), latin subset                                                          |
| `fonts/*.woff2`, `fonts/sora-OFL.txt`                                       | The fonts `fonts.css` loads and their license. Keep the license with the fonts.                              |
| `tokens.css`                                                                | `tokens.json` as CSS custom properties: theme tokens as `--accent` etc., logo colours as `--logo-amber` etc. |

In the SVGs the wordmark's text is converted to outlines, so they render the same without Sora installed.

## Local setup

Tooling is pinned with [mise](https://mise.jdx.dev). The generator's one dependency, `opentype.js`, reads the fonts; it draws and encodes the images itself, so there's nothing native to install.

```sh
mise install
npm ci
mise run gen      # regenerate dist/
mise run test     # node --test
mise run lint     # prettier, eslint and actionlint
```

## Using it

```ts
import favicon from '@roguekeyboards/brand/favicon.svg';
```

```css
@import '@roguekeyboards/brand/fonts.css';
@import '@roguekeyboards/brand/tokens.css';
```

## Changing the brand

1. Edit `tokens.json` or a design in `src/logo.js`.
2. `mise run gen`, look at `dist/`, commit both.
3. The PR needs a `feat` or `fix` title so merging leads to a release, which publishes the package.

`mise run check-generated` compares `dist/`'s SVG and CSS files byte for byte. PNG and ICO bytes can vary with the zlib doing the compressing, so the tests compare those pixel by pixel instead.

`docs/brand-sheet.pdf` isn't generated. Update it by hand when the logo or colours change.

### By hand, after a release that changes the icons

These don't update themselves:

- [ ] Discord icon: `discord-avatar.png`
- [ ] Twitch profile banner: `twitch-banner.png`
- [ ] Twitch video player banner: `twitch-player-banner.png`
- [ ] `docs/brand-sheet.pdf`

## Fonts

`fonts/Sora-*.ttf` are static, latin-subset instances of Sora from [Fontsource](https://fontsource.org/fonts/sora), which the generator reads to outline the wordmark. `fonts/web/` holds the same family as woff2 for `fonts.css`.

## License

The generator's code is [MIT](LICENSE-MIT). The name, logo and artwork aren't; see [`LICENSE`](LICENSE). The fonts are under the SIL Open Font License, with each license beside its fonts in [`fonts/`](fonts/).
