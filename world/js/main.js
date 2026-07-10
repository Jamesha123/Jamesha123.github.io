import { ContentStore } from "./core/content-store.js";
import { loadContent } from "./core/load-content.js";
import { createPhaserGame } from "./scenes/world-scene.js";
import { showFatalError } from "./utils/helpers.js";

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

loadContent()
  .then(function (data) {
    try {
      if (typeof window !== "undefined") {
        window.SHOW_HITBOXES = data.showHitboxes === true;
      }
      createPhaserGame(new ContentStore(data));
    } catch (error) {
      reportBootError(error.message || "Game failed to start.");
    }
  })
  .catch(function (error) {
    reportBootError("Failed to load world data: " + (error.message || error));
  });
