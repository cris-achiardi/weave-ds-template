/**
 * What each contract actually produced — the single source of truth for the sandbox's labels.
 *
 * THIS IS HAND-MAINTAINED, AND THAT IS THE POINT. A verdict is not derivable: it records that a
 * person opened this page and exercised the component against what its contract says, key by key.
 * Deriving it from the contract would only ever restate the contract's own claims, which is the one
 * thing a harness must not do.
 *
 * `works` does NOT mean finished. It means: everything this component's contract states, it does.
 * Every component here still gets its layout from the consumer's theme file, because the contract
 * has no way to say where a part sits — see `crossCutting` below, which applies to all fifteen.
 *
 * A specimen moves up only after being driven in a browser. Moving one because the code looks right
 * is how this file becomes a wish list.
 */

export type Verdict = 'works' | 'partial' | 'shell';

export interface ComponentStatus {
  /** The contract's name. All fifteen appear, including the ones the page shows inside a group. */
  component: string;
  verdict: Verdict;
  /** The behaviour its contract declares and the emitter now generates. */
  supplies: string;
  /**
   * BROKEN PROMISES: things this component's own contract states that the output does not do.
   * This list, and only this list, decides the verdict — `works` means it is empty.
   */
  remaining: string[];
  /**
   * Known and accounted for, and NOT a broken promise: an obligation the contract deliberately
   * hands to the consumer, or a gap the contract openly says it has no way to express.
   *
   * Kept separate because mixing the two makes a finished component look unfinished, and — worse —
   * makes a real defect look like a footnote. These are also the entries a consumer has to act on,
   * so they answer a different question: whose problem is this?
   */
  alsoKnown?: string[];
}

export const STATUS: ComponentStatus[] = [
  {
    component: 'Button',
    verdict: 'works',
    supplies: 'Three variant axes, each reaching the DOM as its own data attribute.',
    remaining: [],
  },
  {
    component: 'Checkbox',
    verdict: 'works',
    supplies: 'A three-valued state, with `activates.between` naming the two a click may reach.',
    remaining: [],
  },
  {
    component: 'Switch',
    verdict: 'works',
    supplies: 'The controlled/uncontrolled trio, and a root that toggles its own state.',
    remaining: [],
  },
  {
    component: 'Accordion',
    verdict: 'works',
    supplies: 'A collection holding a SET of open sections.',
    remaining: [],
  },
  {
    component: 'AccordionItem',
    verdict: 'works',
    supplies: 'A member reading its ancestor selection; its trigger names and controls its panel.',
    remaining: [],
  },
  {
    component: 'RadioGroup',
    verdict: 'works',
    supplies:
      'Linear navigation: all four arrows move and select, wrapping, the disabled option skipped, one option in the Tab order.',
    remaining: [],
  },
  {
    component: 'RadioItem',
    verdict: 'works',
    supplies: 'Registers its node with the group and takes its tab stop from it.',
    remaining: [],
  },
  {
    component: 'Tabs',
    verdict: 'works',
    supplies:
      'Linear navigation on one axis only, so Up and Down still scroll the page. Home and End jump to the ends.',
    remaining: [],
  },
  {
    component: 'TabItem',
    verdict: 'works',
    supplies:
      'Points at its panel across the component boundary. Stays focusable while disabled, and refuses to be chosen.',
    remaining: [],
    alsoKnown: [
      'CONSUMER: its `aria-controls` is built from the shared identity, so a tab with no matching panel points at an id nothing renders. Nothing here can detect that — a panel that has not mounted and one that will never exist look identical from inside.',
    ],
  },
  {
    component: 'TabPanel',
    verdict: 'works',
    supplies:
      'Named by its tab across the same boundary. Not in the arrow path, derived from the contract.',
    remaining: [],
  },
  {
    component: 'Slider',
    verdict: 'works',
    supplies:
      'Range stepping and dragging. Publishes `--ds-fraction`, so the fill and thumb are positioned from the value rather than by the page.',
    remaining: [],
    alsoKnown: [
      'CONSUMER: the 44px hit area its a11y notes require. A press anywhere on the track works, but the track is 4px thick and padding the root is the consumer’s to do.',
      'VOCABULARY: no `aria-valuetext`. The contract says some ranges need text instead of a bare number — a rating, a date, a named tier — and openly has no way to supply it.',
    ],
  },
  {
    component: 'Dialog',
    verdict: 'works',
    supplies:
      'A native <dialog>: focus containment, an inert page behind, focus restoration and Escape, all from the platform — plus backdrop-press, declared by `dismisses` and generated.',
    remaining: [],
    alsoKnown: [
      'CONSUMER: there is no Escape key on a phone, and the platform supplies no backstop on iOS. An `actions` slot must always contain a way out.',
      'CONSUMER: the theme file opens with a reset cancelling the browser’s own border, padding and colours. A native <dialog> is not unstyled until that runs.',
    ],
  },
  {
    component: 'Field',
    verdict: 'partial',
    supplies:
      'Slots filled by another contract’s output, and ARIA wiring that now resolves — the control is named by its label and described by its help text and error, in order.',
    remaining: [
      '`invalid`, `touched` and `dirty` are shared states with no declared cause. They work controlled; uncontrolled they cannot move.',
      '`focused`, `valid` and `filled` are declared `control: internal` and reach the DOM through NO channel — no attribute, no pseudo-class. The theme has a rule for `focused` that can never match, because nothing ever emits the attribute it selects.',
    ],
  },
  {
    component: 'TextField',
    verdict: 'partial',
    supplies: 'A free-text state, and the size axis.',
    remaining: [
      'Typing works only because the binding renders a native <input> and the emitter knows an input edits its own value. Nothing in the contract says typing changes anything.',
    ],
  },
  {
    component: 'Tooltip',
    verdict: 'partial',
    supplies:
      'Correct structure: role=tooltip, the trigger described by the popup only while open. Escape dismisses it, declared by `dismisses`.',
    remaining: [
      'Nothing opens it. The contract says hover-after-a-delay and focus, in prose; `activates` covers clicks only, and a delay has nowhere to live — the schema has no concept of time.',
      'No positioning: no anchor, no side, no collision handling. The `placement` axis it declares is read by nothing.',
    ],
  },
];

