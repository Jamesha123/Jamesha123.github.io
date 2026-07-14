import { ContentStore } from "./core/content-store.js?v=119";
import { loadContent } from "./core/load-content.js?v=119";
import { createPhaserGame } from "./scenes/world-scene.js?v=119";
import { setBootStage, showFatalError } from "./utils/helpers.js?v=119";
import { bindFullscreenControls } from "./utils/fullscreen.js?v=119";
import { bindMobileControls } from "./ui/mobile-controls.js?v=119";
import { initWorldDebug, bindDebugRefresh } from "./config/debug.js";
import { DebugGraphics } from "./systems/debug-graphics.js?v=119";
import { MapTransitionSystem } from "./systems/map-transition-system.js?v=119";
import { ASSET_VERSION } from "./version.js?v=119";

const BOOT_TIMEOUT_MS = 25000;

initWorldDebug();

if (typeof window !== "undefined") {
  window.__WORLD_VERSION__ = ASSET_VERSION;
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

setBootStage("Starting v" + ASSET_VERSION);

bindFullscreenControls();
bindMobileControls();

loadContent()
  .then(function (data) {
    setBootStage("Starting game v" + ASSET_VERSION);
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

window.addEventListener("world-ready", function () {
  clearBootTimeout();

  const game = window.__phaserGame;
  const scene = game && game.scene ? game.scene.getScene("WorldScene") : null;
  if (!scene) {
    return;
  }

  bindDebugRefresh(function () {
    DebugGraphics.redraw(scene);
    if (scene.world) {
      MapTransitionSystem.redrawOutlines(scene, scene.world);
    }
  });
});

export { ASSET_VERSION };
