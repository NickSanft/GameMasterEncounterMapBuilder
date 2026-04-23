import fs from 'node:fs';
import path from 'node:path';

/**
 * Playwright globalSetup — runs once before all specs.
 *
 * Why: Phase 61 made the GM tour auto-show on first boot when
 * `preferences.onboardingComplete === false` (which is the default
 * out of the box). That's nice for real users but breaks every e2e
 * spec that doesn't explicitly opt out: the tour's dim backdrop has
 * `pointer-events: auto` on the surrounds-the-target pieces, and on
 * the centered Welcome step it covers the whole viewport — so any
 * test that tries to right-click the canvas, drop a token, or open
 * the editor races against the tour and fails.
 *
 * Fix: seed a storage state with `{ onboardingComplete: true }` so
 * the tour stays dormant for all the non-tour specs. The
 * `e2e/onboarding-tour.spec.ts` file's `bootGmFresh()` helper
 * removes the pref via `addInitScript` to exercise the auto-show
 * path explicitly.
 *
 * Same approach is reusable for any future first-run-modal feature
 * (e.g. a "what's new" toast post-upgrade).
 */

const PORT = Number(process.env.E2E_PORT ?? 4173);
const ORIGIN = `http://localhost:${PORT}`;

const STORAGE_STATE: {
  cookies: never[];
  origins: { origin: string; localStorage: { name: string; value: string }[] }[];
} = {
  cookies: [],
  origins: [
    {
      origin: ORIGIN,
      localStorage: [
        {
          name: 'gm-encounter-maps-prefs',
          value: JSON.stringify({ onboardingComplete: true }),
        },
      ],
    },
  ],
};

export default async function globalSetup(): Promise<void> {
  const outDir = path.resolve('playwright', '.auth');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'storage-state.json'),
    JSON.stringify(STORAGE_STATE, null, 2),
  );
}
