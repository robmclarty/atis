/**
 * notices: the attention budget (§5.4).
 *
 * The map can hold six labels, so this ranking is what the reviewer actually
 * reads: one primary, two secondary, three tertiary, and nothing padded when
 * fewer candidates rank (C7). Every candidate of §5.4 is built, scored the
 * same way and sorted once, and each notice carries the measurements and the
 * coefficients that produced it, so a reviewer who disagrees can argue with
 * the number rather than with the tool (D9, D28).
 *
 * Two kinds are approximations this build owns up to. `.check/` is read at
 * head only (D23), so "newly breached" and "newly introduced" cannot be
 * measured; the structural candidate fires on a finding present at head that
 * names a changed file, the threshold candidate on one whose lines the change
 * touched (D73), and both say so in their `why`.
 */

import type { Config, NoticeConfig, NoticeKind } from './config.js';
import { healthSpan, pathsOf, readRedSplit, spanOnChange, structuralFindings } from './evidence.js';
import type { CheckArtifacts, FileEvidence, RedSplit } from './evidence.js';
import { OTHER_GROUP } from './groups.js';
import type { FileHistory } from './history.js';
import { classifyFile } from './modules.js';
import type { ImportEdge, ScannedFile } from './modules.js';
import type {
  Cell,
  ChangedFile,
  Checks,
  Cochange,
  DepAdded,
  Ghost,
  Group,
  Notice,
  NoticeTier,
} from './schema.js';

/**
 * The six slots of C7, in the order the ranking fills them. The array *is* the
 * budget: a seventh candidate has nowhere to go, and a run with two candidates
 * fills two slots and stops.
 */
const TIERS: readonly NoticeTier[] = ['primary', 'secondary', 'secondary', 'tertiary', 'tertiary', 'tertiary'];

/**
 * What the two head-only kinds say in their `why`. `.check/` is read at head
 * only, so neither can claim this change introduced the finding (D23).
 */
export const HEAD_ONLY = 'present at head, not measured as introduced by this change (.check/ is read at head only)';

/** A namespace import takes whatever the target has, so no name of its own can go missing (C2). */
const STAR = '*';

/** npm audit's roll-up key, which would count every vulnerability a second time. */
const TOTAL = 'total';

/** An import edge with the names it took out of `to`; the deleted-export candidate reads them (D39). */
export type NamedEdge = ImportEdge & { readonly names: readonly string[] };

export type NoticeInputs = {
  /** The placed changed set, keyed by head path, each on one cell or one group (D40, D48). */
  readonly changed: readonly ChangedFile[];
  /** `computeEvidence`'s per-file result: the coverage, the mutants and the reach each candidate is scaled by. */
  readonly files: readonly FileEvidence[];
  /** The verdict block, with the category's split recorded on its slots: a red slot on the change is the loudest candidate there is (D67, D73). */
  readonly checks: Checks;
  /** The assembled cells; `band` and `fan_in` are what make an interface change worth a label. */
  readonly cells: readonly Cell[];
  /** The shore (D48): a non-empty `other` group is a notice of its own, so the table grows instead of the dump. */
  readonly groups: readonly Group[];
  /** Churn, age and bug-fix rate per changed file (D8). */
  readonly history: readonly FileHistory[];
  /** Every co-change pair the window found; the ghosts are the ones that did not come along. */
  readonly cochange: readonly Cochange[];
  /** The manifest delta (D47). */
  readonly deps_added: readonly DepAdded[];
  /** The head scan's files: a name missing from one's `exports[]` is an export this change deleted (D39). */
  readonly headFiles: readonly ScannedFile[];
  readonly headEdges: readonly NamedEdge[];
  /** The base graph, where a deleted file's consumers still live (D39). */
  readonly baseEdges: readonly NamedEdge[];
  /** The artifacts behind the structural, threshold and security candidates (D41). */
  readonly check: CheckArtifacts;
  readonly config: Config;
};

type RanCheck = Extract<CheckArtifacts, { mode: 'check' }>;

type Candidate = {
  readonly kind: NoticeKind;
  readonly target: string;
  readonly why: string;
  readonly inputs: Readonly<Record<string, number>>;
  readonly thresholds: Readonly<Record<string, number>>;
  /**
   * The check slot whose own artifact produced this candidate. A red slot on
   * the change already names its findings there, so a candidate that slot
   * would only repeat is dropped rather than spending a second of the six (C7).
   */
  readonly slot?: string;
};

