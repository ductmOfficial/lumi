import { useEffect, useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useResolvedTheme } from "./useResolvedTheme";

/**
 * Edge refraction for the Liquid Glass theme (Chromium only: Chrome/Edge support backdrop-filter: url(#svg-filter)).
 *
 * Each glass bar ([data-glass-bar]) gets its own SVG filter, sized to match exactly:
 *   backdrop → light blur → feDisplacementMap (displacement map drawn on a canvas) → saturation boost
 * Displacement map: the middle of the bar is neutral (no bending); the closer to the rounded edge, the more it pulls the image inward,
 * like the rim of a convex lens. Other browsers keep the regular frosted-glass effect (CSS in glass.css).
 */

interface Bar {
  id: string;
  w: number;
  h: number;
  map: string;
}

const BEZEL = 18; // px: width of the bent edge zone
const SCALE = 34; // px: maximum displacement ≈ SCALE / 2 right at the edge

function isChromium() {
  const uaData = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } })
    .userAgentData;
  if (uaData?.brands) return uaData.brands.some((b) => /Chromium/i.test(b.brand));
  // userAgentData only exists in secure contexts (https/localhost); over a LAN IP (dev --host) fall back to the UA string.
  // Chrome on iOS (CriOS) is WebKit and has no "Chrome/" token, so it is excluded automatically.
  return /(Chrome|Chromium|Edg)\//.test(navigator.userAgent);
}

/** Displacement map for a w×h rounded rectangle with radius r (R channel = horizontal shift, G = vertical shift, 128 = no shift) */
function displacementMap(w: number, h: number, r: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const hx = cx - r;
  const hy = cy - r;
  const bezel = Math.min(BEZEL, r);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - cx;
      const py = y + 0.5 - cy;
      const qx = Math.abs(px) - hx;
      const qy = Math.abs(py) - hy;
      // distance to the edge (inside) + outward-facing normal
      let dist: number, nx: number, ny: number;
      if (qx > 0 && qy > 0) {
        const l = Math.hypot(qx, qy) || 1;
        dist = r - l;
        nx = (qx / l) * Math.sign(px);
        ny = (qy / l) * Math.sign(py);
      } else if (qx > qy) {
        dist = r - qx;
        nx = Math.sign(px);
        ny = 0;
      } else {
        dist = r - qy;
        nx = 0;
        ny = Math.sign(py);
      }
      // bending ramps up quickly near the edge (convex surface)
      const t = dist >= 0 && dist < bezel ? 1 - dist / bezel : 0;
      const m = t * t;
      const i = (y * w + x) * 4;
      // sample from the inside (against the normal) so we never read outside the backdrop
      img.data[i] = 128 - nx * m * 127;
      img.data[i + 1] = 128 - ny * m * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

export function LiquidGlassFilters() {
  const theme = useResolvedTheme();
  const reducedTransparency = useMediaQuery("(prefers-reduced-transparency: reduce)");
  const [bars, setBars] = useState<Bar[]>([]);
  const enabled =
    theme.family === "glass" &&
    typeof window !== "undefined" &&
    isChromium() &&
    !reducedTransparency;

  // measure the glass bars and rebuild the maps when their size changes.
  // Bars can appear later (late router render, the tab bar only exists on mobile) → observe the DOM to find them again.
  useEffect(() => {
    if (!enabled) return;
    const cache = new Map<string, string>();
    let els: HTMLElement[] = [];
    const measure = () => {
      setBars((prev) => {
        const next = els
          .map((el) => {
            const w = Math.round(el.offsetWidth);
            const h = Math.round(el.offsetHeight);
            if (!w || !h) return null;
            const key = `${w}x${h}`;
            let map = cache.get(key);
            if (!map) {
              map = displacementMap(w, h, Math.min(h / 2, w / 2));
              cache.set(key, map);
            }
            return { id: el.dataset.glassBar ?? key, w, h, map };
          })
          .filter((b): b is Bar => !!b);
        const same =
          next.length === prev.length &&
          next.every((b, i) => {
            const p = prev[i];
            return b.id === p?.id && b.w === p.w && b.h === p.h;
          });
        return same ? prev : next;
      });
    };
    const ro = new ResizeObserver(measure);
    // returns true when the set of bars changed
    const track = () => {
      const found = [...document.querySelectorAll<HTMLElement>("[data-glass-bar]")];
      if (found.length === els.length && found.every((el, i) => el === els[i])) return false;
      ro.disconnect();
      els = found;
      els.forEach((el) => {
        ro.observe(el);
      });
      return true;
    };
    // the ResizeObserver reports every newly observed bar once, which takes the first measurement
    track();
    // measure here too, so the filters go away when every bar is gone (nothing left to report a size)
    const mo = new MutationObserver(() => {
      if (track()) measure();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      ro.disconnect();
    };
  }, [enabled]);

  // only enable the url(#…) CSS once the filters are in the DOM
  const active = enabled && bars.length > 0;
  useEffect(() => {
    const el = document.documentElement;
    if (active) el.dataset.refraction = "on";
    else delete el.dataset.refraction;
    return () => {
      delete el.dataset.refraction;
    };
  }, [active]);

  if (!active) return null;
  return (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
      <defs>
        {bars.map((b) => (
          <filter
            key={b.id}
            id={`lg-${b.id}`}
            x="0"
            y="0"
            width={b.w}
            height={b.h}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="soft" />
            <feImage
              href={b.map}
              x="0"
              y="0"
              width={b.w}
              height={b.h}
              preserveAspectRatio="none"
              result="map"
            />
            <feDisplacementMap
              in="soft"
              in2="map"
              scale={SCALE}
              xChannelSelector="R"
              yChannelSelector="G"
              result="bent"
            />
            <feColorMatrix in="bent" type="saturate" values="1.7" />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
