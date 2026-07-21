/**
 * Debug overlays — edit the flags below, hard refresh, then run DEBUG.refresh().
 * Cache busting is automatic: bump ASSET_VERSION in js/version.js, then npm run sync-versions.
 *
 * showHotspots    — red interaction circles/rects (map exits, talk range)
 * showCharacters  — player + portrait NPC collision boxes
 * showProps       — house, furniture, prop collision boxes + house enter reach
 *
 * Name labels (James, Contact, Monkey Boy, etc.) are gameplay UI and always show.
 */
export const DEBUG_DEFAULTS = {
  showHotspots: false,
  showCharacters: false,
  showProps: false,
};

export function initWorldDebug() {
  if (typeof window === "undefined") {
    return DEBUG_DEFAULTS;
  }

  const previousRefresh =
    window.DEBUG && typeof window.DEBUG.refresh === "function" ? window.DEBUG.refresh : null;

  window.DEBUG = Object.assign({}, DEBUG_DEFAULTS);

  if (previousRefresh) {
    window.DEBUG.refresh = previousRefresh;
  }

  return window.DEBUG;
}

export function isDebugEnabled(flag) {
  if (typeof window !== "undefined" && window.DEBUG && typeof window.DEBUG[flag] === "boolean") {
    return window.DEBUG[flag];
  }
  return DEBUG_DEFAULTS[flag] === true;
}

export function bindDebugRefresh(refreshFn) {
  if (typeof window === "undefined" || !window.DEBUG) {
    return;
  }

  window.DEBUG.refresh = refreshFn;
}