/** A scored candidate, before the budget hands it a tier. */
type Ranked = Omit<Notice, 'tier'>;

/** The three measurements §5.4 scales a severity by; each is zero when its channel says nothing (C2). */
type Factors = {
  readonly cells_reached: number;
  readonly uncovered_fraction: number;
  readonly history_weight: number;
};

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function ran(check: CheckArtifacts): RanCheck | undefined {
  return check.mode === 'check' ? check : undefined;
}

/** Round a measurement to three decimals so a notice reads as a number rather than as a float. */
function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

/**
 * §5.4's rank: the kind's severity, scaled by how far the change lands, how
 * much of it the tests never saw, and how troubled the file's past is. Each
 * factor is `1 + x`, so a candidate with nothing measured keeps its severity
 * whole and still outranks every milder kind.
 */
function score(severity: number, factors: Factors): number {
  const { cells_reached, uncovered_fraction, history_weight } = factors;
  return severity * (1 + Math.log(1 + cells_reached)) * (1 + uncovered_fraction) * (1 + history_weight);
}

/**
 * D55's rank for a ghost. A ghost is the file that did *not* change, so §5.4's
 * three factors are all zero for it and would tie every ghost at its bare
 * severity, leaving the order to the path alphabet: on checkride PR 4 that cut
 * `translate.ts` (rate 0.857 over 6 commits) for `README.md` (rate 0.5). It is
 * scored instead by the two numbers a ghost does have, in the same shape §5.4
 * takes: rate for the linear factor, support for the logarithmic one.
 */
function cochangeWeight(severity: number, rate: number, support: number): number {
  return severity * (1 + rate) * (1 + Math.log(1 + support));
}

/**
 * The measurements behind one candidate, looked up by its target. A target
 * that is not a changed file (a slot name, a shore group, a ghost that never
 * came along) has none, which leaves its severity unscaled.
 */
function factorsFor(
  target: string,
  evidence: ReadonlyMap<string, FileEvidence>,
  history: ReadonlyMap<string, FileHistory>,
): Factors {
  const coverage = evidence.get(target)?.coverage;
  const past = history.get(target);
  return {
    cells_reached: evidence.get(target)?.cells_reached ?? 0,
    uncovered_fraction:
      coverage === undefined || coverage.changed_executable === 0
        ? 0
        : round((coverage.changed_executable - coverage.covered) / coverage.changed_executable),
    // Churn and bug-fix rate are both dimensionless, and both absent when the window never saw the file (C2).
    history_weight: round((past?.churn_ratio ?? 0) + (past?.bugfix_rate ?? 0)),
  };
}

/** The changed files each slot on the change already names on the map, keyed by slot (D67). */
function redTargets(red: RedSplit): ReadonlyMap<string, ReadonlySet<string>> {
  return new Map(red.change.map((slot) => [slot.name, new Set(slot.change)] as const));
}

/** `a`, `a and b`, `a, b and c`: the slots a red notice names, in the order the split sorted them. */
function listed(names: readonly string[]): string {
  const quoted = names.map((name) => `\`${name}\``);
  const last = quoted.at(-1) ?? '';
  return quoted.length < 2 ? last : `${quoted.slice(0, -1).join(', ')} and ${last}`;
}

/**
 * The gate saying no to this change: one candidate per changed file the
 * change's red names, however many slots name it, its `why` listing them all.
 * Standing red, on untouched files or the whole repository, is drawn and
 * counted but never spends the budget (D67).
 */
function redSlotCandidates(red: RedSplit): readonly Candidate[] {
  const slotsOn = new Map<string, string[]>();
  for (const slot of red.change) {
    for (const path of slot.change) slotsOn.set(path, [...(slotsOn.get(path) ?? []), slot.name]);
  }
  return [...slotsOn].map(([path, names]) => ({
    kind: 'red-check-slot',
    target: path,
    why:
      names.length === 1
        ? `the ${listed(names)} check is red on this changed file`
        : `the ${listed(names)} checks are red on this changed file`,
    inputs: { slots: names.length },
    thresholds: {},
  }));
}

