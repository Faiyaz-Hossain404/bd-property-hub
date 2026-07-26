'use client';

import { motion, useReducedMotion, type Transition } from 'motion/react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type HTMLAttributes,
} from 'react';

// Ported from React Bits' BlurText to TypeScript for this strict-TS codebase, with
// two additions on top of the original reveal logic: an `as` prop (so it can render
// as a <span> and nest inside an <h1> instead of emitting invalid <p>-in-heading
// markup) and prefers-reduced-motion support (reduced-motion users get the final
// text instantly, with no blur animation). The look and stagger are otherwise the
// same as the source.

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
    // A key present in one snapshot but not another yields `undefined`; drop those
    // so each property animates only across the steps that actually define it.
    keyframes[key] = [from[key], ...steps.map((step) => step[key])].filter(
      (value): value is string | number => value !== undefined,
    );
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
  animationFrom,
  animationTo,
  easing = (t) => t,
  onAnimationComplete,
  stepDuration = 0.35,
  ...rest
}: BlurTextProps) => {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
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
  }, [threshold, rootMargin]);

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

  return (
    <Wrapper
      ref={ref}
      className={className}
      style={{ display: 'inline-flex', flexWrap: 'wrap' }}
      {...rest}
    >
      {elements.map((segment, index) => {
        const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);

        // Reduced-motion users still get the text — just instantly, with no blur
        // reveal. Keeping `initial` at fromSnapshot (rather than the final state)
        // makes the server and client render the same HTML, so there is no
        // hydration mismatch; only the transition duration/stagger differ.
        const spanTransition: Transition = {
          duration: shouldReduceMotion ? 0 : totalDuration,
          times,
          delay: shouldReduceMotion ? 0 : (index * delay) / 1000,
          ease: easing,
        };

        return (
          <motion.span
            className="inline-block will-change-[transform,filter,opacity]"
            key={index}
            initial={fromSnapshot}
            animate={inView ? animateKeyframes : fromSnapshot}
            transition={spanTransition}
            onAnimationComplete={
              index === elements.length - 1 ? onAnimationComplete : undefined
            }
          >
            {segment === ' ' ? '\u00A0' : segment}
            {animateBy === 'words' && index < elements.length - 1 && '\u00A0'}
          </motion.span>
        );
      })}
    </Wrapper>
  );
};

export default BlurText;
