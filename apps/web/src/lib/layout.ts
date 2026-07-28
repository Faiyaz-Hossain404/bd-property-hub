// The one page-container width for the whole app.
//
// The header, the page's main content, and the footer all compose this exact
// string, so their left/right edges line up on any screen. Keeping it in one
// place is the point: when these were separate literals they drifted (the
// catalog sat at 96rem while the header and footer sat at 80rem), which is
// visible as a step in the alignment on a wide monitor. Change it here and every
// surface moves together.
//
// There is deliberately no max-width: the app fills the screen edge to edge
// rather than parking a centred column between two empty gutters. `max-w-none`
// is spelled out rather than omitted so the intent survives the next edit — it
// says "no cap", not "someone forgot the cap". Individual blocks of running text
// still set their own measure (e.g. the hero's `max-w-xl`); it's only the page
// frame that goes full-bleed.
//
// Auth routes (sign-in / sign-up) deliberately opt out — they centre a narrow
// card instead of filling a page-width container — so they never compose this.
export const PAGE_CONTAINER = 'w-full max-w-none px-4 sm:px-6 lg:px-8';
