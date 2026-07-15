/**
 * Optional hotspot JSON:
 *
 * "typography": {
 *   "desktop": { "title": "2.75rem", "body": "1.65rem", ... },
 *   "mobile": { "title": "1.15rem", "body": "0.95rem", ... }
 * }
 *
 * Shared keys at the typography root apply to both unless overridden.
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

const DIRECT_TARGETS = {
  title: ["#modal-title"],
  body: [".modal-body-scroll p"],
  tech: [".modal-tech-list li"],
  link: [
    ".modal-links a:not(.modal-contact-card)",
    ".modal-links button",
    ".modal-link-url:not(.modal-contact-card)",
  ],
  linkLabel: [".modal-link-label"],
  contactLabel: [".modal-contact-label"],
  contactValue: [".modal-contact-value"],
};

const DIRECT_FONT_SELECTORS = Object.values(DIRECT_TARGETS)
  .flat()
  .join(", ");

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

export function isHotspotMobileView() {
  if (typeof window === "undefined") {
    return false;
  }

  if (document.documentElement.classList.contains("mobile-user")) {
    return true;
  }

  if (window.matchMedia("(pointer: coarse)").matches) {
    return true;
  }

  return /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
}

export function resolveHotspotTypography(hotspot, isMobile) {
  if (!hotspot || !hotspot.typography || typeof hotspot.typography !== "object") {
    return null;
  }

  const typo = hotspot.typography;
  const platformKey = isMobile ? "mobile" : "desktop";
  const platform = typo[platformKey] || {};
  const desktop = typo.desktop || {};
  const resolved = {};

  FONT_KEY_NAMES.forEach(function (key) {
    const value = platform[key] || (isMobile ? desktop[key] : null) || typo[key];
    if (isValidCssFontSize(value)) {
      resolved[key] = value.trim();
    }
  });

  return Object.keys(resolved).length ? resolved : null;
}

function applyDirectFontSizes(modalEl, resolved) {
  FONT_KEY_NAMES.forEach(function (key) {
    const size = resolved[key];
    if (!size) {
      return;
    }

    (DIRECT_TARGETS[key] || []).forEach(function (selector) {
      modalEl.querySelectorAll(selector).forEach(function (element) {
        element.style.setProperty("font-size", size, "important");
      });
    });
  });
}

export function applyHotspotTypography(modalEl, hotspot, isMobile) {
  clearHotspotTypography(modalEl);

  const mobileView = typeof isMobile === "boolean" ? isMobile : isHotspotMobileView();
  const resolved = resolveHotspotTypography(hotspot, mobileView);
  if (!modalEl || !resolved) {
    return;
  }

  FONT_KEY_NAMES.forEach(function (key) {
    const cssVar = HOTSPOT_FONT_KEYS[key];
    if (resolved[key]) {
      modalEl.style.setProperty(cssVar, resolved[key], "important");
    }
  });

  modalEl.dataset.hotspotTypography = mobileView ? "mobile" : "desktop";
  applyDirectFontSizes(modalEl, resolved);
}

export function clearHotspotTypography(modalEl) {
  if (!modalEl) {
    return;
  }

  Object.values(HOTSPOT_FONT_KEYS).forEach(function (name) {
    modalEl.style.removeProperty(name);
  });

  delete modalEl.dataset.hotspotTypography;

  modalEl.querySelectorAll(DIRECT_FONT_SELECTORS).forEach(function (element) {
    element.style.removeProperty("font-size");
  });
}