/** A cycle or a boundary violation on a file this change touched: §5.3 calls it LIFR and §5.4 wants it labelled. */
function structuralCandidates(check: RanCheck, changed: ReadonlyMap<string, ChangedFile>): readonly Candidate[] {
  const findings = new Map<string, number>();
  for (const finding of structuralFindings(check.dead)) {
    for (const path of new Set(pathsOf(finding))) {
      if (changed.has(path)) findings.set(path, (findings.get(path) ?? 0) + 1);
    }
  }
  return [...findings].map(([path, count]) => ({
    kind: 'cycle-or-boundary',
    target: path,
    why: `a cycle or boundary violation names this changed file; ${HEAD_ONLY}`,
    inputs: { findings: count },
    thresholds: {},
    slot: 'dead',
  }));
}

/**
 * fallow's four thresholds, breached at head in a function whose lines this
 * change touched, by the line rule the split reads a red `health` by (D9,
 * D23, D73): a finding the change never touched is standing state, and a
 * green slot does not bring it back as a row of its own.
 */
function thresholdCandidates(check: RanCheck, changed: ReadonlyMap<string, ChangedFile>): readonly Candidate[] {
  const hunks = new Map([...changed].map(([path, file]) => [path, file.hunks] as const));
  const breached = new Map<string, string[]>();
  for (const finding of check.health?.findings ?? []) {
    if (!spanOnChange(healthSpan(finding), hunks)) continue;
    const exceeded = breached.get(finding.path) ?? [];
    if (!exceeded.includes(finding.exceeded)) exceeded.push(finding.exceeded);
    breached.set(finding.path, exceeded);
  }
  return [...breached].map(([path, exceeded]) => ({
    kind: 'threshold-breached',
    target: path,
    why: `${exceeded.toSorted(byPath).join(', ')} over threshold in a function this change touched; ${HEAD_ONLY}`,
    inputs: { findings: exceeded.length },
    thresholds: {},
    slot: 'health',
  }));
}

/** Everything the security check counted, once, excluding its own roll-up. */
function securityCandidates(check: RanCheck): readonly Candidate[] {
  const counts = Object.entries(check.security?.vulnerabilities ?? {}).filter(
    ([kind, count]) => kind !== TOTAL && count > 0,
  );
  if (counts.length === 0) return [];
  const found = counts.reduce((total, [, count]) => total + count, 0);
  const named = counts
    .toSorted(([a], [b]) => byPath(a, b))
    .map(([kind, count]) => `${String(count)} ${kind}`)
    .join(', ');
  return [
    {
      kind: 'security-finding',
      target: 'security',
      why: `the security check counts ${String(found)} vulnerabilities (${named})`,
      inputs: { vulnerabilities: found },
      thresholds: {},
      slot: 'security',
    },
  ];
}

/** The innermost cell of every terrain file; a file appears in exactly one cell's `organelles` (D45). */
function cellOf(cells: readonly Cell[]): ReadonlyMap<string, string> {
  return new Map(cells.flatMap((cell) => cell.organelles.map((path) => [path, cell.id] as const)));
}

/**
 * The terrain files something outside their own cell imports. With the barrel
 * a cell has, those are its interface; without one they are its interface by
 * definition, which is why nothing here depends on a barrel existing (D45).
 */
function interfaceFiles(edges: readonly ImportEdge[], home: ReadonlyMap<string, string>): ReadonlySet<string> {
  const entrances = new Set<string>();
  for (const { from, to } of edges) {
    const inside = home.get(from);
    const target = home.get(to);
    if (inside === undefined || target === undefined || inside === target) continue;
    entrances.add(to);
  }
  return entrances;
}

/** A changed interface file on a cell many read, or one far down the abyss: the reviewer's first stop (§5.2). */
function interfaceCandidates(inputs: NoticeInputs, home: ReadonlyMap<string, string>): readonly Candidate[] {
  const { fan_in_high, deep_band } = inputs.config.notices;
  // fallow's own 95th percentile when the run measured one, which is what "high" means in this repository (D9).
  const highFanIn = ran(inputs.check)?.health?.fan_in_p95 ?? fan_in_high;
  const cells = new Map(inputs.cells.map((cell) => [cell.id, cell] as const));
  const entrances = interfaceFiles(inputs.headEdges, home);

  return inputs.changed.flatMap((file): Candidate[] => {
    const cell = file.cell === undefined ? undefined : cells.get(file.cell);
    if (cell === undefined || !(file.is_barrel || entrances.has(file.path))) return [];
    const wide = cell.fan_in !== undefined && cell.fan_in >= highFanIn;
    const deep = cell.band >= deep_band;
    if (!wide && !deep) return [];
    const reasons = [
      ...(wide ? [`${String(cell.fan_in ?? 0)} files read it`] : []),
      ...(deep ? [`it sits in band ${String(cell.band)}`] : []),
    ];
    return [
      {
        kind: 'interface-change',
        target: file.path,
        why: `the interface of \`${cell.path}\` changed and ${reasons.join(' and ')}`,
        inputs: { band: cell.band, ...(cell.fan_in === undefined ? {} : { fan_in: cell.fan_in }) },
        thresholds: { fan_in_high: highFanIn, deep_band },
      },
    ];
  });
}

