/**
 * el: the one way an element gets into the SVG.
 *
 * Every tag the renderer emits comes through `el`, which is what makes the
 * output safe by construction: attribute values and text are escaped here and
 * nowhere else, so a file called `a<b>&"c".ts` lands in a `data-id` and in a
 * label as the same characters it left with. A child is either markup `el`
 * already built, nested as indented block lines, or a string, which is text:
 * escaped, and kept inline so no whitespace lands inside a `<text>`. Numbers
 * are written at two decimals with trailing zeros dropped, the layout's own
 * precision, so the file reads and diffs the way `map.json` does.
 */

export type AttrValue = string | number | undefined;
/** An attribute set to `undefined` is left out, so an optional mark costs one expression. */
export type Attrs = Readonly<Record<string, AttrValue>>;

/** Markup `el` built. The wrapper is what keeps a raw string from being nested unescaped. */
export type Markup = { readonly markup: string };
export type Child = Markup | string;

const ESCAPES: ReadonlyMap<string, string> = new Map([
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
  ["'", '&#39;'],
]);

const UNSAFE = /[&<>"']/g;
const PRECISION = 100;
const INDENT = '  ';

/** The five characters XML cannot carry raw, in either an attribute or text. */
export function escapeMarkup(value: string): string {
  return value.replace(UNSAFE, (char) => ESCAPES.get(char) ?? char);
}

/** A number as the SVG writes it: two decimals, no trailing zeros, `-0` as `0`. */
export function num(value: number): string {
  return String(Math.round(value * PRECISION) / PRECISION);
}

function isMarkup(child: Child): child is Markup {
  return typeof child !== 'string';
}

function attrsOf(attrs: Attrs): string {
  return Object.entries(attrs)
    .flatMap(([name, value]) => {
      if (value === undefined) return [];
      return [` ${name}="${typeof value === 'number' ? num(value) : escapeMarkup(value)}"`];
    })
    .join('');
}

function indent(markup: string): string {
  return markup
    .split('\n')
    .map((line) => INDENT + line)
    .join('\n');
}

/**
 * One element. No children closes the tag in place; children that are all
 * markup are laid out one per line beneath it; any text among them keeps the
 * whole element on one line, since whitespace inside `<text>` is content.
 */
export function el(tag: string, attrs: Attrs = {}, children: readonly Child[] = []): Markup {
  const open = `<${tag}${attrsOf(attrs)}`;
  if (children.length === 0) return { markup: `${open}/>` };
  if (children.every(isMarkup)) {
    return { markup: [`${open}>`, ...children.map((child) => indent(child.markup)), `</${tag}>`].join('\n') };
  }
  const inline = children.map((child) => (isMarkup(child) ? child.markup : escapeMarkup(child))).join('');
  return { markup: `${open}>${inline}</${tag}>` };
}

/** The file: the root's markup and the one trailing newline a text file ends in. */
export function serialize(root: Markup): string {
  return `${root.markup}\n`;
}
