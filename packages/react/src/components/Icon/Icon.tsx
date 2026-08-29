import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { forwardRef, type SVGAttributes } from 'react';

import { glyphs, type GlyphName } from './glyphs';
import styles from './Icon.module.css';

const iconVariants = cva(styles.root, {
  variants: {
    size: {
      xs: styles.sizeXs,
      s: styles.sizeS,
      m: styles.sizeM,
      l: styles.sizeL,
      xl: styles.sizeXl,
    },
  },
  defaultVariants: {
    size: 'm',
  },
});

export interface IconProps
  extends Omit<SVGAttributes<SVGSVGElement>, 'children'>, VariantProps<typeof iconVariants> {
  /**
   * Which glyph to draw. One of the 50 names in the set — see `glyphNames` for the full list, or
   * the `icon` property on the matching Figma component set.
   */
  name: GlyphName;
  /**
   * The accessible name. Omit it for a decorative icon, which is the common case: an icon sitting
   * beside a text label is hidden from assistive technology so the label is not read twice. Pass it
   * only when the icon is the sole carrier of meaning — an icon-only button, a status glyph with no
   * text beside it.
   */
  label?: string;
}

/**
 * A single glyph from the system's icon set.
 *
 * The icon has no colour of its own: it paints with `currentColor`, so it takes the colour in
 * effect where it is placed. See ADR 0004.
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, size, label, className, ...rest },
  ref,
) {
  const d = glyphs[name];

  // A name that did not survive the type system — computed at runtime, or from an older version of
  // the set. Rendering nothing is the honest outcome; there is no fallback glyph to reach for, and
  // inventing one would hide the missing name rather than surface it.
  if (d === undefined) return null;

  const a11y =
    label === undefined
      ? ({ 'aria-hidden': true } as const)
      : ({ role: 'img', 'aria-label': label } as const);

  return (
    <svg
      ref={ref}
      focusable="false"
      {...a11y}
      {...rest}
      viewBox="0 0 24 24"
      data-ds-part="root"
      className={clsx(iconVariants({ size }), className)}
    >
      <path data-ds-part="glyph" className={styles.glyph} d={d} />
    </svg>
  );
});
