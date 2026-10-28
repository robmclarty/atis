/**
 * main: the page's entry. It finds its map (D93) and how the page asks to see
 * it, says where the load is in the chrome, and once the map is read and
 * trusted draws the world under it. Every token the world and the chrome read
 * comes through one registry (D156), which the dev panel writes and the tab's
 * session keeps. A page the CLI served listens on its socket: for the maps
 * a watch pushes, each new one handed to the world and the chrome (D106),
 * and for what an agent asks it to show over `atis mcp` (D178). A page the
 * CLI served a tour beside the map reads it too, and the chrome plays it
 * (D112). A page opened as a still for a comment draws no chrome (`?cinema`,
 * D108).
 */

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { Chrome } from './chrome/index.js';
import { prOf } from './diff.js';
import { loadMap, mapUrl, servedToken } from './load.js';
import type { MapState } from './load.js';
import { pushedHighlight } from './highlight.js';
import { loadTour, tourUrl } from './tour.js';
import type { Tour } from './tour.js';
import { createNav } from './nav.js';
import { createRegistry, sessionStore } from './registry.js';
import { viewOf } from './view.js';
import { framedUrl, pushedMap, sameBuild, socketUrl } from './watch.js';
import { drawWorld } from './world/index.js';

const canvas = document.querySelector<HTMLCanvasElement>('#world');
const chromeRoot = document.querySelector<HTMLElement>('#chrome');
if (!canvas || !chromeRoot) throw new Error('index.html lost its #world canvas or its #chrome root');
// The chrome's root lies over the canvas as wide as its blocks; the pointer passes through it to the camera's controls (step 37), and each block that takes the pointer says so itself.
chromeRoot.style.pointerEvents = 'none';
// A still for a pull request's comment shows the world alone (D108).
const view = viewOf(location.search);
if (view.cinema === true) chromeRoot.style.display = 'none';

const registry = createRegistry(sessionStore());
const field = (): void => {
  document.body.style.background = String(registry.get('FIELD_FILL'));
};
field();
registry.subscribe((name) => {
  if (name === 'FIELD_FILL') field();
});

const chrome = createRoot(chromeRoot);
const token = servedToken(location.search);
// The one line between the chrome and the world: the minimap reads the view from it, and moves the camera through it.
const nav = createNav();
// The tour served beside the map, read alongside it when the URL says one is served (D112).
let tour: Tour | undefined;
const show = (state: MapState): void => chrome.render(createElement(Chrome, { state, registry, nav, dev: import.meta.env.DEV, token, tour }));

const url = mapUrl(location.search);
show({ status: 'loading', url });
const touring = tourUrl(location.search);
const toured = touring === undefined ? Promise.resolve(undefined) : loadTour(touring, (target) => fetch(target));
const state = await loadMap(url, (target) => fetch(target));
tour = await toured;
show(state);
if (state.status === 'ready') {
  await drawWorld(canvas, state.map, view, registry, nav, { token, pr: prOf(location.search) });
  const socket = socketUrl(location.search, location.host);
  // What an agent names, flown to and lit (D178); and each map the watch pushes that is not the one shown: its weather swapped in by the world, or its new ground drawn afresh where the reader stands (D106).
  let shown = state.map;
  if (socket !== undefined) {
    new WebSocket(socket).addEventListener('message', (event: MessageEvent<unknown>) => {
      const text = typeof event.data === 'string' ? event.data : '';
      const highlight = pushedHighlight(text);
      if (highlight !== undefined) {
        nav.highlight(highlight);
        return;
      }
      const next = pushedMap(text);
      if (next === undefined || sameBuild(shown, next)) return;
      const framing = nav.swap(next);
      if (framing !== undefined) {
        location.replace(framedUrl(location.href, framing));
        return;
      }
      shown = next;
      show({ status: 'ready', url, map: next });
    });
  }
}
