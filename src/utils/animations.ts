import type { LatLng } from "../types";
import { interpolate } from "./coordinates";

/**
 * Smoothly animate a coordinate from `from` to `to` over `durationMs`.
 * Calls `onUpdate` with interpolated position on each animation frame.
 * Returns a cancel function.
 */
export function animateMarker(
  from: LatLng,
  to: LatLng,
  durationMs: number,
  onUpdate: (position: LatLng) => void
): () => void {
  let animationId: number | null = null;
  const startTime = performance.now();

  function step(currentTime: number) {
    const elapsed = currentTime - startTime;
    const t = Math.min(elapsed / durationMs, 1);

    // Ease-out cubic for smooth deceleration
    const eased = 1 - Math.pow(1 - t, 3);
    onUpdate(interpolate(from, to, eased));

    if (t < 1) {
      animationId = requestAnimationFrame(step);
    }
  }

  animationId = requestAnimationFrame(step);

  return () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
  };
}
