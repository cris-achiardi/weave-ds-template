---
name: ds-figma-component
description: Generate a Figma component set from an agnostic component contract, with contract axes and anatomy and an explicit unbound paint report. Use when asked to generate or update a design-system component in Figma; optional consumer theme mappings supply variable bindings.
---

# Generate a Figma component from its contract

Read `packages/contracts/components/<Name>/<Name>.contract.json`, not framework source.
The contract supplies variant axes/defaults, named parts, slots, states, and structural layout.
Generated React, Vue, Angular, and WC source is not an input.

## Paint policy

The default output is unstyled. Every null paint channel stays unbound and appears in the report.
Do not pick reference tokens by name similarity. A styled result requires an explicit consumer
mapping from part/channel to a variable or text style, with collection identity where applicable.
Neutral preview geometry and text needed to inspect a set are presentation scaffolding; label them
as such, never as a decided token or contract value. Unsupported layout or channels are reported.
This decision is recorded in ADR 0003.

## Prepare a reviewable plan

1. Resolve component and target page from the user's request and `.figma/manifest.json`.
2. Read the contract authoring README. Produce deterministic input with:
   `node .claude/skills/ds-figma-component/scripts/contract-plan.mjs <Name>`.
   Inspect axes/defaults, part hierarchy, conditional declarations, slots, and unbound channels.
3. Use [generation-recipe.md](references/generation-recipe.md) for plugin execution mechanics.
   Its themed examples apply only with an explicit consumer mapping. Use
   [token-to-variable.md](references/token-to-variable.md) only in that mode.
4. For a large axis product, read [wrapper-pattern.md](references/wrapper-pattern.md). Preserve
   public contract axes exactly. Do not invent a State axis; requested state demonstrations can
   be separate examples. Read [figma-file.md](references/figma-file.md) only for historical source
   observations, and remeasure identities before relying on them.

## Execute within the user's request

Use an available Figma write bridge only when creating/updating the set is authorized. Preparing
this plan does not require a bridge. If the write bridge is unavailable, leave the concrete plan
and state that publishing is outstanding; do not claim a Figma component was created.

Before writes, probe the bridge, resolve the target key from the manifest, and pin navigation to
that file. Check file identity in each mutation. Reuse the requested page and update only the target
set; preserve unrelated nodes. A partial failed write must be inspected before retrying to avoid duplicates.

Create variants from the contract's axes, preserving their exact names, values, and defaults.
Create nested layers from anatomy using stable part names; apply declared conditions and slot
properties where Figma can express them. Report unsupported semantics instead of implying runtime
behavior works on a static canvas. Bind only entries supplied by the consumer theme mapping.

## Validate and record

Use [property-check.md](references/property-check.md): instantiate, drive every axis, check slots
and representative combinations, and inspect a live screenshot. In unstyled mode, unbound paint
is expected; in themed mode, audit the declared mappings and resolved values.

Record target/set IDs in `.figma/maps/components.json` only after successful generation and within
an authorized Figma task. Report created/updated IDs, tested axes, unbound channels, unsupported
layout/behavior, and any verification that did not run. Run `pnpm verify:figma` for map edits.
