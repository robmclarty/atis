/**
 * panel: the dev panel (D156), an instrument for developers and admins and no
 * part of the design a user sees. It lists every token by the sections the
 * design doc gives them and moves each live through the registry, so the
 * world's materials and the scheduler show the change on the next frame. It
 * is drawn flat in the chrome's material (D12), at the scene's resting values
 * rather than the registry's, since an instrument that moved with the tokens
 * it tunes could tune itself out of sight. Its changes last for the session,
 * and it copies them as a patch for the design doc's log of balance patches
 * (Q3).
 */

import { CHROME_GROUND, CHROME_INK, CHROME_MUTED, CHROME_RULE, CHANGE_HUE, FONT_FAMILY, IFR_HUE } from 'scene';
import { useEffect, useReducer, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';

import { isColour, isNumbers } from '../registry.js';
import type { Registry } from '../registry.js';
import { patchOf } from './patch.js';

/** Where the patch is copied to; the page's clipboard unless a test hands in its own. */
export type Copy = (text: string) => Promise<void>;

const clipboard: Copy = async (text) => {
  if (!('clipboard' in navigator)) throw new Error('this page has no clipboard');
  await navigator.clipboard.writeText(text);
};

const PANEL: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  width: 360,
  boxSizing: 'border-box',
  padding: 8,
  background: CHROME_GROUND,
  color: CHROME_INK,
  borderRight: `1px solid ${CHROME_RULE}`,
  borderTop: `1px solid ${CHROME_RULE}`,
  fontFamily: FONT_FAMILY,
  fontSize: 11,
  lineHeight: 1.4,
  pointerEvents: 'auto',
};
const HEADER: CSSProperties = { display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 6 };
const BUTTON: CSSProperties = { font: 'inherit', color: CHROME_INK, background: 'transparent', border: `1px solid ${CHROME_MUTED}`, padding: '1px 6px', cursor: 'pointer' };
const PATCH: CSSProperties = { margin: '0 0 8px', padding: 6, border: `1px solid ${CHROME_RULE}`, whiteSpace: 'pre-wrap', wordBreak: 'break-all', font: 'inherit', color: CHROME_MUTED, maxHeight: 160, overflowY: 'auto' };
const TITLE: CSSProperties = { margin: '10px 0 4px', fontSize: 11, fontWeight: 'normal', color: CHROME_MUTED, borderBottom: `1px solid ${CHROME_RULE}` };
const ROW: CSSProperties = { display: 'grid', gridTemplateColumns: '150px 1fr auto', gap: 6, alignItems: 'center', padding: '1px 0' };
const NAME: CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const INPUT: CSSProperties = { font: 'inherit', color: CHROME_INK, background: 'transparent', border: `1px solid ${CHROME_RULE}`, padding: '0 3px', width: '100%', boxSizing: 'border-box' };
const CONTROLS: CSSProperties = { display: 'flex', gap: 4, alignItems: 'center', minWidth: 0 };

/**
 * The text in an input while it is typed: it follows the value when the value
 * moves under it (a slider, a reset) and stays as typed while it still means
 * the value, so `0.` is not snapped back to `0` under the typist.
 */
const useDraft = (value: string, agrees: (draft: string) => boolean): [string, (draft: string) => void] => {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (!agrees(draft)) setDraft(value);
  }
  return [draft, setDraft];
};

/** The range a number's slider runs over, round where it rests, and the step both its controls move by. */
const scaleFor = (rest: number): { readonly min: number; readonly max: number; readonly step: number } => {
  const span = Math.max(1, Math.abs(rest) * 3);
  const step = 10 ** Math.floor(Math.log10(span)) / 100;
  return rest < 0 ? { min: -span, max: span, step } : { min: 0, max: Math.abs(rest) <= 1 ? 1 : span, step };
};

const NumberControl = ({ value, rest, set }: { readonly value: number; readonly rest: number; readonly set: (value: number) => void }): ReactElement => {
  const [draft, setDraft] = useDraft(String(value), (text) => Number(text) === value);
  const { min, max, step } = scaleFor(rest);
  const typed = (text: string): void => {
    setDraft(text);
    const next = Number(text);
    if (text.trim() !== '' && Number.isFinite(next)) set(next);
  };
  return (
    <span style={CONTROLS}>
      <input type="range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, value))} onChange={(event) => set(Number(event.target.value))} style={{ flex: 1, minWidth: 40 }} />
      <input type="number" step={step} value={draft} onChange={(event) => typed(event.target.value)} style={{ ...INPUT, width: 72 }} />
    </span>
  );
};

const ColourControl = ({ value, set }: { readonly value: string; readonly set: (value: string) => void }): ReactElement => (
  <span style={CONTROLS}>
    <input type="color" value={value} onChange={(event) => set(event.target.value)} style={{ width: 28, height: 18, padding: 0, border: `1px solid ${CHROME_RULE}`, background: 'transparent' }} />
    <code>{value}</code>
  </span>
);

