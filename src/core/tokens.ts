/**
 * The two or three places a colour genuinely cannot be a CSS variable.
 *
 * `<meta name="theme-color">`, the web app manifest and an SVG written to a
 * file are all read outside a document, where `var(--page)` resolves to
 * nothing. Those values live here, once, mirroring src/styles/tokens.css —
 * and this is the only file in the repo where the no-hex-literals lint rule
 * is relaxed.
 *
 * If you are reaching for this file from a component, you want a token.
 */

export const BRAND = {
  /** --page / dust-50 */
  page: '#FFFCF8',
  /** --ink / dust-900 */
  ink: '#14110F',
  /** --clay-500, the primary */
  clay: '#EC6410',
} as const;
