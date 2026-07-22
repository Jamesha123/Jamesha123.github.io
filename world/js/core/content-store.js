export class ContentStore {
  constructor(data) {
    this.data = data;
  }

  get startMapId() {
    const maps = this.maps;
    const firstMapId = maps.length > 0 && maps[0] ? maps[0].id : null;
    return this.data.startMap || firstMapId || "default";
  }

  get maps() {
    return this.data.maps || [];
  }

  get map() {
    return this.getMap(this.startMapId) || { enabled: false };
  }

  get mapId() {
    return this.map.id || "default";
  }

  get hotspots() {
    return this.data.hotspots || [];
  }

  get sprites() {
    return this.data.sprites || {};
  }

  get playerConfig() {
    return this.sprites.player || null;
  }

  get avatarConfig() {
    return this.sprites.avatar || null;
  }

  get npcConfigs() {
    return this.sprites.npcs || [];
  }

  get portraitNpcConfigs() {
    return this.npcConfigs.filter(function (npc) {
      return npc && typeof npc === "object" && npc.type === "portrait";
    });
  }

  get walkNpcConfigs() {
    return this.npcConfigs.filter(function (npc) {
      return npc && typeof npc === "object" && npc.type !== "portrait";
    });
  }

  get propConfigs() {
    return this.sprites.props || [];
  }

  get furnitureConfigs() {
    return this.sprites.furniture || [];
  }

  get useTiled() {
    return this.maps.some(function (map) {
      return map.enabled;
    });
  }

  getMap(id) {
    return this.maps.find(function (item) {
      return item.id === id;
    });
  }

  getHotspot(id) {
    return this.hotspots.find(function (item) {
      return item.id === id;
    });
  }

  get achievements() {
    return this.data.achievements || [];
  }

  getProp(id) {
    return this.propConfigs.find(function (item) {
      return item.id === id;
    });
  }

  getFurniture(id) {
    return this.furnitureConfigs.find(function (item) {
      return item.id === id;
    });
  }
}