const TextControl = ({ value, set }: { readonly value: string; readonly set: (value: string) => void }): ReactElement => (
  <input type="text" value={value} onChange={(event) => set(event.target.value)} style={INPUT} />
);

const JsonControl = ({ value, set }: { readonly value: unknown; readonly set: (value: unknown) => void }): ReactElement => {
  const text = JSON.stringify(value);
  const parses = (draft: string): boolean => {
    try {
      return JSON.stringify(JSON.parse(draft)) === text;
    } catch {
      return false;
    }
  };
  const [draft, setDraft] = useDraft(text, parses);
  const [invalid, setInvalid] = useState(false);
  const typed = (next: string): void => {
    setDraft(next);
    try {
      set(JSON.parse(next));
      setInvalid(false);
    } catch {
      setInvalid(true);
    }
  };
  return <textarea value={draft} onChange={(event) => typed(event.target.value)} data-invalid={invalid || undefined} rows={2} style={{ ...INPUT, resize: 'vertical', borderColor: invalid ? IFR_HUE : CHROME_RULE }} />;
};

/** The control for a token, by the kind it rests at (and is held at, since the registry refuses another kind); anything else is edited as JSON. */
const Control = ({ value, rest, set }: { readonly value: unknown; readonly rest: unknown; readonly set: (value: unknown) => void }): ReactElement => {
  if (typeof rest === 'number' && typeof value === 'number') return <NumberControl value={value} rest={rest} set={set} />;
  if (isColour(rest) && typeof value === 'string') return <ColourControl value={value} set={set} />;
  if (typeof rest === 'string' && typeof value === 'string') return <TextControl value={value} set={set} />;
  if (isNumbers(rest) && isNumbers(value)) {
    return (
      <span style={{ ...CONTROLS, flexWrap: 'wrap' }}>
        {value.map((each, index) => (
          <input key={index} type="number" step={scaleFor(rest[index] ?? each).step} value={each} onChange={(event) => set(value.with(index, Number(event.target.value)))} style={{ ...INPUT, width: 52 }} />
        ))}
      </span>
    );
  }
  return <JsonControl value={value} set={set} />;
};

const Row = ({ registry, name }: { readonly registry: Registry; readonly name: string }): ReactElement => {
  const value = registry.get(name);
  const rest = registry.rest(name);
  const changed = JSON.stringify(value) !== JSON.stringify(rest);
  return (
    <div data-token={name} data-changed={changed || undefined} style={ROW}>
      <span style={{ ...NAME, color: changed ? CHANGE_HUE : CHROME_INK }} title={name}>
        {name}
      </span>
      <Control value={value} rest={rest} set={(next) => registry.set(name, next)} />
      {changed ? (
        <button type="button" aria-label={`reset ${name}`} title="back to where it rests" onClick={() => registry.reset(name)} style={BUTTON}>
          ↺
        </button>
      ) : (
        <span />
      )}
    </div>
  );
};

/** The panel over a registry; `onClose` is the chrome's, and `copy` the clipboard's unless a test hands in its own. */
export const DevPanel = ({ registry, onClose, copy = clipboard }: { readonly registry: Registry; readonly onClose: () => void; readonly copy?: Copy }): ReactElement => {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => registry.subscribe(() => bump()), [registry]);
  const [copied, setCopied] = useState<'' | 'copied' | 'no clipboard'>('');
  const changes = registry.changes();
  const patch = patchOf(changes);
  const onCopy = (): void => {
    copy(patch).then(
      () => setCopied('copied'),
      () => setCopied('no clipboard'),
    );
  };
  return (
    <aside data-dev-panel role="region" aria-label="tokens" style={PANEL}>
      <header style={HEADER}>
        <strong>tokens</strong>
        <span style={{ color: CHROME_MUTED, flex: 1 }}>{changes.length === 0 ? 'at rest' : `${String(changes.length)} moved`}</span>
        <button type="button" data-copy-patch onClick={onCopy} disabled={changes.length === 0} style={BUTTON}>
          {copied === '' ? 'copy patch' : copied}
        </button>
        <button type="button" onClick={() => registry.reset()} disabled={changes.length === 0} style={BUTTON}>
          reset all
        </button>
        <button type="button" aria-label="close" onClick={onClose} style={BUTTON}>
          ×
        </button>
      </header>
      {changes.length > 0 && <pre data-patch style={PATCH}>{patch}</pre>}
      {registry.sections.map((section) => (
        <section key={section.title} data-section={section.title}>
          <h3 style={TITLE}>{section.title}</h3>
          {section.names.map((name) => (
            <Row key={name} registry={registry} name={name} />
          ))}
        </section>
      ))}
    </aside>
  );
};
