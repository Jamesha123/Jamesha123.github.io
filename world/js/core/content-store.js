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
