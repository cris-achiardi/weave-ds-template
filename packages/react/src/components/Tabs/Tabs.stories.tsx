import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import { Icon } from '../Icon/Icon';
import { TabItem } from '../TabItem/TabItem';
import { TabPanel } from '../TabPanel/TabPanel';
import { Tabs } from './Tabs';

/**
 * ONE story file for THREE components, on purpose.
 *
 * ADR 0006 makes `Tabs`, `TabItem` and `TabPanel` a single API rather than three components that
 * share a prefix: a `TabItem` rendered outside a `Tabs` throws, by design, because an item with no
 * selection to compare against cannot decide what it is. A standalone `TabItem` story would
 * therefore be a story that crashes — and a `TabPanel` one would show an empty box. Documenting
 * the compound is the only honest unit.
 *
 * As in the Icon stories, nothing here restates a prop value or a default. `pnpm contract Tabs`
 * composes that from the source and the contract, so it cannot go stale.
 */
const meta = {
  title: 'Components/Tabs',
  component: Tabs,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- story-local presentation ---------------------------------------------------------------

const body: CSSProperties = {
  padding: '16px 4px',
  color: 'var(--ds-text-secondary)',
  font: 'inherit',
  fontSize: 14,
  lineHeight: 1.5,
};

const note: CSSProperties = {
  marginBottom: 16,
  maxWidth: '60ch',
  fontSize: 13,
  lineHeight: 1.5,
  color: 'var(--ds-text-secondary)',
  opacity: 0.75,
};

/**
 * The ordinary case: three tabs, three panels, and nobody holding state.
 *
 * Try the keyboard — Tab reaches the list once, then Left/Right move between tabs and Home/End
 * jump to the ends. Selection follows focus, so arrowing also switches the panel.
 */
export const Default: Story = {
  render: () => (
    <Tabs>
      <TabItem value="recording">Recording</TabItem>
      <TabItem value="video-audio">Video &amp; Audio</TabItem>
      <TabItem value="preferences">Preferences</TabItem>

      <TabPanel value="recording">
        <div style={body}>
          Frame rate, capture region and the countdown before recording starts.
        </div>
      </TabPanel>
      <TabPanel value="video-audio">
        <div style={body}>Camera, microphone and system audio routing.</div>
      </TabPanel>
      <TabPanel value="preferences">
        <div style={body}>Shortcuts, theme and where finished recordings are saved.</div>
      </TabPanel>
    </Tabs>
  ),
};

/**
 * Tabs pair naturally with `Icon`. The glyph is decorative here — the tab's own text names it, so
 * no `label` is passed and the icon stays out of the accessibility tree.
 */
export const WithIcons: Story = {
  render: () => (
    <Tabs>
      <TabItem value="recording">
        <Icon name="dvr" size="s" /> Recording
      </TabItem>
      <TabItem value="video-audio">
        <Icon name="videocam" size="s" /> Video &amp; Audio
      </TabItem>
      <TabItem value="preferences">
        <Icon name="settings" size="s" /> Preferences
      </TabItem>

      <TabPanel value="recording">
        <div style={body}>Frame rate, capture region and the countdown.</div>
      </TabPanel>
      <TabPanel value="video-audio">
        <div style={body}>Camera, microphone and system audio routing.</div>
      </TabPanel>
      <TabPanel value="preferences">
        <div style={body}>Shortcuts, theme and save location.</div>
      </TabPanel>
    </Tabs>
  ),
};

/**
 * Start somewhere other than the first tab, still without holding the state yourself.
 */
export const StartingOnAnotherTab: Story = {
  render: () => (
    <Tabs defaultValue="preferences">
      <TabItem value="recording">Recording</TabItem>
      <TabItem value="video-audio">Video &amp; Audio</TabItem>
      <TabItem value="preferences">Preferences</TabItem>

      <TabPanel value="recording">
        <div style={body}>Recording settings.</div>
      </TabPanel>
      <TabPanel value="video-audio">
        <div style={body}>Video and audio settings.</div>
      </TabPanel>
      <TabPanel value="preferences">
        <div style={body}>Preferences — selected on mount.</div>
      </TabPanel>
    </Tabs>
  ),
};

/**
 * A disabled tab cannot be selected and is skipped by the arrow keys — arrow past it and focus
 * lands on the next enabled tab, never on it.
 */
export const WithADisabledTab: Story = {
  render: () => (
    <Tabs>
      <TabItem value="recording">Recording</TabItem>
      <TabItem value="video-audio" disabled>
        Video &amp; Audio
      </TabItem>
      <TabItem value="preferences">Preferences</TabItem>

      <TabPanel value="recording">
        <div style={body}>Arrow right from here — focus skips the disabled tab.</div>
      </TabPanel>
      <TabPanel value="video-audio">
        <div style={body}>Unreachable while the tab is disabled.</div>
      </TabPanel>
      <TabPanel value="preferences">
        <div style={body}>Preferences.</div>
      </TabPanel>
    </Tabs>
  ),
};

/**
 * Hold the selection yourself when something outside the tabs needs to change it too — here, a
 * button that jumps straight to a pane.
 */
export const Controlled: Story = {
  render: function Controlled() {
    const [tab, setTab] = useState('recording');

    const jump: CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 10px',
      borderRadius: 8,
      border: '1px solid var(--ds-border-primary)',
      background: 'transparent',
      color: 'var(--ds-text-primary)',
      font: 'inherit',
      fontSize: 13,
      cursor: 'pointer',
    };

    return (
      <div>
        <div style={note}>
          Selected: <code>{tab}</code>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button type="button" style={jump} onClick={() => setTab('video-audio')}>
            <Icon name="videocam" size="xs" /> Jump to Video &amp; Audio
          </button>
          <button type="button" style={jump} onClick={() => setTab('recording')}>
            <Icon name="dvr" size="xs" /> Back to Recording
          </button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabItem value="recording">Recording</TabItem>
          <TabItem value="video-audio">Video &amp; Audio</TabItem>
          <TabItem value="preferences">Preferences</TabItem>

          <TabPanel value="recording">
            <div style={body}>Recording settings.</div>
          </TabPanel>
          <TabPanel value="video-audio">
            <div style={body}>Video and audio settings.</div>
          </TabPanel>
          <TabPanel value="preferences">
            <div style={body}>Preferences.</div>
          </TabPanel>
        </Tabs>
      </div>
    );
  },
};

/**
 * Two tabs is the common minimum, and a longer label shows the equal-width behaviour: items share
 * the row evenly, so the longest label widens every tab. ADR 0006 records this — and records that
 * no overflow behaviour is designed, so a long list crowds rather than scrolls.
 */
export const LabelLengthDrivesWidth: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 32 }}>
      <div>
        <div style={note}>Two short labels.</div>
        <Tabs>
          <TabItem value="on">On</TabItem>
          <TabItem value="off">Off</TabItem>
          <TabPanel value="on">
            <div style={body}>On.</div>
          </TabPanel>
          <TabPanel value="off">
            <div style={body}>Off.</div>
          </TabPanel>
        </Tabs>
      </div>

      <div>
        <div style={note}>One long label widens all three.</div>
        <Tabs>
          <TabItem value="a">Recording</TabItem>
          <TabItem value="b">Video, audio and system routing</TabItem>
          <TabItem value="c">Preferences</TabItem>
          <TabPanel value="a">
            <div style={body}>A.</div>
          </TabPanel>
          <TabPanel value="b">
            <div style={body}>B.</div>
          </TabPanel>
          <TabPanel value="c">
            <div style={body}>C.</div>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  ),
};
