# Spec: reach at plan time

Draft, 2026-11-11. Written from a chat in plumbbob about how far a step's change is allowed to
stray before a reviewer should look twice. Its companion on plumbbob's side is
`plumbbob/research/17-proof-reach-and-research.md`, which fixes the shape this spec hands over;
nothing in atis depends on plumbbob, and the entry point stands on its own for anyone who wants to
know, before they change a file, what that change would touch.

## 1. Problem

atis answers "what did this change reach?" Every input it reads is a change that already
happened: a diff from base to head, its hunks, the cells it moved. A planner asks the question
the other way round. Before step 3 of a plan is built, it knows the files the step means to
change (the step's **seam**, in plumbbob's word) and it wants to know which other files a change
there usually drags along. That ring is the step's **reach**.

The two together turn a vague worry into a number. After the step lands, every file in its diff
falls into one of three bins:

- **in the seam:** planned;
- **in the reach, not the seam:** the ripple the plan should have expected, worth a glance;
- **outside both:** out of plumb, named to the person at the pause.

Today the only way to get the ring is to make the change first and ask atis afterwards, which is
the one moment it no longer helps a plan. The MCP `reach` tool (`apps/atis/src/mcp.ts:71`) has
the same limit: it reads the reach out of a map that has already been drawn from a diff.

## 2. Solution overview

A new verb, `atis reach`, takes repository paths and answers with the reach a change to them
would have, as JSON on stdout:

```sh
atis reach --json src/limiter.ts src/__tests__/limiter.test.ts
atis reach --json src/lib/
```

It reuses what atis already knows how to compute and adds no new kind of evidence:

