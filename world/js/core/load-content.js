const DATA_ROOT = "data/";

async function fetchJson(relativePath) {
  const response = await fetch(DATA_ROOT + relativePath + "?v=" + Date.now());
  if (!response.ok) {
    throw new Error('Failed to load "' + relativePath + '"');
  }
  return response.json();
}

async function fetchJsonList(relativePaths) {
  const results = await Promise.all(relativePaths.map(fetchJson));
  return results;
}

export async function loadContent() {
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
    showHitboxes: manifest.showHitboxes === true,
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
