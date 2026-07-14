import { setBootStage, getWorldRootUrl } from "../utils/helpers.js?v=114";

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
  if (!Array.isArray(relativePaths) || !relativePaths.length) {
    return [];
  }

  const results = await Promise.all(relativePaths.map(fetchJson));
  return results.filter(function (entry) {
    return entry && typeof entry === "object";
  });
}

function splitNpcEntries(npcEntries) {
  let player = null;
  let avatar = null;
  const npcs = [];

  npcEntries.forEach(function (entry) {
    if (!entry || typeof entry !== "object") {
      return;
    }

    if (entry.role === "player" || entry.id === "player") {
      player = entry;
      return;
    }

    if (entry.role === "avatar" || entry.id === "james") {
      avatar = entry;
      return;
    }

    npcs.push(entry);
  });

  return { player, avatar, npcs };
}

function splitPropEntries(propEntries) {
  const props = [];
  let furniture = [];

  propEntries.forEach(function (entry) {
    if (Array.isArray(entry)) {
      furniture = entry;
      return;
    }

    if (entry && typeof entry === "object") {
      props.push(entry);
    }
  });

  return { props, furniture };
}

export async function loadContent() {
  setBootStage("Reading manifest");
  const manifest = await fetchJson("content.json");
  const sprites = manifest.sprites || {};

  const [maps, npcEntries, propEntries, hotspots] = await Promise.all([
    fetchJsonList(manifest.maps || []),
    fetchJsonList(sprites.npcs || []),
    fetchJsonList(sprites.props || []),
    fetchJsonList(manifest.hotspots || []),
  ]);

  const { player, avatar, npcs } = splitNpcEntries(npcEntries);
  const { props, furniture } = splitPropEntries(propEntries);

  return {
    startMap: manifest.startMap || (maps[0] && maps[0].id) || "portfolio",
    maps: maps,
    sprites: {
      player: player,
      avatar: avatar,
      npcs: npcs,
      props: props,
      furniture: furniture,
    },
    hotspots: hotspots,
  };
}
