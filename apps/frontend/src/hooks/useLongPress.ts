import * as React from 'react';

export function useLongPress(callback: () => void, ms = 600) {
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const startPosRef = React.useRef<{ x: number, y: number } | null>(null);

    const start = React.useCallback((e: React.PointerEvent) => {
        // Only trigger for primary pointer
        if (!e.isPrimary) return;

        startPosRef.current = { x: e.clientX, y: e.clientY };
        timerRef.current = setTimeout(() => {
            callback();
            timerRef.current = null;
        }, ms);
    }, [callback, ms]);

    const stop = React.useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        startPosRef.current = null;
    }, []);

    const move = React.useCallback((e: React.PointerEvent) => {
        if (!startPosRef.current || !timerRef.current) return;

        const dx = Math.abs(e.clientX - startPosRef.current.x);
        const dy = Math.abs(e.clientY - startPosRef.current.y);

        // If moved more than 15px, cancel the long press (it's likely a scroll attempt)
        if (dx > 15 || dy > 15) {
            stop();
        }
    }, [stop]);

    return {
        onPointerDown: start,
        onPointerUp: stop,
        onPointerLeave: stop,
        onPointerCancel: stop,
        onPointerMove: move,
        // Also handle context menu to prevent default browser behavior if onHelp is provided
        onContextMenu: (e: React.MouseEvent) => {
            e.preventDefault();
        }
    };
}
