<!-- atis:map -->
### atis · IFR

`main` → `a1b2c3d` · 8 files changed · 6 notices

| Category | Patch cov | Mutants | Reach | Size | Gate | Standing | Health Δ | Notices | Other |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| **IFR** | **61%**, 1 unmeasured | **1** survived, 1 untested | **4** cells | **+210 −94**, 4 files | **1** red | **1** red | **+1.9** | **1·2·3** | **1** |

#### Look here first

1. **`libs/core/src/pm/index.ts`** · red-check-slot · primary<br>
   the `test` check is red on this changed file<br>
   <sub>severity 10</sub>
2. **`libs/core/src/pm/index.ts`** · deleted-export · secondary<br>
   `legacyResolve` no longer exported, and 1 file still imports it<br>
   <sub>severity 8</sub>
3. **`libs/core/src/pm/index.ts`** · uncovered-high-reach · secondary<br>
   5 changed lines are uncovered and the change reaches 4 cells<br>
   <sub>severity 7 · high_reach_cells 3</sub>
4. **`libs/core/src/pm/index.ts`** · interface-added · tertiary<br>
   the interface of `libs/core/src/pm` grew (`resolveTool` added) and 2 files read it; the shape of `listSlots` and `resolveSlot` could not be compared<br>
   <sub>severity 3 · fan_in_high 2 · deep_band 4</sub>
5. **`apps/cli/src/doctor.ts`** · large-hot-change · tertiary<br>
   136 lines changed in a file with churn 3.366 and a bug-fix rate of 0.5<br>
   <sub>severity 4 · large_lines 100 · hot_churn_ratio 2 · hot_bugfix_rate 0.3</sub>
6. **`+libs/core/src/pm/tools.ts`** · red-check-slot · tertiary<br>
   the `test` check is red on this changed file<br>
   <sub>severity 10</sub>

<sub>atis · `main`, merge base `0f1e2d3`, to `a1b2c3d` · no image could be kept with this comment, so it carries the map as text alone · run `atis --comment` again to update this comment</sub>
