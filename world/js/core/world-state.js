export class WorldState {
  constructor() {
    this.tileSize = 32;
    this.mapWidth = 20;
    this.mapHeight = 15;
    this.useTiled = false;
    this.mapId = null;
    this.collisionLayer = null;
    this.runtimeHotspots = [];
    this.transitions = [];
    this.propInteractions = [];
    this.avatarNpc = null;
    this.avatarEntity = null;
    this.portraitHitboxes = [];
    this.portraitEntities = [];
    this.propColliders = [];
    this.furnitureSprites = [];
    this.propLabels = [];
  }

  enterMap(mapId) {
    this.mapId = mapId;
    if (this.avatarEntity) {
      this.avatarEntity.resetToDefaultFacing();
    }
    (this.portraitEntities || []).forEach(function (entry) {
      if (entry.entity) {
        entry.entity.resetToDefaultFacing();
      }
    });
  }

  leaveMap() {
    this.mapId = null;
  }

  resetRuntime() {
    this.collisionLayer = null;
    this.runtimeHotspots = [];
    this.transitions = [];
    this.propInteractions = [];
    this.avatarNpc = null;
    this.avatarEntity = null;
    this.portraitHitboxes = [];
    this.portraitEntities = [];
    this.propColliders = [];
    this.furnitureSprites = [];
    this.propLabels = [];
  }
}
