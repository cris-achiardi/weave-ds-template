import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactNode } from 'react';

import { Icon } from './Icon';
import { glyphNames, type GlyphName } from './glyphs';

/**
 * Stories are the THIRD description of this component, after the source and the contract. They
 * stay usage examples on purpose — see apps/storybook/README.md. Nothing here restates a prop
 * value, a default or a pixel size: `pnpm contract Icon` answers "what is this component", and it
 * is composed rather than written, so it cannot go stale the way a hand-written table does.
 *
 * Where a story does need the list of glyphs it reads `glyphNames`, which is generated from the
 * artwork by `pnpm glyphs`. Add an SVG and these stories pick it up with no edit here.
 */
const meta = {
  title: 'Components/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    // Derived from the generated registry, so the picker cannot drift from the set.
    name: { control: 'select', options: glyphNames },
  },
  args: {
    name: 'videocam',
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pick a glyph and a size from the controls panel. */
export const Playground: Story = {};

// --- helpers, story-local ------------------------------------------------------------------

const cell: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  padding: '12px 4px',
  borderRadius: 8,
  background: 'rgb(255 255 255 / 4%)',
  color: 'var(--ds-text-primary)',
};

const caption: CSSProperties = {
  fontSize: 11,
  lineHeight: 1.3,
  textAlign: 'center',
  overflowWrap: 'anywhere',
  opacity: 0.65,
};

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={cell}>
      {children}
      <span style={caption}>{label}</span>
    </div>
  );
}

/**
 * The whole set, which is the question a story about an icon library actually has to answer:
 * *which glyph do I want, and what is it called?*
 */
export const AllGlyphs: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(116px, 1fr))',
        gap: 12,
      }}
    >
      {glyphNames.map((name) => (
        <Cell key={name} label={name}>
          <Icon name={name} size="l" />
        </Cell>
      ))}
    </div>
  ),
};

/**
 * An icon usually sits beside text, so the useful comparison is against a label rather than
 * against another icon. Sizes are named, never measured, here — the ladder is the contract's to
 * state, and a number written into a story is a copy that nothing keeps honest.
 */
export const Sizes: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(['xs', 's', 'm', 'l', 'xl'] as const).map((size) => (
        <span
          key={size}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--ds-text-primary)',
          }}
        >
          <Icon {...args} size={size} />
          <span style={{ opacity: 0.65, fontSize: 13 }}>size={size}</span>
        </span>
      ))}
    </div>
  ),
};

/**
 * The glyph carries no colour of its own — it paints with `currentColor`, so it takes whatever is
 * in effect where it is placed. This is ADR 0004, and it is the one behaviour a static screenshot
 * of the set cannot show you.
 *
 * The last cell sets no colour of its own, so it inherits from the page. That is the mechanism —
 * and also the failure: on a surface where nothing up the tree sets `color`, an icon inherits the
 * browser default and goes invisible, with no error anywhere.
 */
export const ColourComesFromContext: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {(
        [
          ['text-primary', 'var(--ds-text-primary)'],
          ['text-secondary', 'var(--ds-text-secondary)'],
          ['brand-primary', 'var(--ds-brand-primary)'],
          ['control-off', 'var(--ds-control-off)'],
          ['control-waveform', 'var(--ds-control-waveform)'],
          ['inherited from the page', undefined],
        ] as const
      ).map(([label, color]) => (
        <div key={label} style={{ ...cell, color }}>
          <Icon {...args} size="l" />
          <span style={caption}>{label}</span>
        </div>
      ))}
    </div>
  ),
};

/**
 * The accessibility decision, which is the thing reviewers actually get wrong.
 *
 * An icon beside its own text label is **decorative** — leave `label` off, and it stays out of the
 * accessibility tree so the label is not announced twice. An icon that is the only carrier of
 * meaning needs `label`, and nothing in this repo can detect when you forgot: both render
 * identically.
 */
export const DecorativeVersusLabelled: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => {
    const button: CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      borderRadius: 8,
      border: '1px solid var(--ds-border-primary)',
      background: 'transparent',
      color: 'var(--ds-text-primary)',
      font: 'inherit',
      cursor: 'pointer',
    };

    return (
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
          <button type="button" style={button}>
            <Icon name="videocam" size="s" />
            Start recording
          </button>
          <span style={caption}>decorative — the button text is the name</span>
        </div>

        <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
          <button type="button" style={{ ...button, padding: 8 }} aria-label="Close">
            <Icon name="close" size="s" />
          </button>
          <span style={caption}>icon-only — the BUTTON carries the name</span>
        </div>

        <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
          <span style={{ ...button, cursor: 'default', color: 'var(--ds-control-off)' }}>
            <Icon name="mic-off" size="s" label="Microphone muted" />
          </span>
          <span style={caption}>standalone status — the ICON carries the name</span>
        </div>
      </div>
    );
  },
};

/**
 * A caveat the component cannot fix, recorded so nobody re-discovers it as a bug.
 *
 * The `size` axis sizes the CANVAS — the dashed box below, identical in every cell. How much of
 * that box the drawing fills is a property of the artwork and varies across the set, so two icons
 * at one size can still read at different weights. Measured in docs/research/0001-icon-set-audit.md.
 */
export const OpticalSizeVaries: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {(['close-small', 'check-small', 'close', 'settings', 'crop'] as GlyphName[]).map((name) => (
        <Cell key={name} label={name}>
          <span style={{ display: 'inline-flex', outline: '1px dashed rgb(255 255 255 / 35%)' }}>
            <Icon name={name} size="l" />
          </span>
        </Cell>
      ))}
    </div>
  ),
};
