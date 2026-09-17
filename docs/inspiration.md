# Inspiration and credits

atis is assembled from other people's ideas. This file records where each one
came from, what was taken, where it lands in atis, and on what terms. Ideas
are not licensed and are credited out of respect; code and assets are
licensed and are credited because we must. The two are kept apart below.

**House rule.** When an idea, an algorithm, or an asset is borrowed, add a
row here *and* cite the source in a comment at the implementation site (for
example, the module that draws membranes carries `// Bubble Sets: Collins,
Penn, Carpendale 2009, doi:10.1109/TVCG.2009.122`). If a row's "where"
column stops being true, fix the row.

Section references (§) point into [../SPEC.md](../SPEC.md). The longer
reasoning behind each borrowing is in [prior-art.md](./prior-art.md).

## 1. Research

| Source | What was taken | Where in atis |
| --- | --- | --- |
| Christopher Collins, Gerald Penn, Sheelagh Carpendale. **Bubble Sets: Revealing Set Relations with Isocontours over Existing Visualizations.** IEEE Transactions on Visualization and Computer Graphics 15(6), 2009. doi:10.1109/TVCG.2009.122 | Isocontour outlines around the members of a set, drawn *over* an existing layout, so membership can straddle the primary spatial organisation | Cell membranes over the depth layout (§5.1); implemented with `bubblesets-js` (below) |
| Emden R. Gansner, Yifan Hu, Stephen Kobourov. **GMap: Visualizing graphs and clusters as maps.** IEEE Pacific Visualization Symposium, 2010. doi:10.1109/PACIFICVIS.2010.5429590 | Render a clustered graph as a geographic map: clusters as countries, shared borders as coupling | The map metaphor; coupling as proximity; the membrane as a border (§5.1) |
| Adrian Kuhn, David Erni, Peter Loretan, Oscar Nierstrasz. **Software Cartography: thematic software visualization with consistent layout.** Journal of Software Maintenance and Evolution: Research and Practice, 2010. doi:10.1002/smr.414 | A *consistent* layout across versions so developers build spatial memory of a codebase; thematic overlays on a stable map | Principle P2 (terrain is stable, weather never moves it); incremental relayout and the terrain cache (§4, §8) |
| Lyn Bartram, Colin Ware, Tom Calvert. **Moticons: detection, distraction and task.** International Journal of Human-Computer Studies 58, 2003. doi:10.1016/S1071-5819(03)00021-1. And: **Moving icons: detection and distraction.** Proceedings of INTERACT 2001. | Simple motion is detected preattentively across the whole visual field, at low amplitude and in the periphery, and is the most distracting channel when overused; motion types differ in detectability and annoyance | The motion budget and the flare/breathe grammar (§5.5); principle P4 |
| Christopher G. Healey. **Perception in Visualization.** North Carolina State University, <https://www.csc2.ncsu.edu/faculty/healey/PP/> | Summary of preattentive features, including flicker, direction and velocity of motion | Rationale for P3 and P4 |
| Jacques Bertin. **Sémiologie graphique.** Gauthier-Villars, 1967 (English: *Semiology of Graphics*, University of Wisconsin Press, 1983). | Visual variables, each carrying one meaning | Principle P3 (one meaning per channel) |
| İsmail Sergen Göçmen, Ahmed Salih Cezayir, Eray Tüzün. **Enhanced code reviews using pull request based change impact analysis.** Empirical Software Engineering, 2025. doi:10.1007/s10664-024-10600-2 (the CHID tool) | Churn ratio (their eq. 1), bug-fix frequency (eq. 2), co-change rate (eq. 3), PR size categories, impact size via PageRank over a call graph; categories rather than a number; a radar chart of raw metrics; the finding that "more to look at" can slow review; the warning never to use such metrics against developers | History layer (§5.2), notice inputs (§5.4), radar in the HUD (§7), principles P1 and P9. Their author merge-rate metric is deliberately not used (P9) |
| Nachiappan Nagappan, Thomas Ball. **Use of relative code churn measures to predict system defect density.** ICSE 2005. doi:10.1145/1062455.1062514 | Relative code churn as a defect predictor (the root of CHID's churn metric) | Churn texture (§5.2) |
| Thomas Zimmermann, Peter Weißgerber, Stephan Diehl, Andreas Zeller. **Mining version histories to guide software changes.** IEEE Transactions on Software Engineering 31(6), 2005. doi:10.1109/TSE.2005.72 | Evolutionary coupling: files that changed together will change together again | Missing co-change ghosts (§5.2) |
| Emre Doğan, Eray Tüzün. **Towards a taxonomy of code review smells.** Information and Software Technology 142, 2022. doi:10.1016/j.infsof.2021.106737 | The PR size scale CHID adopts | Size block in the HUD (§7) |
| K. Højelse, T. Kilbak, J. Røssum, E. Jäpelt, L. Merino, M. Lungu. **Git-Truck: Hierarchy-Oriented Visualization of Git Repository Evolution.** IEEE Working Conference on Software Visualization (VISSOFT), 2022. doi:10.1109/VISSOFT55257.2022.00021 | Hierarchical, local, git-derived visualisation with age and activity overlays and a time slider | Age as stability relief, history texture (§5.1, §5.2); sequence scrub (§8). Their authorship colouring is deliberately not adopted (P9) |
| Wilhelm Hasselbring, Alexander Krause, Christian Zirkelbach. **ExplorViz: Research on software visualization, comprehension and collaboration.** Software Impacts 6, 2020. doi:10.1016/j.simpa.2020.100034 | Two zoom levels, a landscape of systems and a city of one system, and live traces on the same picture | The level-of-detail ladder (§6) |
| John Ousterhout. **A Philosophy of Software Design.** Yaknyam Press, 2018 (2nd ed. 2021). | Deep modules: a small interface hiding a large implementation | Membrane thickness versus body volume (§5.1), via checkride's `docs/deep-modules.md` |
| David L. Parnas. **On the criteria to be used in decomposing systems into modules.** Communications of the ACM 15(12), 1972. | Information hiding, the root of the deep-module idea | Same as above |
| Adam Tornhill. **Your Code as a Crime Scene.** Pragmatic Bookshelf, 2015 (2nd ed. 2024). **Software Design X-Rays.** Pragmatic Bookshelf, 2018. | Hotspots as churn × complexity; temporal coupling as a design signal | Whole-repo trouble-spot overlay (§8); the co-change ghost lineage (§5.2) |

## 2. Tools and products (ideas only, no code taken)

| Source | What was taken | Where in atis |
| --- | --- | --- |
| **CodeCharta**, MaibornWolff. <https://codecharta.com>, BSD-3-Clause | Compare (delta) mode: colour each building by how a metric changed between two maps; the Σ / Δ metric bar | Principle P6 (delta, not state); Σ and Δ in the HUD (§7) |
| **CodeSee Review Maps**, CodeSee (later part of GitKraken). <https://docs.codesee.io/docs/review-map-guide> | A per-change map of touched files with importers and importees; change-kind colours; author-written tours; reviewed-progress marking | The change-only wiring overlay at LOD2 (§6); change kinds (§5.2); tours deferred (§12) |
| **CodeLayers**. <https://codelayers.ai>, "The Complete Guide to Code Visualization in 2026" and the *Blast Radius* series (CodeLayers Team, 2026) | Blast radius coloured by hop distance; topological depth as a first-class metric; PR-by-URL; a GitHub Action that posts the view; MCP so an agent can point at the map | Depth terraces (§5.1); reach by module hop (§5.2); phases 4 and 5 (§12) |
| **Nx** and **Nx Cloud**, Nrwl. Philip Fulcher, "See your affected project graph in Nx Cloud", 2024-11-19, <https://nx.dev/blog/ci-affected-graph> | Composite graph nodes collapsed by directory and expanded on double-click; affected highlighting from CI's own perspective | Opening a cell (§6); composites above the performance budget (§15) |
| **CodeScene**, Adam Tornhill and team. <https://docs.enterprise.codescene.io> (delta analysis) | Code-health delta as a gate; the "absent change pattern" warning; positive reinforcement when health improves; a recommended review level rather than a block; the big contrasting grade blocks in its PR comment | Ghosts and the improvement state (§5.2); the HUD's brutalist blocks (§7); "informs, never blocks" (P7) |
| **repo-visualizer**, Amelia Wattenberger, GitHub Next, "Visualizing a Codebase", August 2021. <https://githubnext.com/projects/repo-visualization/>, <https://github.com/githubocto/repo-visualizer>, MIT | Circle packing of folders and files; import edges shown only on hover; a README diagram regenerated on every push so structural change is noticed by familiarity | Cells and organelles (§5.1); "ordinary edges are never drawn" (P3, §5.1); the fingerprint export (§12 phase 4) |
| **Codecov** sunburst and patch coverage. <https://docs.codecov.com/docs/graphs> | Hierarchical coverage drill-down; patch coverage as the number that matters for a change | Evidence as membrane integrity (§5.2); the coverage block (§7) |
| **Software Galaxies**, Andrei Kashcha (anvaka). <https://github.com/anvaka/pm>, MIT | A cautionary example: 3D node-link clouds at scale are beautiful and not diagnostic | The 2.5D, overhead-camera decision (§5.6, §15) |
| **3d-force-graph**, Vasco Asturiano. <https://github.com/vasturiano/3d-force-graph>, MIT | Reference implementation of three.js force layouts | Consulted for §15; not a dependency |
| **Gource**, Andrew Caudwell. <https://gource.io>, GPL-3.0 | Animated repository history over a stable tree | The sequence scrub, "weather moving over the map" (§8). Idea only; GPL code is not used |
| **Stryker** mutation reports and dashboard. <https://stryker-mutator.io> | Per-mutant status as a per-line signal | Survived mutants as soft dents (§5.2) |
| **fallow** (npm), the analyzer behind checkride's `dead`, `dupes` and `health` slots | The four complexity thresholds; `--impact-closure`, `--trace-file`, `audit --base` | Conformance dents (§5.1); reach (§5.2); data sources (§9.1) |
| **checkride**, Rob McLarty. <https://github.com/robmclarty/checkride>, Apache-2.0 | The `.check/` contract, the deep-module convention, and the aviation lineage | Data sources (§9.1); the whole premise |
| **weft**, Rob McLarty | Studio shell, watch loop over a JSON file, embeddable canvas | Watch mode (§12 phase 4) |
| **PlumbBob**, Rob McLarty, *Attention-First Development* | Attention as the scarce resource the process is designed around | The reason the tool exists (§1, P1) |

## 3. Creative and cultural references

| Source | What was taken | Where in atis |
| --- | --- | --- |
| **Made in Abyss.** Manga by Akihito Tsukushi (Takeshobo, 2012 to present); anime by Kinema Citrus, directed by Masayuki Kojima (2017 to present). | A layered chasm in which descending is easy and ascending exacts a cost that grows with depth | The depth terraces: a change at the bottom climbs every layer on its way back up (§5.1). Concept only; no names, art or text are used |
| **Star Trek: Discovery**, season 1 main title sequence (CBS, 2017). Designed by Prologue; creative direction by Ana Criado (design) and Kyle Cooper (producer). Feature at <https://www.artofthetitle.com/title/star-trek-discovery> | Technical-drawing chrome: ink line-art, dotted leader lines, small annotations, exploded views of a mechanism | The UI and label layer over the organic world (§5.6); the exploded view of an opened cell (§6). Aesthetic reference only; no assets are used |
| **Aviation weather.** METAR flight categories VFR, MVFR, IFR and LIFR and their conventional map colours (green, blue, red, magenta) as used on US National Weather Service and FAA aviation weather products; ATIS, the recorded field-conditions broadcast | The verdict scale and its hues (§5.3); the name | Public conventions; the name is a common aviation term (ATIS is also the name of a US telecom standards body, atis.org; no affiliation) |
| **Bioluminescence, histology, soft bodies** (plankton, stained slides, jello, water beds, bean bags) | The reveal by zoom and the materials | §5.6, §5.1. Rob's brief; no specific source |
| **Rob's own layering practice** for REST services (edge, auth, validation, handlers, domain, services, stores, raw data) | The intuition that depth bands fall out of any well-layered system | §5.1 |

## 4. Libraries atis intends to depend on

All permissive; each requires its copyright notice to travel with
distributed code, so the build carries a third-party notices file.
`elkjs` is EPL-2.0, which is compatible with an Apache-2.0 project as a
dependency but is the one licence here that is not MIT/ISC/Zlib; it is used
only for the LOD2 wiring overlay and can be swapped for d3-force if that
ever matters.

| Package | Author | Licence | Used for |
| --- | --- | --- | --- |
| `three` | mrdoob and contributors | MIT | The world renderer (§15) |
| `d3-force`, `d3-hierarchy` | Mike Bostock / Observable | ISC | Within-terrace layout; hierarchy rollups |
| `bubblesets-js` | Samuel Gratzl (a JavaScript implementation of Collins et al. 2009) | MIT | Membranes |
| `earcut` | Volodymyr Agafonkin | ISC | Triangulating contours |
| `camera-controls` | Yomotsu | MIT | Orthographic zoom, pan, tilt |
| `troika-three-text` | Jason Johnston | MIT | In-world text, if CSS2D labels prove insufficient |
| `postprocessing` | Raoul van Rüschen | Zlib | Selective bloom, if three's node-based bloom proves insufficient |
| `elkjs` | Ulf Rüegg and the Eclipse Layout Kernel team, Kiel University | EPL-2.0 OR GPL-3.0-or-later | LOD2 wiring overlay only |
| `react` | Meta and contributors | MIT | The HUD |
| `deck.gl` | vis.gl / OpenJS Foundation | MIT | Evaluated, not chosen (§15) |

## 5. Not borrowed, on purpose

- Per-person metrics from CHID (author merge rate), Git-Truck (authorship
  colouring) and CodeScene (knowledge distribution). Principle P9.
- The city metaphor (CodeCharta, ExplorViz). The organic look was chosen
  instead (§5.6).
- Free-perspective 3D (Software Galaxies, CodeLayers). 2.5D overhead instead.
- A single risk number (CHID's risk score). Categories with components
  instead (P5).
