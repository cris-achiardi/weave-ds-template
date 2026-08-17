# Figma MCP recipes

Exact call sequences, and — more usefully — **what each tool does not answer**, so you do not fill
the gap by inventing.

Read the file key from `.figma/manifest.json → sources`. Never hard-code it.

## Pass 1 — structure

```
get_metadata(fileKey)                  -> top-level pages (guid + name)
get_metadata(fileKey, nodeId: "0:1")   -> the XML tree for that page
```

**Returns:** node ids, layer types, names, positions, sizes.
**Does NOT return:** any style, any bound variable, any variant property value. Do not infer paint
or spacing from this.

**If the tree is too large**, the result is written to a file rather than returned. Do not re-request
it in a loop — read the file, or descend into a specific child node instead of the whole page.

## Pass 2 — variables

```
get_variable_defs(fileKey, nodeId)   -> { "weave-ds-space-3": "8", ... }
```

**This is the one to be careful about.** It returns the variables **bound to that node and its
descendants** — not the file's variable collections. There is no "list every variable" call here.

So a full inventory is a **union over representative nodes**, and its completeness is a claim you
have to earn:

1. Pick nodes that between them cover every section — a button, a list row, a panel, a control bar.
2. Call it on each.
3. Union the results.
4. **Write down which nodes you sampled.** That sentence is what makes the coverage claim checkable
   and is the difference between an inventory and a guess.

Composite text styles come back as a `Font(...)` string naming the variables that feed them. Record
the composite _and_ its parts — they can disagree, and the disagreement is a finding.

## Pass 3 — a component set

```
get_design_context(fileKey, nodeId)   -> reference code + screenshot + metadata
get_screenshot(fileKey, nodeId, maxDimension: 1400)
```

`get_design_context` returns code **to adapt, not to paste**. It knows nothing about this repo's
tokens, prop canon, or component conventions. Use it to understand structure and to see which
variables are bound where.

**Screenshots are for confirming, never for measuring.** If a number matters, it comes from
`get_variable_defs` or `get_metadata`, not from looking.

## Pass 4 — variant properties

Variant properties appear as the **component set's child names**:

```
<symbol name="Size=Small, Shape=Circle" .../>
<symbol name="Size=Medium, Shape=Circle" .../>
```

Parse the axis names and values out of those. A set whose children are named `Frame 1`, `Frame 2`
has **no variant properties** — that is a finding about the file's maturity, and it is worth
stating plainly rather than papering over.

## Things that will bite

| Symptom                               | What is actually happening                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| A variable you expected is missing    | It is not bound on the node you asked about. Sample a different node.             |
| Node ids from a previous session fail | They are file-local. Re-run `get_metadata`.                                       |
| Two styles disagree on a value        | Both are real. Record both; the disagreement is the finding.                      |
| A "component" is a plain frame        | Not a component set. It cannot carry variants, and that matters for the proposal. |
