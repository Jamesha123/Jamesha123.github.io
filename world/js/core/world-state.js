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
    this.propColliders = [];
    this.furnitureSprites = [];
    this.showHitboxes = false;
  }

  enterMap(mapId) {
    this.mapId = mapId;
    if (this.avatarEntity) {
      this.avatarEntity.resetToDefaultFacing();
    }
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
    this.propColliders = [];
    this.furnitureSprites = [];
  }
}
