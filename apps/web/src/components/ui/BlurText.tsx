'use client';

import { motion, useReducedMotion, type Transition } from 'motion/react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
} from 'react';

// Ported from React Bits' BlurText to TypeScript for this strict-TS codebase, with
// a few additions on top of the original reveal logic:
//   - `as`         : root element (default 'p'); the hero passes 'span' so it nests
//                    inside an <h1> instead of emitting invalid <p>-in-heading markup.
//   - `immediate`  : reveal on mount and skip the IntersectionObserver. Above-the-fold
//                    content (the hero) is already in view, so waiting on an
//                    intersection callback is pure overhead and risks a blank frame.
//   - `startIndex` : stagger offset so two side-by-side instances read as one
//                    continuous cascade instead of two parallel ones.
//   - `startDelay` : flat delay (ms) added before this instance's own word
//                    stagger begins, so separate blocks (e.g. a badge, a
//                    heading, a paragraph) can cascade in sequence.
//   - reduced motion: reduced-motion users get the text instantly.
// For above-the-fold use, pass animationFrom/To that keep opacity at 1 (animate only
// blur + y): the primary heading is then painted from the first frame (LCP-friendly,
// legible even before JS runs) instead of being gated at opacity:0 behind hydration.

type Snapshot = Record<string, string | number>;

const buildKeyframes = (
  from: Snapshot,
  steps: Snapshot[],
): Record<string, Array<string | number>> => {
  const keys = new Set<string>([
    ...Object.keys(from),
    ...steps.flatMap((step) => Object.keys(step)),
  ]);

  const keyframes: Record<string, Array<string | number>> = {};
  keys.forEach((key) => {
    // Carry the last defined value forward for any step that omits this key, so
    // every property's keyframe array stays exactly as long as the shared `times`
    // array (motion requires equal lengths) even for partial custom snapshots.
    const raw = [from[key], ...steps.map((step) => step[key])];
    let last: string | number = raw.find((value) => value !== undefined) ?? 0;
    keyframes[key] = raw.map((value) => {
      if (value !== undefined) last = value;
      return last;
    });
  });
  return keyframes;
};

type BlurTextProps = {
  text?: string;
  delay?: number;
  className?: string;
  as?: ElementType;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  threshold?: number;
  rootMargin?: string;
  immediate?: boolean;
  startIndex?: number;
  startDelay?: number;
  animationFrom?: Snapshot;
  animationTo?: Snapshot[];
  easing?: (t: number) => number;
  onAnimationComplete?: () => void;
  stepDuration?: number;
} & Omit<HTMLAttributes<HTMLElement>, 'children'>;

const BlurText = ({
  text = '',
  delay = 150,
  className = '',
  as: Wrapper = 'p',
  animateBy = 'words',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  immediate = false,
  startIndex = 0,
  startDelay = 0,
  animationFrom,
  animationTo,
  easing = (t) => t,
  onAnimationComplete,
  stepDuration = 0.35,
  style,
  ...rest
}: BlurTextProps) => {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(immediate);
  const ref = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // `immediate` (above-the-fold) reveals on mount, so no observer is needed.
    if (immediate) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate, threshold, rootMargin]);

  const defaultFrom = useMemo<Snapshot>(
    () =>
      direction === 'top'
        ? { filter: 'blur(10px)', opacity: 0, y: -50 }
        : { filter: 'blur(10px)', opacity: 0, y: 50 },
    [direction],
  );

  const defaultTo = useMemo<Snapshot[]>(
    () => [
      { filter: 'blur(5px)', opacity: 0.5, y: direction === 'top' ? 5 : -5 },
      { filter: 'blur(0px)', opacity: 1, y: 0 },
    ],
    [direction],
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;

  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, i) =>
    stepCount === 1 ? 0 : i / (stepCount - 1),
  );

  // Identical for every word this render, so build it once, not per word.
  const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);
  // Merge the required inline-flex layout with any caller-supplied style, so a
  // passed `style` can't silently drop the word-wrap layout.
  const wrapperStyle: CSSProperties = { display: 'inline-flex', flexWrap: 'wrap', ...style };

  return (
    <Wrapper ref={ref} className={className} style={wrapperStyle} {...rest}>
      {elements.map((segment, index) => {
        // Reduced-motion users still get the text — just instantly. Keeping
        // `initial` at fromSnapshot makes server and client render the same HTML
        // (no hydration mismatch); only the transition duration/stagger differ.
        const spanTransition: Transition = {
          duration: shouldReduceMotion ? 0 : totalDuration,
          times,
          delay: shouldReduceMotion
            ? 0
            : startDelay / 1000 + ((startIndex + index) * delay) / 1000,
          ease: easing,
        };

        return (
          <motion.span
            className="inline-block"
            key={index}
            initial={fromSnapshot}
            animate={inView ? animateKeyframes : fromSnapshot}
            transition={spanTransition}
            onAnimationComplete={
              index === elements.length - 1 ? onAnimationComplete : undefined
            }
          >
            {segment === ' ' ? '\u00A0' : segment}
            {/* A real space, not nbsp: for words-mode instances this is real,
                selectable/copyable text (the badge and subhead aren't
                aria-hidden), and a copied U+00A0 silently fails exact-match
                comparisons (search boxes, form fields) where a normal space
                would match. */}
            {animateBy === 'words' && index < elements.length - 1 && ' '}
          </motion.span>
        );
      })}
    </Wrapper>
  );
};

export default BlurText;
