import * as React from 'react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  /** Rendered width/height in pixels. */
  size?: number;
  /** Seconds for one full sweep around the ring. */
  speed?: number;
  className?: string;
}

const SPOKES = 8;

/**
 * iOS-style activity indicator: a ring of tapered spokes whose brightness
 * chases around the circle. Reads far calmer and more "system-native" than a
 * spinning arc. Inherits color from `currentColor` (default: muted gray, the
 * authentic Apple tone) so callers set it with a `text-*` class.
 */
export function Spinner({ size = 24, speed = 0.8, className }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
      className={cn('text-muted-foreground', className)}
    >
      {Array.from({ length: SPOKES }).map((_, i) => (
        <line
          key={i}
          x1="12"
          y1="3.25"
          x2="12"
          y2="7.25"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          className="ios-spinner-spoke"
          transform={`rotate(${i * (360 / SPOKES)} 12 12)`}
          style={{
            animationDuration: `${speed}s`,
            animationDelay: `${-(speed / SPOKES) * i}s`,
          }}
        />
      ))}
    </svg>
  );
}
