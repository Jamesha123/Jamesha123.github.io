/**
 * Optional hotspot JSON:
 *
 * "typography": {
 *   "desktop": {
 *     "title": "2.75rem",
 *     "body": "1.65rem",
 *     "tech": "1.15rem",
 *     "link": "1.1rem",
 *     "linkLabel": "0.95rem",
 *     "contactLabel": "1rem",
 *     "contactValue": "1.35rem"
 *   },
 *   "mobile": {
 *     "title": "1.15rem",
 *     "body": "0.95rem"
 *   }
 * }
 *
 * Shared keys at the typography root apply to both platforms unless overridden.
 * Mobile falls back to desktop for any key not set under mobile.
 */

export const HOTSPOT_FONT_KEYS = {
  title: "--hs-title-size",
  body: "--hs-body-size",
  tech: "--hs-tech-size",
  link: "--hs-link-size",
  linkLabel: "--hs-link-label-size",
  contactLabel: "--hs-contact-label-size",
  contactValue: "--hs-contact-value-size",
};

const FONT_KEY_NAMES = Object.keys(HOTSPOT_FONT_KEYS);

function isValidCssFontSize(value) {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("{") || trimmed.includes("}") || trimmed.includes(";")) {
    return false;
  }

  return true;
}

export function resolveHotspotTypography(hotspot, isMobile) {
  if (!hotspot || !hotspot.typography || typeof hotspot.typography !== "object") {
    return null;
  }

  const typo = hotspot.typography;
  const platformKey = isMobile ? "mobile" : "desktop";
  const platform = typo[platformKey] || {};
  const desktop = typo.desktop || {};
  const vars = {};

  FONT_KEY_NAMES.forEach(function (key) {
    const value = platform[key] || (isMobile ? desktop[key] : null) || typo[key];
    if (isValidCssFontSize(value)) {
      vars[HOTSPOT_FONT_KEYS[key]] = value.trim();
    }
  });

  return Object.keys(vars).length ? vars : null;
}

export function applyHotspotTypography(modalEl, hotspot, isMobile) {
  clearHotspotTypography(modalEl);

  const vars = resolveHotspotTypography(hotspot, isMobile);
  if (!modalEl || !vars) {
    return;
  }

  Object.keys(vars).forEach(function (name) {
    modalEl.style.setProperty(name, vars[name]);
  });
}

export function clearHotspotTypography(modalEl) {
  if (!modalEl) {
    return;
  }

  Object.values(HOTSPOT_FONT_KEYS).forEach(function (name) {
    modalEl.style.removeProperty(name);
  });
}
