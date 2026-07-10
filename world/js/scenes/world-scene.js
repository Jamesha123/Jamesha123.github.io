import { ContentStore } from "../core/content-store.js";
import { WorldState } from "../core/world-state.js";
import { GameUI } from "../ui/game-ui.js";
import { HotspotSystem } from "../systems/hotspot-system.js";
import { MapTransitionSystem } from "../systems/map-transition-system.js";
import { MapPropSystem } from "../systems/map-prop-system.js";
import { CharacterAnimation } from "../systems/character-animation.js";
import { Player } from "../entities/player.js";
import { TiledWorldBuilder } from "../world/tiled-world-builder.js";
import { FallbackWorldBuilder } from "../world/fallback-world-builder.js";
import { cacheBust, showFatalError, hideLoading } from "../utils/helpers.js";
import { DebugGraphics } from "../systems/debug-graphics.js";

export default class WorldScene extends Phaser.Scene {
  constructor(contentStore) {
    super({ key: "WorldScene" });
    this.content = contentStore;
    this.world = new WorldState();
    this.ui = new GameUI();
    this.hotspots = new HotspotSystem(this.content, this.world);
    this.mapTransitions = null;
    this.player = null;
    this.cursors = null;
    this.keys = null;
    this.activeMapId = contentStore.startMapId;
    this.spawnId = null;
    this.returnState = null;
    this.inputReady = false;
  }

  init(data) {
    this.activeMapId = (data && data.mapId) || this.content.startMapId;
    this.spawnId = (data && data.spawnId) || null;
    this.returnState = (data && data.returnState) || null;
  }

  preload() {
    this.world.useTiled = this.content.useTiled;
    const bust = "?v=" + Date.now();
    const assetsReady = this.registry.get("worldAssetsReady") === true;

    if (!assetsReady && this.content.playerConfig) {
      const playerSprites = this.content.playerConfig;
      CharacterAnimation.preloadWalkFrames(
        this.load,
        "player",
        playerSprites.folder,
        playerSprites.walk
      );
    }

    if (!assetsReady) {
      this.content.npcConfigs.forEach(function (npc) {
        CharacterAnimation.preloadWalkFrames(this.load, "npc-" + npc.id, npc.folder, npc.walk);
      }, this);

      const avatar = this.content.avatarConfig;
      if (avatar) {
        this.load.spritesheet(avatar.id + "-sheet", cacheBust(avatar.spritesheet), {
          frameWidth: avatar.frameWidth,
          frameHeight: avatar.frameHeight,
        });
      }
    }

    if (this.world.useTiled) {
      const loadedTilesets = new Set();
      const loadedFurniture = new Set();
      const needsFurniture = this.content.maps.some(function (mapConfig) {
        if (!mapConfig.enabled) {
          return false;
        }
        if (mapConfig.furnitureLayers && mapConfig.furnitureLayers.length) {
          return true;
        }
        return !!mapConfig.furnitureLayer;
      });

      this.content.maps.forEach(function (mapConfig) {
        if (!mapConfig.enabled) {
          return;
        }
        const mapKey = "map-" + mapConfig.id;
        if (this.cache.tilemap.exists(mapKey)) {
          this.cache.tilemap.remove(mapKey);
        }
        this.load.tilemapTiledJSON(mapKey, mapConfig.file + bust);

        if (!assetsReady && !loadedTilesets.has(mapConfig.tilesetImage)) {
          loadedTilesets.add(mapConfig.tilesetImage);
          this.load.image("tileset-" + mapConfig.tilesetName, mapConfig.tilesetImage + bust);
        }

        if (!assetsReady && needsFurniture) {
          TiledWorldBuilder.FURNITURE_IMAGES.forEach(function (path, index) {
            const key = "furniture-" + index;
            if (loadedFurniture.has(key)) {
              return;
            }
            loadedFurniture.add(key);
            this.load.image(key, path + bust);
          }, this);
        }
      }, this);
    }

    if (!assetsReady) {
      MapPropSystem.preload(this, this.content.propConfigs);
    }
  }

