/**
 * main: the page's entry. It finds its map (D93) and how the page asks to see
 * it, says where the load is in the chrome, and once the map is read and
 * trusted draws the world under it. Every token the world and the chrome read
 * comes through one registry (D156), which the dev panel writes and the tab's
 * session keeps.
 */

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { Chrome } from './chrome/index.js';
import { loadMap, mapUrl, servedToken } from './load.js';
import type { MapState } from './load.js';
import { createRegistry, sessionStore } from './registry.js';
import { viewOf } from './view.js';
import { drawWorld } from './world/index.js';

const canvas = document.querySelector<HTMLCanvasElement>('#world');
const chromeRoot = document.querySelector<HTMLElement>('#chrome');
if (!canvas || !chromeRoot) throw new Error('index.html lost its #world canvas or its #chrome root');
// The chrome's root lies over the canvas as wide as its blocks; the pointer passes through it to the camera's controls (step 37), and each block that takes the pointer says so itself.
chromeRoot.style.pointerEvents = 'none';

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
const show = (state: MapState): void => chrome.render(createElement(Chrome, { state, registry, dev: import.meta.env.DEV, token }));

const url = mapUrl(location.search);
show({ status: 'loading', url });
const state = await loadMap(url, (target) => fetch(target));
show(state);
if (state.status === 'ready') await drawWorld(canvas, state.map, viewOf(location.search), registry);
