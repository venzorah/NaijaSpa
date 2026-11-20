import { describe, expect, it } from "vitest";
import {
  INSTALL_COOLDOWN_MS,
  INSTALL_DISMISS_AT_KEY,
  INSTALL_DISMISS_KEY,
  isInstallDismissed,
  markInstallDismissed
} from "../src/lib/pwa-install";

function memoryStorage(start: Record<string, string> = {}): Storage {
  const data = { ...start };
  return {
    get length() {
      return Object.keys(data).length;
    },
    clear() {
      for (const key of Object.keys(data)) delete data[key];
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    key() {
      return null;
    },
    removeItem(key: string) {
      delete data[key];
    },
    setItem(key: string, value: string) {
      data[key] = value;
    }
  };
}

describe("Android install prompt cooldown", () => {
  it("respects a previous forever-dismiss", () => {
    const store = memoryStorage({ [INSTALL_DISMISS_KEY]: "1" });
    expect(isInstallDismissed(Date.now(), store)).toBe(true);
  });

  it("hides the banner for two weeks after Maybe Later", () => {
    const store = memoryStorage();
    const now = 1_700_000_000_000;
    markInstallDismissed(now, store);
    expect(isInstallDismissed(now + 60_000, store)).toBe(true);
    expect(isInstallDismissed(now + INSTALL_COOLDOWN_MS + 1, store)).toBe(false);
    expect(store.getItem(INSTALL_DISMISS_AT_KEY)).toBe(String(now));
  });
});
