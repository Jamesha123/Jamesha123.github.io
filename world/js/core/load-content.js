import { setBootStage, getWorldRootUrl } from "../utils/helpers.js";

const FETCH_TIMEOUT_MS = 15000;

function getDataRoot() {
  return new URL("data/", getWorldRootUrl());
}

async function fetchJson(relativePath) {
  setBootStage("Loading " + relativePath);
  const url = new URL(relativePath, getDataRoot()).href;
  const requestUrl = url + (url.includes("?") ? "&" : "?") + "v=" + Date.now();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(function () {
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(requestUrl, { signal: controller.signal });
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error(
        'Timed out loading "' + relativePath + '". Use http://localhost:8765/world/ and stop extra python servers.'
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    var hint =
      response.status === 404
        ? ' Use http://localhost:8765/world/ (from repo root) or http://localhost:8765/ (world dev-server).'
        : "";
    throw new Error('Failed to load "' + relativePath + '" (' + response.status + ")." + hint);
  }
  return response.json();
}
async function fetchJsonList(relativePaths) {
  const results = await Promise.all(relativePaths.map(fetchJson));
  return results;
}

export async function loadContent() {
  setBootStage("Reading manifest");
  const manifest = await fetchJson("content.json");
  const sprites = manifest.sprites || {};

  const [maps, player, avatar, props, furniture, hotspots] = await Promise.all([
    fetchJsonList(manifest.maps || []),
    fetchJson(sprites.player),
    fetchJson(sprites.avatar),
    fetchJsonList(sprites.props || []),
    sprites.furniture ? fetchJson(sprites.furniture) : Promise.resolve([]),
    fetchJsonList(manifest.hotspots || []),
  ]);

  return {
    startMap: manifest.startMap || (maps[0] && maps[0].id) || "portfolio",
    maps: maps,
    sprites: {
      player: player,
      avatar: avatar,
      npcs: sprites.npcs || [],
      props: props,
      furniture: furniture,
    },
    hotspots: hotspots,
  };
}
