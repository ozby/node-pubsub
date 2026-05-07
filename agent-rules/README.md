# agent-rules/

This directory holds consumer-owned **agent rules** — the canonical source
of behavioural guidelines that get projected into per-tool surfaces
(`.agent/rules/`, `.cursor/rules/`, `.windsurf/rules/`, etc.) by
`ak sync`.

## Authoring

- Add a new rule with `ak rule new <slug>`.
- Each rule is a markdown file with frontmatter (`title`, `scope`).
- Edit files here — never the projected copies under `.agent/` etc.

## Lifecycle

- Files in `agent-rules/` are committed.
- Projected surfaces (`.agent/rules/`, `.cursor/rules/`, …) are gitignored.
- Run `ak sync` after editing to refresh derived surfaces.
