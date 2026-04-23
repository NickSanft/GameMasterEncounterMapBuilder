import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 60 — voice transcription mic button on the Session Notes panel.
 *
 * Real microphone access requires user permission and a real audio
 * device, neither of which are available in CI. To test the wiring
 * deterministically we inject a stub `SpeechRecognition` class via
 * `addInitScript` BEFORE the entry boots — the wrapper then talks to
 * the stub instead of the browser's real speech engine. The stub lets
 * the test fire transcript events on demand and assert the side
 * effects (button state, status text, textarea content).
 */

async function injectSpeechRecognitionStub(page: Page) {
  await page.addInitScript(() => {
    class StubRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      maxAlternatives = 0;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onstart: (() => void) | null = null;

      start() {
        // Synchronously fire onstart so the wrapper transitions to
        // active immediately — saves the test from racing against
        // queued microtasks.
        Promise.resolve().then(() => this.onstart?.());
      }
      stop() {
        Promise.resolve().then(() => this.onend?.());
      }
      abort() {
        // No-op for the stub.
      }
    }
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition =
      StubRecognition;
    // Expose a hook so tests can fire fake transcripts at the most
    // recently-created stub. Each `start()` we record the instance
    // through a getter on the constructor; for simplicity we walk the
    // wrapper's onresult target each time the test wants to dispatch.
    (window as unknown as { __lastRecognition?: unknown }).__lastRecognition =
      undefined;
    const origCtor = (window as unknown as { SpeechRecognition: typeof StubRecognition })
      .SpeechRecognition;
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition =
      class extends origCtor {
        constructor() {
          super();
          (window as unknown as { __lastRecognition?: unknown }).__lastRecognition = this;
        }
      };
  });
}

async function openNotes(page: Page) {
  // Pre-open the notes panel via its localStorage key so the test
  // doesn't depend on session-menu button discoverability (which is
  // brittle — the menu wraps + scrolls on narrow viewports). The
  // notes-panel module reads `gm-encounter-maps-notes-open` at boot.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('gm-encounter-maps-notes-open', 'true');
    } catch { /* storage blocked */ }
  });
  await page.goto('./gm.html');
  await page.waitForSelector('#canvas');
  await expect(page.locator('.notes-panel')).toBeVisible();
}

test.describe('Voice transcription (Phase 60)', () => {
  test('Mic button is visible when browser supports it + pref is on (default)', async ({
    page,
  }) => {
    await injectSpeechRecognitionStub(page);
    await openNotes(page);

    const mic = page.locator('.notes-panel-mic');
    await expect(mic).toBeVisible();
    await expect(mic).toHaveAttribute('aria-pressed', 'false');
  });

  test('Mic button hides when the pref is turned off', async ({ page }) => {
    await injectSpeechRecognitionStub(page);
    await openNotes(page);
    const mic = page.locator('.notes-panel-mic');
    await expect(mic).toBeVisible();

    // Turn the pref off in Settings → Accessibility.
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Accessibility' }).click();
    await dialog.locator('input[data-field="voiceTranscription"]').uncheck();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Pref subscription should hide the mic button live.
    await expect(mic).toBeHidden();
  });

  test('Clicking the mic toggles aria-pressed + shows the listening status', async ({
    page,
  }) => {
    await injectSpeechRecognitionStub(page);
    await openNotes(page);
    const mic = page.locator('.notes-panel-mic');
    const status = page.locator('.notes-panel-status');

    await mic.click();
    await expect(mic).toHaveAttribute('aria-pressed', 'true');
    await expect(status).toBeVisible();
    await expect(status).toContainText(/Listening/);

    await mic.click();
    await expect(mic).toHaveAttribute('aria-pressed', 'false');
    await expect(status).toBeHidden();
  });

  test('Final transcript text gets appended to the notes textarea', async ({ page }) => {
    await injectSpeechRecognitionStub(page);
    await openNotes(page);
    const mic = page.locator('.notes-panel-mic');
    const textarea = page.locator('.notes-panel-textarea');
    // Clear any pre-existing notes from prior runs sharing the LS key.
    await textarea.fill('');

    await mic.click();
    await expect(mic).toHaveAttribute('aria-pressed', 'true');

    // Fire a fake final-result event through the stub recognizer.
    await page.evaluate(() => {
      const recog = (window as unknown as { __lastRecognition?: { onresult?: (e: unknown) => void } })
        .__lastRecognition;
      recog?.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            length: 1,
            0: { transcript: 'goblin ambush in the cellar' },
          },
        ],
      });
    });

    await expect(textarea).toHaveValue('goblin ambush in the cellar');
  });

  test('Permission-denied error surfaces in the status banner', async ({ page }) => {
    await injectSpeechRecognitionStub(page);
    await openNotes(page);
    const mic = page.locator('.notes-panel-mic');
    const status = page.locator('.notes-panel-status');

    await mic.click();
    // Fire a fake `not-allowed` error from the stub.
    await page.evaluate(() => {
      const recog = (window as unknown as {
        __lastRecognition?: { onerror?: (e: unknown) => void; onend?: () => void };
      }).__lastRecognition;
      recog?.onerror?.({ error: 'not-allowed' });
      recog?.onend?.();
    });

    await expect(status).toBeVisible();
    await expect(status).toHaveClass(/error/);
    await expect(status).toContainText(/Microphone access blocked/);
    // Wrapper should NOT auto-restart on a fatal permission error.
    await expect(mic).toHaveAttribute('aria-pressed', 'false');
  });
});
