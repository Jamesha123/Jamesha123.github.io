export class ContentStore {
  constructor(data) {
    this.data = data;
  }

  get startMapId() {
    return this.data.startMap || this.maps[0]?.id || "default";
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
}
