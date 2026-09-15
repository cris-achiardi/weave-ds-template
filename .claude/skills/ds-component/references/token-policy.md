# Unstyled paint channels

Library contracts name channels and leave their sources unbound:

```json
{ "paints": { "color": null, "border-radius": null } }
```

`null` means deliberately consumer-supplied. An absent channel means not described.
Never fill a null channel with a token chosen for a demonstration. Structural layout belongs in
`layout`, and consumer decoration belongs in the consumer-owned theme.

Consumer contracts may declare a policy such as a token namespace or `literal` when a governing
decision calls for one. Read prefixes from `ds.config.json`; do not copy a historical token catalog.
No token set is required to author or generate an unstyled component.

Use `pnpm report:paints --backend <backend> --theme <consumer-theme.css>` to inspect declarations.
For WC also pass `--component <Name>`, since the stylesheet is scoped to one shadow root.
The report does not evaluate the cascade or computed values; browser verification remains necessary.

The same ownership applies to Figma: null channels stay unbound unless the consumer provides an
explicit part/channel-to-variable mapping. See ADR 0003 and the `ds-figma-component` skill.
