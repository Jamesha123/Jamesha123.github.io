import { ContentStore } from "./core/content-store.js";
import { loadContent } from "./core/load-content.js";
import { createPhaserGame } from "./scenes/world-scene.js";
import { setBootStage, showFatalError } from "./utils/helpers.js";
import { bindFullscreenControls } from "./utils/fullscreen.js?v=72";
import { bindMobileControls } from "./ui/mobile-controls.js?v=72";
import { ASSET_VERSION } from "./version.js";

const BOOT_TIMEOUT_MS = 25000;

if (typeof window !== "undefined" && typeof window.SHOW_HITBOXES !== "boolean") {
  window.SHOW_HITBOXES = false;
}

function reportBootError(message) {
  console.error(message);
  showFatalError(message);
}

window.addEventListener("error", function (event) {
  if (event.message) {
    reportBootError("Script error: " + event.message);
  }
});

window.addEventListener("unhandledrejection", function (event) {
  const reason = event.reason;
  const message =
    reason && reason.message ? reason.message : String(reason || "Unknown startup error");
  reportBootError(message);
});

const bootTimeoutId = window.setTimeout(function () {
  const loading = document.getElementById("loading");
  if (loading && !loading.classList.contains("hidden")) {
    reportBootError(
      "Still loading after " +
        BOOT_TIMEOUT_MS / 1000 +
        "s. Use http://localhost:8765/world/ (repo server) or http://localhost:8765/ (world dev-server), then hard refresh (Ctrl+F5)."
    );
  }
}, BOOT_TIMEOUT_MS);

function clearBootTimeout() {
  window.clearTimeout(bootTimeoutId);
}

setBootStage("Starting");

bindFullscreenControls();
bindMobileControls();

loadContent()
  .then(function (data) {
    setBootStage("Starting game");
    try {
      createPhaserGame(new ContentStore(data));
    } catch (error) {
      clearBootTimeout();
      reportBootError(error.message || "Game failed to start.");
    }
  })
  .catch(function (error) {
    clearBootTimeout();
    reportBootError(
      "Failed to load world data: " +
        (error.message || error) +
        ". Use http://localhost:8765/world/ (not file://) and hard refresh (Ctrl+F5)."
    );
  });

window.addEventListener("world-ready", clearBootTimeout);

export { ASSET_VERSION };
