import { ContentStore } from "../core/content-store.js?v=114";
import { WorldState } from "../core/world-state.js?v=114";
import { GameUI } from "../ui/game-ui.js?v=119";
import { HotspotSystem } from "../systems/hotspot-system.js?v=114";
import { MapTransitionSystem } from "../systems/map-transition-system.js?v=114";
import { MapPropSystem } from "../systems/map-prop-system.js?v=114";
import { CharacterAnimation } from "../systems/character-animation.js?v=114";
import { Player } from "../entities/player.js?v=114";
import { TiledWorldBuilder } from "../map/tiled-world-builder.js?v=114";
import { FallbackWorldBuilder } from "../map/fallback-world-builder.js?v=114";
import { cacheBust, showFatalError } from "../utils/helpers.js?v=122";
import { setBootProgress, setBootStageProgress, finishBoot } from "../ui/boot-progress.js?v=127";
import { showTitleScreen, isGameStarted } from "../ui/title-screen.js?v=127";
import { DebugGraphics } from "../systems/debug-graphics.js?v=114";
import { isMobileDevice, isMobileLandscape } from "../utils/device.js?v=114";
import { getMobileJoystick } from "../ui/mobile-controls.js?v=114";
import { preloadWorldLabelFont } from "../ui/world-label.js?v=114";
import { ASSET_VERSION } from "../version.js?v=114";

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
    this.mobileControls = isMobileDevice();
    this.activeMapId = contentStore.startMapId;
    this.spawnId = null;
    this.returnState = null;
  }

  init(data) {
    this.activeMapId = (data && data.mapId) || this.content.startMapId;
    this.spawnId = (data && data.spawnId) || null;
    this.returnState = (data && data.returnState) || null;
    this.fadeIn = !!(data && data.fadeIn);
  }

  preload() {
    this.world.useTiled = this.content.useTiled;
    const assetsReady = this.registry.get("worldAssetsReady") === true;
    const initialMapOnly = !assetsReady;
    const activeMapId = this.activeMapId || this.content.startMapId;

    if (!assetsReady && !this._worldLoadProgressBound) {
      this._worldLoadProgressBound = true;
      this.load.on("progress", function (value) {
        setBootProgress(20 + value * 72, "Loading assets...");
      });
    }

    if (!this._worldLoadErrorsBound) {
      this._worldLoadErrorsBound = true;
      this.load.on("loaderror", function (file) {
        const src = file && (file.url || file.src) ? file.url || file.src : "unknown asset";
        showFatalError("Failed to load asset: " + src);
      });
    }

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
        if (!npc || typeof npc !== "object") {
          return;
        }

        if (npc.type === "portrait") {
          if (npc.spritesheet) {
            this.load.spritesheet(npc.id + "-sheet", cacheBust(npc.spritesheet), {
              frameWidth: npc.frameWidth,
              frameHeight: npc.frameHeight,
            });
          } else if (npc.folder) {
            const frameSet = {};
            [npc.idle, npc.walk].forEach(function (set) {
              if (!set || typeof set !== "object") {
                return;
              }
              Object.keys(set).forEach(function (direction) {
                const files = set[direction];
                if (!Array.isArray(files)) {
                  return;
                }
                frameSet[direction] = frameSet[direction] || [];
                files.forEach(function (file) {
                  if (frameSet[direction].indexOf(file) === -1) {
                    frameSet[direction].push(file);
                  }
                });
              });
            });

            if (Object.keys(frameSet).length) {
              CharacterAnimation.preloadWalkFrames(
                this.load,
                "portrait-" + npc.id,
                npc.folder,
                frameSet
              );
            }
          }
          return;
        }

        if (npc.folder && npc.walk) {
          CharacterAnimation.preloadWalkFrames(this.load, "npc-" + npc.id, npc.folder, npc.walk);
        }
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
        if (initialMapOnly && mapConfig.id !== activeMapId) {
          return;
        }
        const mapKey = "map-" + mapConfig.id;
        if (this.cache.tilemap.exists(mapKey)) {
          this.cache.tilemap.remove(mapKey);
        }
        this.load.tilemapTiledJSON(mapKey, cacheBust(mapConfig.file));

        if (!assetsReady && !loadedTilesets.has(mapConfig.tilesetImage)) {
          loadedTilesets.add(mapConfig.tilesetImage);
          this.load.image("tileset-" + mapConfig.tilesetName, cacheBust(mapConfig.tilesetImage));
        }

        if (needsFurniture) {
          TiledWorldBuilder.FURNITURE_IMAGES.forEach(function (path, index) {
            const key = "furniture-" + index;
            if (loadedFurniture.has(key)) {
              return;
            }
            loadedFurniture.add(key);
            if (this.textures.exists(key)) {
              this.textures.remove(key);
            }
            this.load.image(key, cacheBust(path));
          }, this);
        }
      }, this);
    }

    if (!assetsReady) {
      preloadWorldLabelFont(this.load, ASSET_VERSION);
      MapPropSystem.preload(this, this.content.propConfigs);
    }
  }

  create() {
    try {
      setBootStageProgress("world", 0, "Building world...");
      this.runBuildStep("reset runtime", () => {
        this.transitionOutlineGfx = null;
        this.debugOutlineGfx = null;
        this.world.resetRuntime();
        DebugGraphics.reset(this);
        this.hotspots.nearbyHotspot = null;
        this.ui.bindScene(this);
        this.ui.bindContent(this.content);
        this.mapTransitions = new MapTransitionSystem(this, this.content, this.world);
        this.ui.onInteract = () => this.handleInteract();
      });

      this.runBuildStep("player animations", () => {
        if (this.content.playerConfig) {
          const walkFrameRate = this.content.playerConfig.walkFrameRate || 8;
          CharacterAnimation.createWalkAnimations(
            this,
            "player",
            this.content.playerConfig.walk,
            walkFrameRate
          );
        }
      });

      this.runBuildStep("texture filters", () => {
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
            if (tileTexture.source) {
              tileTexture.source.forEach(function (source) {
                source.setFilter(Phaser.Textures.FilterMode.NEAREST);
              });
            }
          }, this);
        }
      });

      this.runBuildStep("player entity", () => {
        this.player = new Player(this, this.content.playerConfig || {});
      });

      this.runBuildStep("world map", () => {
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

        DebugGraphics.redraw(this);
        if (this.mapTransitions) {
          MapTransitionSystem.redrawOutlines(this, this.world);
        }
      });

      this.runBuildStep("input", () => {
        this.player.clearTouchTarget();
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys("W,S,A,D");

        if (this.mobileControls) {
          this.ui.setDefaultHint();
        } else {
          this.setupPointerInput();
          this.ui.setDefaultHint();
        }
      });

      this.world.enterMap(this.activeMapId);
      this.events.once("shutdown", () => this.world.leaveMap());
      this.registry.set("worldAssetsReady", true);

      if (!isGameStarted()) {
        finishBoot("Ready").then(() => {
          showTitleScreen(this);
        });
      } else if (this.fadeIn) {
        this.ui.fadeInFromMapTransition();
      } else {
        this.ui.resetMapFade();
      }

      window.dispatchEvent(new Event("world-ready"));
    } catch (error) {
      console.error(error);
      showFatalError("Map failed: " + error.message + (error.stack ? "\n" + error.stack : ""));
    }
  }

  runBuildStep(stepName, fn) {
    try {
      fn.call(this);
    } catch (error) {
      throw new Error("[" + stepName + "] " + error.message, { cause: error });
    }
  }

  setupPointerInput() {
    if (this.mobileControls) {
      return;
    }

    if (this._onPointerDown) {
      this.input.off("pointerdown", this._onPointerDown);
      this.input.off("pointermove", this._onPointerMove);
    }

    this._onPointerDown = (pointer) => {
      if (
        this.ui.isModalOpen() ||
        this.ui.isMapFading() ||
        !this.player ||
        pointer.button > 0 ||
        this.isPointerOnUi(pointer)
      ) {
        return;
      }
      this.player.setTouchTarget(pointer.worldX, pointer.worldY);
    };

    this._onPointerMove = (pointer) => {
      if (
        !pointer.isDown ||
        this.ui.isModalOpen() ||
        this.ui.isMapFading() ||
        !this.player ||
        this.isPointerOnUi(pointer)
      ) {
        return;
      }
      this.player.setTouchTarget(pointer.worldX, pointer.worldY);
    };

    this.input.on("pointerdown", this._onPointerDown);
    this.input.on("pointermove", this._onPointerMove);
  }

  handleInteract() {
    if (this.ui.isModalOpen() || this.ui.isMapFading() || !this.player || !this.player.sprite) {
      return;
    }

    const player = this.player.sprite;

    if (this.hotspots.findNearbyHotspot(player)) {
      this.hotspots.tryInteract(this.ui, player);
      return;
    }

    this.mapTransitions.tryTransition();
  }

  isPointerOnUi(pointer) {
    const bottomHud = document.getElementById("bottom-hud");
    if (bottomHud) {
      const hudBounds = bottomHud.getBoundingClientRect();
      if (
        pointer.x >= hudBounds.left &&
        pointer.x <= hudBounds.right &&
        pointer.y >= hudBounds.top &&
        pointer.y <= hudBounds.bottom
      ) {
        return true;
      }
    }

    const joystick = document.getElementById("virtual-joystick");
    if (joystick && !joystick.hidden) {
      const joyBounds = joystick.getBoundingClientRect();
      if (
        pointer.x >= joyBounds.left &&
        pointer.x <= joyBounds.right &&
        pointer.y >= joyBounds.top &&
        pointer.y <= joyBounds.bottom
      ) {
        return true;
      }
    }

    const topBar = document.querySelector(".top-bar");
    if (!topBar) {
      return pointer.y < 70;
    }
    const bounds = topBar.getBoundingClientRect();
    return pointer.x >= bounds.left && pointer.x <= bounds.right && pointer.y >= bounds.top && pointer.y <= bounds.bottom;
  }

  update(_time, delta) {
    if (!this.player) {
      return;
    }

    const mobileJoystick = this.mobileControls ? getMobileJoystick() : null;

    if (!this.cursors && !mobileJoystick) {
      return;
    }

    if (this.ui.isModalOpen() || this.ui.isMapFading() || isMobileLandscape()) {
      this.player.stop();
    } else {
      const joystickVector =
        mobileJoystick && typeof mobileJoystick.getVector === "function"
          ? mobileJoystick.getVector()
          : null;

      this.player.update(
        {
          cursors: this.cursors,
          keys: this.keys,
          joystick: joystickVector,
        },
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

    (this.world.portraitEntities || []).forEach((entry) => {
      if (
        this.ui.isModalOpen() &&
        entry.hotspotId &&
        this.ui.activeHotspot &&
        this.ui.activeHotspot.id === entry.hotspotId &&
        entry.entity
      ) {
        entry.entity.updateFacing(this.player);
      }
    });

    this.mapTransitions.checkProximity(this.player.sprite, this.ui);
    this.hotspots.checkProximity(this.player.sprite, this.ui, {
      suppressHint: !!this.mapTransitions.nearbyTarget,
      transitionHintActive: !!this.mapTransitions.nearbyTarget,
    });
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
      autoCenter: Phaser.Scale.NO_CENTER,
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

  if (game.canvas) {
    game.canvas.setAttribute("tabindex", "0");
  }

  window.__phaserGame = game;

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
