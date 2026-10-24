/**
 * drift: inside an opened cell, each file floats about its place by how
 * loosely it is held there (D157). Its looseness is the share of its import
 * ties that leave the cell, counted both ways on the head graph between
 * terrain files: a hub held by many cellmates sits still near the middle, and
 * a file that works with none of them wanders the whole cell, bumping the
 * membrane and its neighbours. Drift means looseness, as C11 names it.
 *
 * A file alone in its cell, a deleted file, and a file the map gives no
 * `ties` stay still (C2). So does every file while its cell is closed, under
 * reduced motion, and in the SVG, which never draws it.
 *
 * Each frame is a function of the time alone: a seeded wander, two slow sines
 * at rates drawn from the file's path and the seed, eased in as the cell
 * opens; then a few rounds pushing bodies apart, the looser giving way more,
 * and each moved body back inside the membrane. One seed and one time give one
 * frame, at any frame rate (D94, C3).
 */

import type { MapJson, Organelle } from 'core';

import { openRing } from './raster.js';
import type { Ring } from './raster.js';
import { draw, seedOf } from './shape.js';
import { DRIFT_EASE_MS, DRIFT_GAP, DRIFT_HZ_MAX, DRIFT_HZ_MIN, DRIFT_REACH } from './tokens.js';

/** A file of the opened cell where the drift has it, and how loose it is; `undefined` for a file that stays still. */
export type Drifted = { readonly id: string; readonly x: number; readonly y: number; readonly r: number; readonly looseness: number | undefined };

/** How many rounds of pushing apart and pulling back in a frame takes. */
const ROUNDS = 12;

/**
 * A file's looseness, 0 to 1: the share of its ties that leave its cell, and 1
 * for a file with none. A file the map gives no ties has none (C2).
 */
export function loosenessOf(organelle: Organelle): number | undefined {
  const ties = organelle.ties;
  if (ties === undefined) return undefined;
  const total = ties.inside + ties.outside;
  return total === 0 ? 1 : ties.outside / total;
}

type Body = { id: string; x: number; y: number; readonly r: number; readonly restX: number; readonly restY: number; readonly mobility: number };

/** The point on a ring nearest `(x, y)`. */
function nearestOn(ring: Ring, x: number, y: number): readonly [number, number] {
  let best: readonly [number, number] = ring[0] ?? [x, y];
  let bestD2 = Number.POSITIVE_INFINITY;
  ring.forEach(([ax, ay], index) => {
    const [bx, by] = ring[(index + 1) % ring.length] ?? [ax, ay];
    const dx = bx - ax;
    const dy = by - ay;
    const length2 = dx * dx + dy * dy;
    const t = length2 === 0 ? 0 : Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / length2));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const d2 = (x - px) ** 2 + (y - py) ** 2;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = [px, py];
    }
  });
  return best;
}

/** Whether `(x, y)` lies inside a ring, by the even-odd rule. */
function insideRing(ring: Ring, x: number, y: number): boolean {
  let inside = false;
  ring.forEach(([ax, ay], index) => {
    const [bx, by] = ring[(index + 1) % ring.length] ?? [ax, ay];
    if (ay > y !== by > y && x < ax + ((y - ay) / (by - ay)) * (bx - ax)) inside = !inside;
  });
  return inside;
}

/** Bring a body back inside the membrane, clear of it by its radius and the gap, toward where it rests, which the layout put inside. */
function keepIn(body: Body, ring: Ring): void {
  const [qx, qy] = nearestOn(ring, body.x, body.y);
  const clearance = body.r + DRIFT_GAP;
  const inside = insideRing(ring, body.x, body.y);
  if (inside && Math.hypot(body.x - qx, body.y - qy) >= clearance) return;
  const towardX = body.restX - qx;
  const towardY = body.restY - qy;
  const toward = Math.hypot(towardX, towardY);
  if (toward === 0) return;
  const reach = Math.min(clearance, toward);
  body.x = qx + (towardX / toward) * reach;
  body.y = qy + (towardY / toward) * reach;
}

/** Push two overlapping bodies apart along the line between them, each by its share of the two's mobility. */
function separate(a: Body, b: Body): void {
  const free = a.mobility + b.mobility;
  if (free <= 0) return;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const overlap = a.r + b.r + DRIFT_GAP - distance;
  if (overlap <= 0) return;
  const [ux, uy] = distance === 0 ? [1, 0] : [dx / distance, dy / distance];
  a.x -= ux * overlap * (a.mobility / free);
  a.y -= uy * overlap * (a.mobility / free);
  b.x += ux * overlap * (b.mobility / free);
  b.y += uy * overlap * (b.mobility / free);
}

/** A cell's middle and radius: the centre of its contour's points, and the farthest of them from it. */
function extentOf(ring: Ring): { readonly x: number; readonly y: number; readonly radius: number } {
  const x = ring.reduce((total, [px]) => total + px, 0) / ring.length;
  const y = ring.reduce((total, [, py]) => total + py, 0) / ring.length;
  return { x, y, radius: Math.max(...ring.map(([px, py]) => Math.hypot(px - x, py - y))) };
}

/**
 * Where each placed file of `cell` is, `t` milliseconds after the cell
 * opened, by path. A closed cell (`t` undefined), reduced motion, or a cell
 * with one file leaves every file where the layout put it.
 */
export function driftOf(map: MapJson, cell: string, t: number | undefined, seed: number, reduced = false): readonly Drifted[] {
  const positions = map.terrain.layout?.positions ?? {};
  const contour = map.terrain.layout?.contours?.[cell];
  const files = map.terrain.organelles
    .filter((organelle) => organelle.cell === cell && positions[organelle.id] !== undefined)
    .toSorted((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const still = t === undefined || reduced || files.length < 2 || contour === undefined || contour.length < 3;
  const placed = files.map((organelle): Drifted => {
    const at = positions[organelle.id] ?? { x: 0, y: 0, r: 0 };
    return { id: organelle.id, x: at.x, y: at.y, r: at.r, looseness: still ? undefined : loosenessOf(organelle) };
  });
  if (still) return placed;

  const ring = openRing(contour);
  const { radius } = extentOf(ring);
  const ease = Math.min(1, Math.max(0, t / DRIFT_EASE_MS));
  const eased = ease * ease * (3 - 2 * ease);
  const seconds = t / 1000;
  const bodies = placed.map((file): Body => {
    const mobility = file.looseness ?? 0;
    const own = (seedOf(file.id) ^ Math.imul(seed >>> 0, 0x9e_37_79_b9)) >>> 0;
    const rate = (i: number): number => DRIFT_HZ_MIN + draw(own, i) * (DRIFT_HZ_MAX - DRIFT_HZ_MIN);
    const phase = (i: number): number => draw(own, i) * 2 * Math.PI;
    const reach = mobility * DRIFT_REACH * radius * eased;
    return {
      id: file.id,
      x: file.x + reach * Math.sin(2 * Math.PI * rate(0) * seconds + phase(2)),
      y: file.y + reach * Math.sin(2 * Math.PI * rate(1) * seconds + phase(3)),
      r: file.r,
      restX: file.x,
      restY: file.y,
      mobility,
    };
  });
  for (let round = 0; round < ROUNDS; round += 1) {
    for (const body of bodies) if (body.mobility > 0) keepIn(body, ring);
    bodies.forEach((body, index) => {
      for (const other of bodies.slice(index + 1)) separate(body, other);
    });
  }
  return bodies.map((body, index) => ({ id: body.id, x: body.x, y: body.y, r: body.r, looseness: placed[index]?.looseness }));
}
