/**
 * Phase 79 — atmospheric weather particle overlay.
 *
 * Renders rain / snow / fog as a screen-space particle system on a
 * dedicated full-screen canvas pinned over the main map canvas.
 * Screen-space (not world-space) is intentional: rain falls on the
 * camera regardless of pan/zoom, matching the player's perspective
 * rather than tying the effect to map coordinates. Same for snow
 * and fog wisps.
 *
 * Lifecycle:
 *   - `setWeather('none')` → tear down the rAF loop + clear the
 *     canvas (kept hidden so it doesn't intercept pointer events).
 *   - `setWeather('rain' | 'snow' | 'fog')` → spawn the particle
 *     pool sized for the current viewport, kick off the rAF loop.
 *   - On window resize, the canvas + particle pool are rebuilt.
 *
 * Reduced-motion: the particle simulation is replaced with a static
 * tinted overlay (subtle grey for rain, soft white for snow, slow-
 * pulsing grey for fog → no, that pulses; just static for fog too).
 *
 * Lazy-loaded? No — the module is small (<2 KB raw) and the user
 * may switch weather at any moment; the synchronous mount avoids a
 * brief blank between selection and effect.
 */

import type { WeatherKind } from '../state/types.js';

export interface WeatherOverlayOptions {
  /**
   * Returns true when the user prefers reduced motion. The overlay
   * polls this on every frame so a Settings change takes effect
   * immediately without re-mounting.
   */
  getReducedMotion?(): boolean;
}

export interface WeatherOverlayHandle {
  setWeather(kind: WeatherKind): void;
  /** Test / debug — current weather kind. */
  getWeather(): WeatherKind;
  destroy(): void;
}

interface RainDrop {
  x: number;
  y: number;
  /** Velocity in px/s. */
  vx: number;
  vy: number;
  len: number;
  alpha: number;
}

interface Snowflake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** Phase offset for the swaying horizontal motion. */
  phase: number;
  alpha: number;
}

interface FogWisp {
  x: number;
  y: number;
  vx: number;
  /** Soft radius in px. */
  r: number;
  alpha: number;
}

const RAIN_COLOR = 'rgba(180, 200, 230, 0.55)';
const SNOW_COLOR = 'rgba(255, 255, 255, 0.85)';
const FOG_COLOR = 'rgba(220, 222, 230, 0.18)';

const REDUCED_TINT: Record<Exclude<WeatherKind, 'none'>, string> = {
  rain: 'rgba(70, 90, 120, 0.10)',
  snow: 'rgba(220, 230, 240, 0.08)',
  fog: 'rgba(200, 200, 210, 0.18)',
};

export function mountWeatherOverlay(
  opts: WeatherOverlayOptions = {},
): WeatherOverlayHandle {
  const canvas = document.createElement('canvas');
  canvas.className = 'weather-overlay';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = true;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let weather: WeatherKind = 'none';
  let raindrops: RainDrop[] = [];
  let snowflakes: Snowflake[] = [];
  let fogWisps: FogWisp[] = [];
  let rafId = 0;
  let lastFrameMs = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (weather !== 'none') seedParticles();
  }

  function seedParticles() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    raindrops = [];
    snowflakes = [];
    fogWisps = [];
    if (weather === 'rain') {
      // Density scales with viewport area; cap at ~250 to keep the
      // per-frame draw cheap on small screens but still visible on
      // large ones.
      const count = Math.min(250, Math.floor((w * h) / 6000));
      for (let i = 0; i < count; i++) {
        raindrops.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: 60 + Math.random() * 30, // slight diagonal
          vy: 600 + Math.random() * 200,
          len: 8 + Math.random() * 6,
          alpha: 0.45 + Math.random() * 0.3,
        });
      }
    } else if (weather === 'snow') {
      const count = Math.min(180, Math.floor((w * h) / 8000));
      for (let i = 0; i < count; i++) {
        snowflakes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: -10 + Math.random() * 20,
          vy: 30 + Math.random() * 40,
          r: 1.2 + Math.random() * 2.6,
          phase: Math.random() * Math.PI * 2,
          alpha: 0.55 + Math.random() * 0.4,
        });
      }
    } else if (weather === 'fog') {
      // A handful of large soft wisps — fewer particles, each huge.
      const count = Math.min(14, Math.floor((w * h) / 80000) + 4);
      for (let i = 0; i < count; i++) {
        fogWisps.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: 6 + Math.random() * 12,
          r: 110 + Math.random() * 180,
          alpha: 0.4 + Math.random() * 0.5,
        });
      }
    }
  }

  function step(now: number) {
    if (!ctx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dt = lastFrameMs > 0 ? Math.min(0.05, (now - lastFrameMs) / 1000) : 0;
    lastFrameMs = now;

    if (opts.getReducedMotion?.()) {
      // Skip the simulation; paint the static tint and stop the loop.
      drawReducedTint();
      rafId = 0;
      return;
    }

    ctx.clearRect(0, 0, w, h);

    if (weather === 'rain') {
      ctx.strokeStyle = RAIN_COLOR;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const d of raindrops) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.y > h + 20) {
          d.y = -10;
          d.x = Math.random() * w;
        }
        if (d.x > w + 20) d.x = -10;
        ctx.globalAlpha = d.alpha;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - (d.vx / d.vy) * d.len, d.y - d.len);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (weather === 'snow') {
      ctx.fillStyle = SNOW_COLOR;
      for (const f of snowflakes) {
        f.phase += dt * 1.2;
        f.x += (f.vx + Math.cos(f.phase) * 12) * dt;
        f.y += f.vy * dt;
        if (f.y > h + 4) {
          f.y = -4;
          f.x = Math.random() * w;
        }
        if (f.x > w + 4) f.x = -4;
        if (f.x < -4) f.x = w + 4;
        ctx.globalAlpha = f.alpha;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (weather === 'fog') {
      ctx.fillStyle = FOG_COLOR;
      for (const wisp of fogWisps) {
        wisp.x += wisp.vx * dt;
        if (wisp.x - wisp.r > w) {
          wisp.x = -wisp.r;
          wisp.y = Math.random() * h;
        }
        ctx.globalAlpha = wisp.alpha;
        ctx.beginPath();
        ctx.arc(wisp.x, wisp.y, wisp.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    rafId = requestAnimationFrame(step);
  }

  function drawReducedTint() {
    if (!ctx || weather === 'none') return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = REDUCED_TINT[weather];
    ctx.fillRect(0, 0, w, h);
  }

  function startLoop() {
    if (rafId !== 0) return;
    lastFrameMs = 0;
    rafId = requestAnimationFrame(step);
  }

  function stopLoop() {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function setWeather(next: WeatherKind) {
    if (next === weather) return;
    weather = next;
    if (next === 'none') {
      stopLoop();
      if (ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      canvas.hidden = true;
      raindrops = [];
      snowflakes = [];
      fogWisps = [];
      return;
    }
    canvas.hidden = false;
    seedParticles();
    if (opts.getReducedMotion?.()) {
      stopLoop();
      drawReducedTint();
    } else {
      startLoop();
    }
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    setWeather,
    getWeather: () => weather,
    destroy() {
      stopLoop();
      window.removeEventListener('resize', resize);
      canvas.remove();
    },
  };
}
