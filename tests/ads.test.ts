import { afterEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('localStorage', {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] ?? null;
  },
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  },
  removeItem(key: string) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  },
});

import {
  clearAdLog,
  getAdLog,
  isAdsRemoved,
  purchaseRemoveAds,
  showInterstitial,
  showRewarded,
} from '../src/ads/stubs';

afterEach(() => {
  clearAdLog();
  localStorage.clear();
});

describe('ads stubs', () => {
  it('logs interstitial show/dismiss', async () => {
    await showInterstitial('win');
    expect(getAdLog()).toContain('interstitial:show:win');
    expect(getAdLog()).toContain('interstitial:dismissed:win');
  });

  it('skips interstitial when ads removed', async () => {
    await purchaseRemoveAds();
    expect(isAdsRemoved()).toBe(true);
    clearAdLog();
    const shown = await showInterstitial('fail');
    expect(shown).toBe(false);
    expect(getAdLog()).toContain('interstitial:skipped:fail');
  });

  it('auto-grants rewarded when ads removed', async () => {
    await purchaseRemoveAds();
    clearAdLog();
    const ok = await showRewarded('hint');
    expect(ok).toBe(true);
    expect(getAdLog()).toContain('rewarded:auto-grant:hint');
  });
});
