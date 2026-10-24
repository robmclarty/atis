/**
 * main: the page's entry. It finds its map (D93), says where the load is in
 * the chrome, and once the map is read and trusted draws the world under it.
 */

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { FIELD_FILL } from 'scene';

import { Status } from './chrome/index.js';
import { loadMap, mapUrl } from './load.js';
import type { MapState } from './load.js';
import { drawField } from './world/index.js';

const canvas = document.querySelector<HTMLCanvasElement>('#world');
const chromeRoot = document.querySelector<HTMLElement>('#chrome');
if (!canvas || !chromeRoot) throw new Error('index.html lost its #world canvas or its #chrome root');

document.body.style.background = FIELD_FILL;
const chrome = createRoot(chromeRoot);
const show = (state: MapState): void => chrome.render(createElement(Status, { state }));

const url = mapUrl(location.search);
show({ status: 'loading', url });
const state = await loadMap(url, (target) => fetch(target));
show(state);
if (state.status === 'ready') await drawField(canvas, state.map);
