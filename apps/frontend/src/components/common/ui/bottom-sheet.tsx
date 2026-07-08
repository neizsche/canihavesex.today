import * as React from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/common/ui/button';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Label for the primary blue dismiss button (e.g. "Done", "Got it"). */
  actionLabel: string;
  /** Shows the iOS-style drag grabber, which can be dragged down to dismiss. */
  showGrabber?: boolean;
  /** Extra classes for the sheet panel (e.g. a max-height override). */
  className?: string;
  children: React.ReactNode;
}

// Drag further than this (px) and release to dismiss; otherwise the sheet snaps back.
const DISMISS_THRESHOLD = 120;
// Divisor used to fade the backdrop in step with the drag distance.
const BACKDROP_FADE_SPAN = 320;

/**
 * The shared "content sheet" shell: a tap-to-dismiss backdrop, a slide-up panel
 * with a scrollable body, and a single primary blue action button. Extracted
 * from the log screen's coach sheet so the Today insights sheet stays visually
 * identical. When {@link BottomSheetProps.showGrabber} is set, the grabber is a
 * drag handle — drag down to dismiss, release short of the threshold to snap
 * back. Children supply the body; the shell owns the animation and dismiss button.
 */
export function BottomSheet({
  isOpen,
  onClose,
  actionLabel,
  showGrabber = false,
  className,
  children,
}: BottomSheetProps) {
  const [mounted, setMounted] = React.useState(false);
  const [dragY, setDragY] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [dismissing, setDismissing] = React.useState(false);
  const startYRef = React.useRef<number | null>(null);
  const dragYRef = React.useRef(0);

  React.useEffect(() => {
    if (isOpen) {
      // Reset any leftover drag offset so the sheet opens cleanly.
      setMounted(true);
      setDragY(0);
      dragYRef.current = 0;
      setDragging(false);
      setDismissing(false);
    } else {
      const timer = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted && !isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    startYRef.current = e.clientY;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (startYRef.current === null) return;
    const delta = Math.max(0, e.clientY - startYRef.current);
    dragYRef.current = delta;
    setDragY(delta);
  };

  const endDrag = () => {
    if (startYRef.current === null) return;
    startYRef.current = null;
    setDragging(false);
    if (dragYRef.current > DISMISS_THRESHOLD) {
      // Continue the motion off-screen, then unmount via the parent.
      const offscreen = typeof window !== 'undefined' ? window.innerHeight : 800;
      setDismissing(true);
      setDragY(offscreen);
      dragYRef.current = offscreen;
      window.setTimeout(onClose, 260);
    } else {
      setDragY(0);
      dragYRef.current = 0;
    }
  };

  const dragProgress = Math.min(1, dragY / BACKDROP_FADE_SPAN);

  // While a finger owns the sheet we drive the transform inline (no transition
  // for 1:1 tracking); otherwise the class-based open/close animation runs.
  const panelStyle: React.CSSProperties | undefined = dragging
    ? { transform: `translateY(${dragY}px)`, transition: 'none' }
    : dismissing
      ? { transform: `translateY(${dragY}px)`, transition: 'transform 0.26s ease-out' }
      : undefined;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end justify-center sm:items-center transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        style={dragging || dismissing ? { opacity: 1 - dragProgress } : undefined}
        onClick={onClose}
      />

      <div
        className={cn(
          'relative w-full max-w-md transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-10'
        )}
        style={panelStyle}
      >
        <div
          className={cn(
            'flex max-h-[85vh] flex-col rounded-t-3xl bg-card shadow-2xl sm:mx-4 sm:rounded-3xl',
            className
          )}
        >
          {showGrabber && (
            <div
              className="flex shrink-0 cursor-grab touch-none justify-center pb-2 pt-3 active:cursor-grabbing"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <div className="h-1.5 w-9 rounded-full bg-zinc-300 dark:bg-white/20" />
            </div>
          )}

          {children}

          <div className="shrink-0 px-6 pb-8 pt-4">
            <Button
              onClick={onClose}
              className="h-12 w-full rounded-xl bg-accent text-[17px] font-semibold text-white shadow-sm transition-all hover:bg-[#0066D6] active:scale-[0.98]"
            >
              {actionLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
