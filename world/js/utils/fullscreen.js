import { refreshPhaserScale } from "./viewport.js";
import { isMobileDevice } from "./device.js";

let fullscreenButton = null;
let wantsFullscreen = false;
let exitingViaButton = false;

function getFullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement ||
    null
  );
}

export function isFullscreenActive() {
  if (isMobileDevice()) {
    return false;
  }

  return wantsFullscreen;
}

export function isFullscreenSupported() {
  if (isMobileDevice()) {
    return false;
  }

  const root = document.documentElement;
  return !!(root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen);
}

function refreshGameScale() {
  const game = window.__phaserGame;

  window.requestAnimationFrame(function () {
    refreshPhaserScale(game);
    window.dispatchEvent(new Event("world-viewport-change"));
  });
}

function applyFullscreenLayout(active) {
  document.documentElement.classList.toggle("is-fullscreen", active);
}

function updateFullscreenButton() {
  if (!fullscreenButton) {
    return;
  }

  const active = isFullscreenActive();
  fullscreenButton.setAttribute("aria-pressed", active ? "true" : "false");
  fullscreenButton.textContent = active ? "Exit Fullscreen" : "Fullscreen";
  fullscreenButton.title = active ? "Exit fullscreen" : "Enter fullscreen";
}

async function requestNativeFullscreen() {
  const root = document.documentElement;
  const request =
    root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen;

  if (!request) {
    return false;
  }

  await request.call(root);
  return true;
}

async function exitNativeFullscreen() {
  const exit =
    document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;

  if (exit && getFullscreenElement()) {
    await exit.call(document);
  }
}

function syncFullscreenState() {
  applyFullscreenLayout(wantsFullscreen);
  updateFullscreenButton();
  refreshGameScale();
}

async function enterFullscreen() {
  wantsFullscreen = true;
  syncFullscreenState();

  try {
    await requestNativeFullscreen();
  } catch (error) {
    console.warn("Native fullscreen unavailable, using layout fullscreen.", error);
  }
}

async function exitFullscreen() {
  exitingViaButton = true;
  wantsFullscreen = false;

  try {
    await exitNativeFullscreen();
  } catch (error) {
    console.warn("Fullscreen exit failed:", error);
  }

  syncFullscreenState();
}

export async function toggleFullscreen() {
  if (isMobileDevice()) {
    return;
  }

  if (isFullscreenActive()) {
    await exitFullscreen();
  } else {
    await enterFullscreen();
  }
}

async function handleFullscreenChange() {
  if (isMobileDevice()) {
    return;
  }

  const nativeActive = !!getFullscreenElement();

  if (nativeActive) {
    wantsFullscreen = true;
    exitingViaButton = false;
    syncFullscreenState();
    return;
  }

  if (exitingViaButton) {
    wantsFullscreen = false;
    exitingViaButton = false;
    syncFullscreenState();
    return;
  }

  if (wantsFullscreen) {
    try {
      await requestNativeFullscreen();
    } catch (error) {
      console.warn("Could not restore fullscreen after exit:", error);
    }

    syncFullscreenState();
    return;
  }

  syncFullscreenState();
}

function isModalOpen() {
  const modal = document.getElementById("modal-overlay");
  return !!(modal && modal.classList.contains("open"));
}

export function bindFullscreenControls() {
  fullscreenButton = document.getElementById("fullscreen-btn");
  if (!fullscreenButton) {
    return;
  }

  if (isMobileDevice()) {
    fullscreenButton.hidden = true;
    return;
  }

  fullscreenButton.addEventListener("click", function () {
    toggleFullscreen().catch(function (error) {
      console.warn("Fullscreen toggle failed:", error);
    });
  });

  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

  document.addEventListener(
    "keydown",
    function (event) {
      if (event.key !== "Escape" || !wantsFullscreen || isModalOpen()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (!getFullscreenElement()) {
        enterFullscreen().catch(function (error) {
          console.warn("Fullscreen restore failed:", error);
        });
      }
    },
    true
  );

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", refreshGameScale);
  }

  updateFullscreenButton();
}