/**
 * True of every component above, including the ones marked `works`. Listed once rather than
 * repeated fifteen times, because repeating it would make each one look like a local defect when it
 * is the same missing decision each time.
 */
export const CROSS_CUTTING = [
  'No component emits its own layout. `structure.css` carries only a scoping handle and the hiding rule, because the contract has no way to say where a part sits — so every component’s real layout lives in the consumer’s theme file, which is the wrong place for it.',
  'No generated control takes part in a form. `name`, `value` and `required` are not states, not behaviour and not styling, and no contract can currently carry them.',
  'The web-platform knowledge the emitter used to hold — which ARIA attribute a state maps to, which roles accept it, which elements have a native `disabled` — now lives in `@ds/platform-web` as data, with twenty conformance cases. Thirteen tables were counted; eleven were not React and moved. A second WEB backend reads them; a Flutter or React Native backend needs its own profile and none of this one.',
];

export const COUNTS = STATUS.reduce((acc, s) => ({ ...acc, [s.verdict]: acc[s.verdict] + 1 }), {
  works: 0,
  partial: 0,
  shell: 0,
} as Record<Verdict, number>);

export const statusOf = (component: string): ComponentStatus => {
  const found = STATUS.find((s) => s.component === component);
  if (!found) throw new Error(`No status recorded for ${component}. Add it to status.ts.`);
  return found;
};

/**
 * A specimen may show several contracts at once — a tab list is three. Its label is the WORST of
 * them, so a group cannot look finished while one of its members is not.
 */
const RANK: Record<Verdict, number> = { shell: 0, partial: 1, works: 2 };

export const verdictOf = (...components: string[]): Verdict =>
  components
    .map(statusOf)
    .reduce<Verdict>((worst, s) => (RANK[s.verdict] < RANK[worst] ? s.verdict : worst), 'works');