/** Changed lines no test ran, in a file whose reach touches enough cells that nobody can read them all (D27). */
function coverageCandidates(inputs: NoticeInputs): readonly Candidate[] {
  const { high_reach_cells } = inputs.config.category;
  return inputs.files.flatMap((file): Candidate[] => {
    const uncovered = file.coverage?.uncovered_lines.length ?? 0;
    if (uncovered === 0 || file.cells_reached < high_reach_cells) return [];
    return [
      {
        kind: 'uncovered-high-reach',
        target: file.path,
        why: `${String(uncovered)} changed lines are uncovered and the change reaches ${String(file.cells_reached)} cells`,
        inputs: { uncovered_lines: uncovered },
        thresholds: { high_reach_cells },
      },
    ];
  });
}

/** The tests ran over these lines and did not notice them change (§5.2). */
function mutantCandidates(inputs: NoticeInputs): readonly Candidate[] {
  return inputs.files
    .filter((file) => file.mutants.length > 0)
    .map((file) => ({
      kind: 'survived-mutants' as const,
      target: file.path,
      why: `${String(file.mutants.length)} mutants survived on the changed lines`,
      inputs: { mutants: file.mutants.length },
      thresholds: {},
    }));
}

/** A big change where changes have gone wrong before (CHID's churn and bug-fix rate, D8). */
function hotCandidates(inputs: NoticeInputs, history: ReadonlyMap<string, FileHistory>): readonly Candidate[] {
  const { large_lines, hot_churn_ratio, hot_bugfix_rate } = inputs.config.notices;
  return inputs.changed.flatMap((file): Candidate[] => {
    // The shore has a history too, but a lockfile is always large and always churning, which is not news (§5.4).
    if (file.cell === undefined) return [];
    const lines = file.added + file.deleted;
    const past = history.get(file.path);
    const churn = past?.churn_ratio;
    const bugfix = past?.bugfix_rate;
    const hot = (churn !== undefined && churn >= hot_churn_ratio) || (bugfix !== undefined && bugfix >= hot_bugfix_rate);
    if (lines < large_lines || !hot) return [];
    const reasons = [
      ...(churn === undefined ? [] : [`churn ${String(round(churn))}`]),
      ...(bugfix === undefined ? [] : [`a bug-fix rate of ${String(round(bugfix))}`]),
    ];
    return [
      {
        kind: 'large-hot-change',
        target: file.path,
        why: `${String(lines)} lines changed in a file with ${reasons.join(' and ')}`,
        inputs: { lines },
        thresholds: { large_lines, hot_churn_ratio, hot_bugfix_rate },
      },
    ];
  });
}

/** Old and quiet: nothing has needed to touch this in a year, and now something has (§5.1). */
function bedrockCandidates(inputs: NoticeInputs, history: ReadonlyMap<string, FileHistory>): readonly Candidate[] {
  const { bedrock_age_days, bedrock_churn_ratio } = inputs.config.notices;
  return inputs.changed.flatMap((file): Candidate[] => {
    const past = file.cell === undefined ? undefined : history.get(file.path);
    const age = past?.age_days;
    const churn = past?.churn_ratio;
    if (age === undefined || churn === undefined || age < bedrock_age_days || churn > bedrock_churn_ratio) return [];
    return [
      {
        kind: 'bedrock-change',
        target: file.path,
        why: `bedrock: ${String(age)} days old and quiet since, with churn ${String(round(churn))}`,
        inputs: { age_days: age, churn_ratio: round(churn) },
        thresholds: { bedrock_age_days, bedrock_churn_ratio },
      },
    ];
  });
}

/**
 * The files that usually come along and did not (CHID eq. 3). The notice
 * points at the absent file, which is where §5.2 draws its ghost, and the
 * `why` names the changed file that expected it.
 */
