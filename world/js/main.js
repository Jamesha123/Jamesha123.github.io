import { ContentStore } from "./core/content-store.js";
import { loadContent } from "./core/load-content.js";
import { createPhaserGame } from "./scenes/world-scene.js";
import { showFatalError } from "./utils/helpers.js";

loadContent()
  .then(function (data) {
    createPhaserGame(new ContentStore(data));
  })
  .catch(function (error) {
    console.error("Failed to load world content", error);
    showFatalError("Failed to load world data.");
  });
