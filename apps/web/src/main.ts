/**
 * main: the page's entry. It finds its map (D93) and how the page asks to see
 * it, says where the load is in the chrome, and once the map is read and
 * trusted draws the world under it. Every token the world and the chrome read
 * comes through one registry (D156), which the dev panel writes and the tab's
 * session keeps. A page opened watching listens for the maps the watch
 * pushes, and hands each new one to the world and the chrome (D106). A page
 * opened as a still for a comment draws no chrome (`?cinema`, D108).
 */

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { Chrome } from './chrome/index.js';
import { prOf } from './diff.js';
import { loadMap, mapUrl, servedToken } from './load.js';
import type { MapState } from './load.js';
import { createNav } from './nav.js';
import { createRegistry, sessionStore } from './registry.js';
import { viewOf } from './view.js';
import { framedUrl, pushedMap, sameBuild, watchUrl } from './watch.js';
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
const show = (state: MapState): void => chrome.render(createElement(Chrome, { state, registry, nav, dev: import.meta.env.DEV, token }));

const url = mapUrl(location.search);
show({ status: 'loading', url });
const state = await loadMap(url, (target) => fetch(target));
show(state);
if (state.status === 'ready') {
  await drawWorld(canvas, state.map, view, registry, nav, { token, pr: prOf(location.search) });
  const socket = watchUrl(location.search, location.host);
  // Each map the watch pushes that is not the one shown: its weather swapped in by the world, or its new ground drawn afresh where the reader stands (D106).
  let shown = state.map;
  if (socket !== undefined) {
    new WebSocket(socket).addEventListener('message', (event: MessageEvent<unknown>) => {
      const next = typeof event.data === 'string' ? pushedMap(event.data) : undefined;
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
