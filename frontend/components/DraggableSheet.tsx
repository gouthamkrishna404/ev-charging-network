"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

export type SnapPoint = "peek" | "half" | "full";

const PEEK_HEIGHT_PX = 190;

function snapHeightPx(snap: SnapPoint, viewportH: number) {
  if (snap === "peek") return PEEK_HEIGHT_PX;
  if (snap === "half") return viewportH * 0.55;
  return viewportH * 0.9;
}

/**
 * A mobile bottom sheet that can be dragged between peek/half/full heights over
 * a full-bleed backdrop (a map, typically) -- the Google Maps / Uber pattern for
 * "browse a map, pull up a list when you want it" rather than a static panel.
 *
 * `peek` is a small always-visible strip (handle + header); dragging it up reveals
 * more of `children` up to `full`. Snapping is by nearest-point on release, not
 * velocity-based -- simpler and reliable across touch and mouse without a gesture
 * library, and plenty for a 3-stop sheet.
 */
export default function DraggableSheet({
  header,
  children,
  snap,
  onSnapChange,
}: {
  header: ReactNode;
  children: ReactNode;
  snap: SnapPoint;
  onSnapChange: (snap: SnapPoint) => void;
}) {
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);

  useEffect(() => {
    function handleMove(e: PointerEvent) {
      if (!dragState.current) return;
      const deltaY = e.clientY - dragState.current.startY;
      const maxHeight = window.innerHeight * 0.92;
      const next = Math.min(maxHeight, Math.max(PEEK_HEIGHT_PX, dragState.current.startHeight - deltaY));
      setDragHeight(next);
    }
    function handleUp() {
      if (!dragState.current) return;
      const viewportH = window.innerHeight;
      const current = dragHeight ?? snapHeightPx(snap, viewportH);
      dragState.current = null;
      const distances = (["peek", "half", "full"] as SnapPoint[]).map((point) => ({
        point,
        dist: Math.abs(snapHeightPx(point, viewportH) - current),
      }));
      distances.sort((a, b) => a.dist - b.dist);
      onSnapChange(distances[0].point);
      setDragHeight(null);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragHeight, snap, onSnapChange]);

  function startDrag(e: React.PointerEvent) {
    dragState.current = { startY: e.clientY, startHeight: snapHeightPx(snap, window.innerHeight) };
    setDragHeight(snapHeightPx(snap, window.innerHeight));
  }

  const heightPx = dragHeight ?? (typeof window !== "undefined" ? snapHeightPx(snap, window.innerHeight) : PEEK_HEIGHT_PX);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 bg-[#100e1a] border-t border-white/10 rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.5)] flex flex-col md:hidden"
      style={{
        height: `${heightPx}px`,
        marginBottom: "calc(64px + var(--safe-bottom))",
        transition: dragHeight !== null ? "none" : "height 0.28s cubic-bezier(0.16,1,0.3,1)",
        touchAction: "none",
      }}
    >
      <div
        onPointerDown={startDrag}
        className="shrink-0 pt-2 pb-1 flex flex-col items-center cursor-grab active:cursor-grabbing touch-none"
      >
        <span className="w-9 h-1.5 rounded-full bg-white/20" />
      </div>
      <div className="shrink-0 px-4">{header}</div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 min-h-0" style={{ touchAction: "pan-y" }}>
        {children}
      </div>
    </div>
  );
}