export function findGhosts(
  cochange: readonly Cochange[],
  changed: readonly string[],
  config: NoticeConfig,
): readonly Ghost[] {
  const here = new Set(changed);
  const absent = new Map<string, { readonly with: string[]; rate: number; support: number }>();
  for (const pair of cochange) {
    if (!here.has(pair.a) || here.has(pair.b)) continue;
    if (pair.rate < config.cochange_rate || pair.support < config.cochange_support) continue;
    const ghost = absent.get(pair.b) ?? { with: [], rate: 0, support: 0 };
    ghost.with.push(pair.a);
    ghost.rate = Math.max(ghost.rate, pair.rate);
    ghost.support = Math.max(ghost.support, pair.support);
    absent.set(pair.b, ghost);
  }
  return [...absent]
    .map(([path, ghost]): Ghost => ({
      path,
      with: ghost.with.toSorted(byPath),
      rate: round(ghost.rate),
      support: ghost.support,
    }))
    .toSorted((a, b) => byPath(a.path, b.path));
}

function ghostCandidates(inputs: NoticeInputs, ghosts: readonly Ghost[]): readonly Candidate[] {
  const { cochange_rate, cochange_support } = inputs.config.notices;
  return ghosts.map((ghost) => ({
    kind: 'missing-cochange' as const,
    target: ghost.path,
    why: `usually changes with \`${ghost.with[0] ?? ''}\` (${String(ghost.support)} commits, rate ${String(ghost.rate)}) and did not`,
    inputs: { rate: ghost.rate, support: ghost.support },
    thresholds: { cochange_rate, cochange_support },
  }));
}

/** The clause the deleted-export `why` ends on, singular for a lone consumer (`1 file still imports it`). */
function stillImports(consumers: number): string {
  return consumers === 1 ? '1 file still imports it' : `${String(consumers)} files still import it`;
}

/**
 * Exported symbols this change removed that something still imports (D39).
 * The consumers are the base graph's, because a file this change deleted has
 * no head edge left to find them by; a consumer whose head version dropped the
 * name, or the import altogether, has already moved on and is not counted. A
 * deleted file is the one case that cannot be told apart, since a consumer
 * that kept a broken import and one that removed it both leave no head edge,
 * and the base importer is kept. A failing test is the test slot's to report,
 * so a test is not a consumer here (D4).
 */