- **Import reach** is `computeReach` (`libs/core/src/reach.ts:259`), fed a synthetic change: one
  `modified` entry per named file, walked over the head scan's reverse import edges, attenuated by
  module hop exactly as [D5 (reach-by-module-hop)](../../SPEC.md#d5) says. A file named but not
  yet on disk is a new file; nothing imports it yet, so it has no import reach, and the answer
  says so rather than leaving it out.
- **Co-change reach** is `computeHistory` (`libs/core/src/history.ts:68`) over the same window a
  map run reads, with the named files as the changed set. Pairs below the ghost thresholds
  (`libs/core/src/config.ts:266-267`: rate 0.5, support 3) are left out, so the ring holds what moves together
  often enough to matter, not every file that once shared a commit.

The plan's seam is an estimate, and so is the reach. Neither is a lock. atis informs; it never
blocks, and the verb inherits that.

## 3. Data

The answer is one JSON object, versioned on its own so a consumer can pin it without pinning the
map:

```jsonc
{
  "schema_version": 1,
  "kind": "atis.reach",
  "head": "9f3c2a1…",                 // the commit the scan was taken at
  "paths": ["src/limiter.ts", "src/__tests__/limiter.test.ts"],
  "new": [],                          // named paths with nothing on disk yet
  "reach": [
    { "path": "src/server.ts", "by": "import", "hops": 1, "via": ["src/limiter.ts"] },
    { "path": "src/routes/login.ts", "by": "import", "hops": 2, "via": ["src/limiter.ts", "src/server.ts"] },
    { "path": "src/config.ts", "by": "cochange", "rate": 0.6, "support": 5, "with": "src/limiter.ts" }
  ],
  "muted": ["cochange: the clone is shallow, so history reads 12 commits"]
}
```

- `reach` is sorted by `path`, then `by`, so two runs on the same commit are byte-identical
  (the determinism rule the map already holds).
- A file reached both ways appears twice, once per `by`, since the two say different things: an
  import edge is structure, a co-change pair is habit.
- A test file is never a cell ([D4 (tests-not-terrain)](../../SPEC.md#d4)), but it can be reached
  by co-change, and a planner wants to hear that a step usually drags a test along. Test files
  ride `by: "cochange"` only.
- `muted` uses the same rule as the map: a source that is missing mutes what it would have said,
  in words, and never stands in a number of its own.
- A `dir/` path expands to the files under it on the head scan before the walk.

The type lives beside the map's in `libs/core/src/schema.ts`, with its own constant and its own
assert. It is a separate document from `map.json`, so it does not touch the map's
`schema_version` ([D85](../../.plumbbob/builds/2026-10-08-phases-1b-to-5/intent.md)).

## 4. Behaviour

### 4.1 The verb

`reach` joins `fingerprint` and `mcp` in the `COMMANDS` map (`apps/atis/src/cli.ts:278`) as a
`Command` of its own, with its own flag table. It is the first verb that takes positionals, so
its `parseArgs` call sets `allowPositionals: true`; every other verb keeps `false`.

| Flag | Meaning |
| --- | --- |
| `--json` | Print the object above. Without it, print a short table for a person: one line per reached file, its bin (`import 1 hop`, `cochange 60%`), and the file it came through. |
| `--history <n>` | The co-change window, the same flag and default a map run takes. |
| `--no-history` | Import reach only; `muted` says so. |

### 4.2 Where the work happens

The app side reads, the core side computes, as everywhere else in atis:

- `apps/atis/src/run.ts` gains `reachRun(paths, options)`. It resolves the head, loads the scan
  from the terrain cache when one exists for that commit (`.atis/terrain/<sha>.json`, D96) and
  scans otherwise, reads the log with `readLog`, and hands both to core.
- `libs/core` gains one exported pure function, `reachFrom(paths, scan, commits, options)`. It
  builds the modules and groups from the scan (the work `standingOf` in `map.ts:249` does
  privately today, so that part moves to a small exported helper both callers share), builds one
  synthetic `DiffFile` per named file, and calls `computeReach` and `computeHistory`. It touches
  no file and no clock, so `rules/lib-is-pure.yml` holds it without a new exception.

### 4.3 Exit codes

0 when the answer printed, 2 on misuse: no paths, an absolute path, a path that climbs out of the
repository. Never 1 ([C4](../../.plumbbob/builds/2026-10-08-phases-1b-to-5/intent.md)). A named
path that does not exist is not misuse; it lands in `new`.

## 5. Constraints

- **Pure core, impure app.** Nothing under `libs/` reads git, the disk or the clock.
- **Deterministic.** The same commit and the same paths print the same bytes.
- **Fast enough to run per step.** A planner calls it once per step, and a plan has five to
  twenty steps. A warm terrain cache should answer in under a second on atis's own repository;
  the first call pays for one scan.
- **Informs, never blocks.** No exit code says "too much reach". What counts as too much is the
  consumer's call.

## 6. Failure modes

| Case | What the verb does |
| --- | --- |
| Not a git repository | Exit 2, with the one line that says so. |
| Shallow clone | Import reach as normal; co-change muted with the commit count it could read. |
| A language atis does not scan | The file reads as a single cell with no edges; `muted` names the language. |
| Every named path is new | `reach` is empty, `new` lists them, exit 0. |
| A path is a symlink out of the tree | Exit 2, as misuse. |

## 7. Success criteria

- On a fixture repository, `atis reach --json` for a file with two importers across one module
  boundary returns both, with `hops` 0 and 1, matching what a map run reports for a diff that
  modifies the same file.
- On the same fixture, a pair that co-changed in four of six commits appears as `by: "cochange"`
  with `rate` 0.67 and `support` 4.
- Two runs print identical bytes.
- `atis reach` on atis's own `libs/core/src/reach.ts` answers in under a second with a warm cache.

## 8. Files likely touched

- `apps/atis/src/cli.ts`: the verb, its flag table, `USAGE` in `apps/atis/src/index.ts`.
- `apps/atis/src/run.ts`: `reachRun`.
- `libs/core/src/reach.ts`, `libs/core/src/map.ts`: the shared module-building helper and
  `reachFrom`.
- `libs/core/src/schema.ts`: the `ReachAnswer` type, its constant, its assert.
- `apps/atis/src/__tests__/cli.test.ts`, `libs/core/src/__tests__/reach.test.ts`: the cases in
  section 7.
- `README.md`: a short "Before a change" section.

## 9. Open questions

1. **Should the MCP server offer the same answer?** The `reach` tool reads a drawn map. A second
   tool, `reach_before`, would let an agent ask during planning without a subprocess. Lean: yes,
   in a second step, once the CLI shape has been used for a while.
2. **Symbol-level reach.** A map run narrows reach to the names a change moved (D111). At plan
   time no names have moved yet. A planner could name the symbols it means to change
   (`src/limiter.ts#cap`). Lean: not in this spec; whole-file reach first, and see whether the
   ring is too wide to be useful before narrowing it.
3. **Does the co-change window want its own default here?** A map run reads the base's history;
   a plan has no base, only a head. Lean: the same `--history` default, read back from head, so
   the two answers agree on a repository nobody has touched since.
