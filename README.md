# atis

A weather map for code changes. The terrain is the repository: structure, depth,
mass, health. The weather is what one change does to it: what moved, how far it
ripples, what evidence covers it, what to look at first. A reviewer reads the
weather in ten seconds, then descends only where the weather is bad.

- [SPEC.md](./SPEC.md): the design, phase by phase.
- [docs/prior-art.md](./docs/prior-art.md) and
  [docs/inspiration.md](./docs/inspiration.md): what it borrows, and from whom.
- `apps/atis`: the `atis` command, published as `@robmclarty/atis` (`0.0.0` holds the name).
- `libs/core`: the pure core that will compute `map.json`.

```bash
pnpm install
pnpm check                                    # the definition of done: exit 0
pnpm build && node apps/atis/dist/cli.js --version
```

See [AGENTS.md](./AGENTS.md) for the contract agents follow in this repository.
Apache-2.0.