function deletedExportCandidates(inputs: NoticeInputs, changed: ReadonlyMap<string, ChangedFile>): readonly Candidate[] {
  const headExports = new Map(inputs.headFiles.map((file) => [file.path, new Set(file.exports)] as const));
  const headTakes = new Map<string, ReadonlySet<string>>();
  for (const edge of inputs.headEdges) headTakes.set(`${edge.from}\n${edge.to}`, new Set(edge.names));

  const consumers = new Map<string, Map<string, Set<string>>>();
  for (const { from, to, names } of inputs.baseEdges) {
    const file = changed.get(to);
    if (file === undefined || file.kind === 'added' || file.cell === undefined) continue;
    if (!headExports.has(from) || classifyFile(from) === 'test') continue;
    const exported = headExports.get(to);
    const missing = names.filter((name) => name !== STAR && exported?.has(name) !== true);
    const taken = headTakes.get(`${from}\n${to}`);
    // The target still stands at head, so the head edge is the truth about what this consumer takes today.
    const live = exported === undefined ? missing : missing.filter((name) => taken?.has(name) === true);
    if (live.length === 0) continue;
    const gone = consumers.get(to) ?? new Map<string, Set<string>>();
    for (const name of live) gone.set(name, (gone.get(name) ?? new Set<string>()).add(from));
    consumers.set(to, gone);
  }

  return [...consumers].map(([path, gone]) => {
    const names = [...gone.keys()].toSorted(byPath);
    const importers = new Set([...gone.values()].flatMap((from) => [...from]));
    return {
      kind: 'deleted-export' as const,
      target: path,
      why: `${names.map((name) => `\`${name}\``).join(', ')} no longer exported, and ${stillImports(importers.size)}`,
      inputs: { names: names.length, consumers: importers.size },
      thresholds: {},
    };
  });
}

/** New surface the repository did not have before, one notice per manifest that grew (D47). */
function dependencyCandidates(inputs: NoticeInputs): readonly Candidate[] {
  const added = new Map<string, DepAdded[]>();
  for (const dep of inputs.deps_added) added.set(dep.manifest, [...(added.get(dep.manifest) ?? []), dep]);
  return [...added].map(([manifest, deps]) => ({
    kind: 'new-dependency' as const,
    target: manifest,
    why: `${String(deps.length)} new dependencies: ${deps.map((dep) => dep.name).toSorted(byPath).join(', ')}`,
    inputs: { deps_added: deps.length },
    thresholds: {},
  }));
}

/** The name a shore rule would have to match: the extension, or the whole name when it is all extension. */
function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot) : name;
}

/**
 * The shore group no rule claimed. D48 keeps it loud rather than absorbent: a
 * notice naming the extensions is how the table grows instead of the dump.
 */
function otherGroupCandidates(inputs: NoticeInputs): readonly Candidate[] {
  const other = inputs.groups.find((group) => group.id === OTHER_GROUP);
  if (other === undefined || other.files.length === 0) return [];
  const kinds = [...new Set(other.files.map(extensionOf))].toSorted(byPath);
  return [
    {
      kind: 'other-group',
      target: OTHER_GROUP,
      why: `${String(other.files.length)} files no shore rule claims: ${kinds.join(', ')}`,
      inputs: { files: other.files.length, kinds: kinds.length },
      thresholds: {},
    },
  ];
}

function candidatesFor(inputs: NoticeInputs, ghosts: readonly Ghost[], red: RedSplit): readonly Candidate[] {
  const changed = new Map(inputs.changed.map((file) => [file.path, file] as const));
  const history = new Map(inputs.history.map((file) => [file.path, file] as const));
  const home = cellOf(inputs.cells);
  const check = ran(inputs.check);

  return [
    ...redSlotCandidates(red),
    ...(check === undefined ? [] : structuralCandidates(check, changed)),
    ...(check === undefined ? [] : thresholdCandidates(check, changed)),
    ...(check === undefined ? [] : securityCandidates(check)),
    ...deletedExportCandidates(inputs, changed),
    ...interfaceCandidates(inputs, home),
    ...coverageCandidates(inputs),
    ...mutantCandidates(inputs),
    ...hotCandidates(inputs, history),
    ...ghostCandidates(inputs, ghosts),
    ...dependencyCandidates(inputs),
    ...bedrockCandidates(inputs, history),
    ...otherGroupCandidates(inputs),
  ];
}

/**
 * Rank every candidate of §5.4 and keep the six the map has room for (C7).
 * Ties break by path and then by kind, as the step asks, and finally by `why`,
 * so two kinds on one file land in a fixed order and two runs over one input
 * produce one map (C3).
 */
export function rankNotices(inputs: NoticeInputs): readonly Notice[] {
  const evidence = new Map(inputs.files.map((file) => [file.path, file] as const));
  const history = new Map(inputs.history.map((file) => [file.path, file] as const));
  const ghosts = findGhosts(inputs.cochange, inputs.changed.map((file) => file.path), inputs.config.notices);
  const red = readRedSplit(inputs.checks.slots);
  const spokenFor = redTargets(red);
  const { severity } = inputs.config.notices;

  return candidatesFor(inputs, ghosts, red)
    .filter((candidate) => candidate.slot === undefined || spokenFor.get(candidate.slot)?.has(candidate.target) !== true)
    .map((candidate): Ranked => {
      const severityOf = severity[candidate.kind];
      // D55: a ghost is the file that did *not* change, so §5.4's reach, coverage
      // and churn are all zero for it; it is weighed by the rate and support it
      // carries instead, and its inputs are those two numbers alone, with no
      // zeroed factors dragged in. Every other kind keeps the changed-file factors.
      const factors = candidate.kind === 'missing-cochange' ? undefined : factorsFor(candidate.target, evidence, history);
      const weight = factors
        ? score(severityOf, factors)
        : cochangeWeight(severityOf, candidate.inputs['rate'] ?? 0, candidate.inputs['support'] ?? 0);
      return {
        kind: candidate.kind,
        target: candidate.target,
        why: candidate.why,
        inputs: { ...factors, ...candidate.inputs },
        thresholds: { severity: severityOf, ...candidate.thresholds },
        weight: round(weight),
      };
    })
    .toSorted(
      (a, b) => b.weight - a.weight || byPath(a.target, b.target) || byPath(a.kind, b.kind) || byPath(a.why, b.why),
    )
    .flatMap((notice, index): Notice[] => {
      const tier = TIERS[index];
      return tier === undefined ? [] : [{ ...notice, tier }];
    });
}