  create() {
    try {
      this.world.resetRuntime();
      DebugGraphics.setShowHitboxes(this.content.showHitboxes === true);
      this.ui.bindScene(this);
      this.mapTransitions = new MapTransitionSystem(this, this.content, this.world);
      this.ui.onInteract = () => this.handleInteract();

      if (this.content.playerConfig) {
        const walkFrameRate = this.content.playerConfig.walkFrameRate || 8;
        CharacterAnimation.createWalkAnimations(
          this,
          "player",
          this.content.playerConfig.walk,
          walkFrameRate
        );
      }

      this.textures.each(function (texture) {
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      });

      if (this.world.useTiled) {
        this.content.maps.forEach(function (mapConfig) {
          const tileTexture = this.textures.get("tileset-" + mapConfig.tilesetName);
          if (!tileTexture) {
            return;
          }
          tileTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
          tileTexture.source.forEach(function (source) {
            source.setFilter(Phaser.Textures.FilterMode.NEAREST);
          });
        }, this);
      }

      this.player = new Player(this, this.content.playerConfig || {});

      if (this.world.useTiled) {
        const mapConfig = this.content.getMap(this.activeMapId);
        if (!mapConfig) {
          throw new Error('Missing map config for "' + this.activeMapId + '".');
        }
        TiledWorldBuilder.build(
          this,
          this.content,
          this.world,
          this.hotspots,
          this.player,
          mapConfig,
          this.mapTransitions,
          {
            spawnId: this.spawnId,
            returnState: this.returnState,
          }
        );
      } else {
        FallbackWorldBuilder.build(this, this.content, this.world, this.hotspots, this.player);
      }

      this.player.clearTouchTarget();
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys("W,S,A,D");

      if (!this.inputReady) {
        this.input.keyboard.on("keydown-E", () => this.handleInteract());
        this.input.keyboard.on("keydown-ENTER", () => this.handleInteract());
        this.input.keyboard.on("keydown-H", () => {
          DebugGraphics.setShowHitboxes(!DebugGraphics.showHitboxes);
          this.world.showHitboxes = DebugGraphics.showHitboxes;
        });

        this.input.on("pointerdown", (pointer) => {
          if (this.ui.isModalOpen() || pointer.y < 70) {
            return;
          }
          this.player.setTouchTarget(pointer.worldX, pointer.worldY);
        });

        this.input.on("pointermove", (pointer) => {
          if (pointer.isDown && this.player.touchTarget && !this.ui.isModalOpen() && pointer.y >= 70) {
            this.player.setTouchTarget(pointer.worldX, pointer.worldY);
          }
        });

        this.input.on("pointerup", () => {
          this.player.clearTouchTarget();
        });

        this.inputReady = true;
      }

      this.ui.setHint("WASD / arrows to move - tap to walk on mobile", true);
      this.world.enterMap(this.activeMapId);
      this.events.once("shutdown", () => this.world.leaveMap());
      this.registry.set("worldAssetsReady", true);
      hideLoading();
    } catch (error) {
      console.error(error);
      showFatalError("Map failed: " + error.message);
    }
  }

  handleInteract() {
    if (this.ui.isModalOpen()) {
      return;
    }
    if (this.mapTransitions.tryTransition()) {
      return;
    }
    this.hotspots.tryInteract(this.ui);
  }

  update(_time, delta) {
    if (!this.player || !this.cursors) {
      return;
    }

    if (this.ui.isModalOpen()) {
      this.player.stop();
    } else {
      this.player.update(
        { cursors: this.cursors, keys: this.keys },
        this.world,
        delta
      );
    }

    const avatarEntity = this.world.avatarEntity;
    if (avatarEntity) {
      const avatarHotspotId = this.hotspots.getAvatarHotspotId();
      const interactingWithJames =
        this.ui.isModalOpen() &&
        avatarHotspotId &&
        this.ui.activeHotspot &&
        this.ui.activeHotspot.id === avatarHotspotId;

      if (interactingWithJames) {
        avatarEntity.updateFacing(this.player);
      }
    }

    this.mapTransitions.checkProximity(this.player.sprite, this.ui);
    if (!this.mapTransitions.nearbyTarget) {
      this.hotspots.checkProximity(this.player.sprite, this.ui);
    }
  }
}

export function createPhaserGame(contentStore) {
  if (typeof Phaser === "undefined") {
    throw new Error("Phaser failed to load. Check your internet connection and refresh.");
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game-container",
    width: width,
    height: height,
    backgroundColor: "#1a1a2e",
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      autoRound: true,
    },
    render: {
      pixelArt: true,
      antialias: false,
      roundPixels: true,
    },
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scene: new WorldScene(contentStore),
  });

  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) {
      return;
    }

    const scene = game.scene.getScene("WorldScene");
    if (scene && scene.world) {
      scene.world.enterMap(scene.activeMapId || contentStore.startMapId);
    }
  });

  return game;
}
