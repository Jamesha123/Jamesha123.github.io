import { getObjectProperty, getObjectFeetPosition, getObjectRectHitbox } from "../utils/helpers.js";
import { isFullscreenActive } from "../utils/fullscreen.js";
import { isMobileDevice } from "../utils/device.js";

import { CharacterAnimation } from "../systems/character-animation.js";

import { MapPropSystem } from "../systems/map-prop-system.js";

import { FurnitureSystem } from "../systems/furniture-system.js";

import { AvatarNpc } from "../entities/avatar-npc.js";



export class TiledWorldBuilder {

  // Tile layers use 0 (ground), 1 (decor), 2 (walls). Furniture `depth` in Tiled is
  // a relative layer on top of this base so 0 draws behind 2, etc.
  static FURNITURE_DEPTH_BASE = 3;

  static build(scene, content, world, hotspots, player, mapConfig, mapTransitions, spawnOptions) {

    const mapKey = "map-" + mapConfig.id;

    const tilesetKey = "tileset-" + mapConfig.tilesetName;

    const map = scene.make.tilemap({ key: mapKey });

    if (!map) {

      throw new Error("Could not parse tilemap JSON for " + mapConfig.id + ".");

    }



    const tileMargin = mapConfig.tileMargin != null ? mapConfig.tileMargin : 0;

    const tileSpacing = mapConfig.tileSpacing != null ? mapConfig.tileSpacing : 0;

    const mapTilesets = TiledWorldBuilder.addMapTilesets(

      map,

      mapConfig,

      tilesetKey,

      tileMargin,

      tileSpacing

    );

    if (mapTilesets.length === 0) {

      throw new Error(

        'Tileset "' + mapConfig.tilesetName + '" not found. Re-export with: python world/scripts/export-map.py'

      );

    }



    world.tileSize = map.tileWidth;

    world.mapWidth = map.width;

    world.mapHeight = map.height;

    world.mapId = mapConfig.id;

    world.mapConfig = mapConfig;

    const groundLayer = map.createLayer(mapConfig.groundLayer, mapTilesets, 0, 0);

    if (!groundLayer) {

      throw new Error('Missing layer "' + mapConfig.groundLayer + '" in map JSON.');

    }

    groundLayer.setDepth(0);

    TiledWorldBuilder.configureTileLayer(groundLayer);



    if (mapConfig.decorLayer) {

      const decorLayer = map.createLayer(mapConfig.decorLayer, mapTilesets, 0, 0);

      if (decorLayer) {

        decorLayer.setDepth(1);

        TiledWorldBuilder.configureTileLayer(decorLayer);

      }

    }



    const wallsLayer = map.createLayer(mapConfig.wallsLayer, mapTilesets, 0, 0);

    if (wallsLayer) {

      wallsLayer.setDepth(2);

      TiledWorldBuilder.configureTileLayer(wallsLayer);

      wallsLayer.setCollisionByProperty({ collides: true });

      world.collisionLayer = wallsLayer;

    }



    TiledWorldBuilder.spawnFurniture(scene, world, map, mapConfig, mapKey, content);



    world.runtimeHotspots = [];

    if (mapConfig.hotspotsLayer) {

      const hotspotLayer = map.getObjectLayer(mapConfig.hotspotsLayer);

      if (hotspotLayer) {

        hotspotLayer.objects.forEach(function (obj) {

          const hotspotIdValue = getObjectProperty(obj, "hotspotId");

          if (!hotspotIdValue) {

            return;

          }



          const hotspotContent = content.getHotspot(hotspotIdValue);

          if (!hotspotContent) {

            console.warn("Missing content.json entry for hotspot:", hotspotIdValue);

            return;

          }



          const position = getObjectFeetPosition(obj, world.tileSize);
          const runtimeHotspot = Object.assign({}, hotspotContent, position);
          const reachTiles = getObjectProperty(obj, "reach");
          if (reachTiles != null && reachTiles !== "") {
            runtimeHotspot.reach = world.tileSize * Number(reachTiles);
          }

          const hitboxShape = getObjectProperty(obj, "hitboxShape");
          const usesRectHitbox =
            hitboxShape === "rect" ||
            hotspotIdValue === "book-recommender" ||
            hotspotIdValue === "games" ||
            hotspotIdValue === "todo-lists";
          if (usesRectHitbox) {
            runtimeHotspot.hitboxRect = getObjectRectHitbox(obj, world.tileSize);
          }

          hotspots.registerRuntimeHotspot(runtimeHotspot);

        });

      }

    }



    world.runtimeHotspots = hotspots.filterAvatarHotspot(world.runtimeHotspots);

    if (mapConfig.features && mapConfig.features.hotspotMarkers !== false && mapConfig.hotspotsLayer) {

      hotspots.addMarkers(scene);

    }



    if (mapConfig.propsLayer) {

      MapPropSystem.spawnFromMap(scene, content, world, map, mapConfig, mapTransitions);

    }



    TiledWorldBuilder.spawnTransitions(scene, world, map, mapConfig, mapTransitions);

    TiledWorldBuilder.spawnMapNpcs(scene, content, world, hotspots);



    const features = mapConfig.features || {};

    if (features.avatar !== false && content.avatarConfig) {

      new AvatarNpc(scene, content, world, hotspots).spawn();

    }



    const spawnPos = TiledWorldBuilder.resolveSpawn(

      map,

      mapConfig,

      world,

      spawnOptions && spawnOptions.spawnId,

      spawnOptions && spawnOptions.returnState

    );



    player.create(spawnPos.x, spawnPos.y);

    player.setupColliders(world.collisionLayer, world.avatarNpc, world.propColliders);

    TiledWorldBuilder.setupCamera(scene, world, player.sprite);

  }



  static addMapTilesets(map, mapConfig, tilesetKey, tileMargin, tileSpacing) {

    const tilesets = [];

    map.tilesets.forEach(function (tiledTileset) {

      const name = tiledTileset.name;

      if (name === mapConfig.tilesetName) {

        const tileset = map.addTilesetImage(

          name,

          tilesetKey,

          map.tileWidth,

          map.tileHeight,

          tileMargin,

          tileSpacing

        );

        if (tileset) {

          tilesets.push(tileset);

        }

        return;

      }

      if (name === "interactive") {

        return;

      }

      const tileset = map.addTilesetImage(name);

      if (tileset) {

        tilesets.push(tileset);

      }

    });

    return tilesets;

  }



  static getInteractiveFirstGid(scene, mapKey) {

    const cached = scene.cache.tilemap.get(mapKey);

    const tilesets = cached && cached.data && cached.data.tilesets;

    if (tilesets) {

      const interactive = tilesets.find(function (tileset) {

        return tileset.name === "interactive";

      });

      if (interactive) {

        return interactive.firstgid;

      }

    }

    return 133;

  }



  static getTiledTileFlips(obj) {

    return {

      flipX: obj.flippedHorizontal === true || !!(obj.gid & 0x80000000),

      flipY: obj.flippedVertical === true || !!(obj.gid & 0x40000000),

    };

  }



  static readPlacementNumber(obj, propertyName, fallback) {
    const value = getObjectProperty(obj, propertyName);
    if (value === null || value === undefined || value === "") {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  static getPlacementOffset(obj, furnitureDef, width, height) {
    const def = furnitureDef || {};
    const ratioX = TiledWorldBuilder.readPlacementNumber(
      obj,
      "offsetXRatio",
      def.offsetXRatio != null ? def.offsetXRatio : def.offsetX != null ? def.offsetX : 0
    );
    const ratioY = TiledWorldBuilder.readPlacementNumber(
      obj,
      "offsetYRatio",
      def.offsetYRatio != null ? def.offsetYRatio : def.offsetY != null ? def.offsetY : 0
    );
    const pixelX = TiledWorldBuilder.readPlacementNumber(obj, "offsetX", 0);
    const pixelY = TiledWorldBuilder.readPlacementNumber(obj, "offsetY", 0);

    return {
      offsetX: pixelX + width * ratioX,
      offsetY: pixelY + height * ratioY,
    };
  }

  static applyTiledTileObjectPlacement(sprite, obj, furnitureDef) {
    const flips = TiledWorldBuilder.getTiledTileFlips(obj);
    const width = obj.width || sprite.width;
    const height = obj.height || sprite.height;
    const offset = TiledWorldBuilder.getPlacementOffset(obj, furnitureDef, width, height);

    if (obj.width && obj.height) {
      sprite.setDisplaySize(obj.width, obj.height);
    }

    sprite.setOrigin(flips.flipX ? 1 : 0, flips.flipY ? 0 : 1);
    sprite.setPosition(
      obj.x + (flips.flipX ? width : 0) + offset.offsetX,
      obj.y - (flips.flipY ? height : 0) + offset.offsetY
    );

    if (flips.flipX) {
      sprite.setFlipX(true);
    }

    if (flips.flipY) {
      sprite.setFlipY(true);
    }

    if (obj.rotation) {
      sprite.setAngle(obj.rotation);
    }
  }



  static spawnFurniture(scene, world, map, mapConfig, mapKey, content) {

    const layerNames = mapConfig.furnitureLayers || (mapConfig.furnitureLayer ? [mapConfig.furnitureLayer] : []);

    if (layerNames.length === 0) {

      return;

    }

    const firstGid = TiledWorldBuilder.getInteractiveFirstGid(scene, mapKey);

    const sprites = [];

    const defaultFurnitureDef = {

      bodyWidthRatio: 0.75,

      bodyHeightRatio: 0.35,

      hitboxLiftRatio: 0.12,

    };

    let stackIndex = 0;

    layerNames.forEach(function (layerName) {

      const objectLayer = map.getObjectLayer(layerName);

      if (!objectLayer) {

        return;

      }

      objectLayer.objects.forEach(function (obj) {

        if (!obj.gid) {

          return;

        }

        stackIndex += 1;

        const localId = (obj.gid & 0x1fffffff) - firstGid;

        if (localId < 0 || localId >= TiledWorldBuilder.FURNITURE_IMAGES.length) {

          return;

        }

        const textureKey = "furniture-" + localId;

        if (!scene.textures.exists(textureKey)) {

          console.warn("Missing furniture texture:", textureKey, obj.name);

          return;

        }

        const furnitureDef = content.getFurniture(obj.name) || defaultFurnitureDef;

        const sprite = scene.add.image(obj.x, obj.y, textureKey);

        TiledWorldBuilder.applyTiledTileObjectPlacement(sprite, obj, furnitureDef);

        const depthValue = getObjectProperty(obj, "depth");
        let depth;

        if (depthValue !== null && depthValue !== "" && !Number.isNaN(Number(depthValue))) {
          depth = TiledWorldBuilder.FURNITURE_DEPTH_BASE + Number(depthValue);
        } else {
          depth = TiledWorldBuilder.FURNITURE_DEPTH_BASE + stackIndex * 0.01;
        }

        // Tiny tie-breaker when multiple objects share the same depth value.
        depth += stackIndex * 0.00001;

        sprite.setDepth(depth);

        FurnitureSystem.spawnHitbox(scene, world, obj, furnitureDef);

        sprites.push(sprite);

      });

    });

    world.furnitureSprites = sprites;

  }



  static spawnTransitions(scene, world, map, mapConfig, mapTransitions) {

    if (!mapConfig.transitionsLayer || !mapTransitions) {

      return;

    }



    const layer = map.getObjectLayer(mapConfig.transitionsLayer);

    if (!layer) {

      return;

    }



    layer.objects.forEach(function (obj) {

      const targetMap = getObjectProperty(obj, "targetMap");

      if (!targetMap) {

        return;

      }



      const width = obj.width || world.tileSize;

      const height = obj.height || world.tileSize;

      mapTransitions.registerTransition({

        x: obj.x + width / 2,

        y: obj.y + height / 2,

        width: width,

        height: height,

        targetMap: targetMap,

        spawnId: getObjectProperty(obj, "spawnId") || "default",

        label: getObjectProperty(obj, "label") || "Exit",

        showOutline: getObjectProperty(obj, "showOutline") !== false,

        returnState: {

          mapId: mapConfig.id,

          spawnId: getObjectProperty(obj, "returnSpawnId") || "default",

        },

      });

    });

  }



  static resolveSpawn(map, mapConfig, world, spawnId, returnState) {

    if (returnState && returnState.mapId === mapConfig.id && returnState.spawnId) {

      const returnSpawn = TiledWorldBuilder.findSpawnObject(map, mapConfig, returnState.spawnId);

      if (returnSpawn) {

        return getObjectFeetPosition(returnSpawn, world.tileSize);

      }

    }



    if (spawnId) {

      const namedSpawn = TiledWorldBuilder.findSpawnObject(map, mapConfig, spawnId);

      if (namedSpawn) {

        return getObjectFeetPosition(namedSpawn, world.tileSize);

      }

    }



    const spawnLayer = map.getObjectLayer(mapConfig.spawnLayer);

    if (spawnLayer && spawnLayer.objects.length > 0) {

      const defaultSpawn =

        TiledWorldBuilder.findSpawnObject(map, mapConfig, "default") || spawnLayer.objects[0];

      return getObjectFeetPosition(defaultSpawn, world.tileSize);

    }



    return {

      x: world.mapWidth * world.tileSize * 0.5,

      y: world.mapHeight * world.tileSize * 0.5,

    };

  }



  static findSpawnObject(map, mapConfig, spawnId) {

    const spawnLayer = map.getObjectLayer(mapConfig.spawnLayer);

    if (!spawnLayer) {

      return null;

    }



    return (

      spawnLayer.objects.find(function (obj) {

        return getObjectProperty(obj, "spawnId") === spawnId;

      }) || null

    );

  }



  static spawnMapNpcs(scene, content, world, hotspots) {

    content.npcConfigs.forEach(function (npc) {

      const hotspot = world.runtimeHotspots.find(function (item) {

        return item.id === npc.hotspotId;

      });

      if (!hotspot) {

        return;

      }



      const prefix = "npc-" + npc.id;

      CharacterAnimation.createWalkAnimations(

        scene,

        prefix,

        npc.walk,

        npc.walkFrameRate || 6

      );

      const idleDirection = npc.idleDirection || "down";

      const npcSprite = scene.add.sprite(

        hotspot.x,

        hotspot.y,

        CharacterAnimation.getIdleFrameKey(prefix, idleDirection)

      );

      npcSprite.setOrigin(0.5, 1);

      npcSprite.setDepth(8);

      CharacterAnimation.applyIdlePose(npcSprite, prefix, idleDirection);

    });

  }



  static configureTileLayer(layer) {
    layer.setPosition(0, 0);
    layer.setCullPadding(1);
  }



  static setupCamera(scene, world, playerSprite) {

    const camera = scene.cameras.main;



    scene.physics.world.setBounds(

      0,

      0,

      world.mapWidth * world.tileSize,

      world.mapHeight * world.tileSize

    );



    camera.setRoundPixels(true);

    const cameraSettings = TiledWorldBuilder.getCameraSettings(world.mapConfig);
    const mapPixelW = world.mapWidth * world.tileSize;
    const mapPixelH = world.mapHeight * world.tileSize;

    camera.setBounds(0, 0, mapPixelW, mapPixelH);

    scene._cameraFollowTarget = playerSprite;

    if (!cameraSettings.fillViewport || isMobileDevice()) {
      camera.startFollow(playerSprite, true, 1, 1);
    }

    TiledWorldBuilder.applyCameraZoom(scene, world);

    if (!scene._cameraResizeBound) {
      scene._cameraResizeBound = true;

      scene.scale.on("resize", function () {
        TiledWorldBuilder.applyCameraZoom(scene, world);
      });

      window.addEventListener("orientationchange", function () {
        window.setTimeout(function () {
          TiledWorldBuilder.applyCameraZoom(scene, world);
        }, 150);
      });

      window.addEventListener("world-viewport-change", function () {
        TiledWorldBuilder.applyCameraZoom(scene, world);
      });
    }



    TiledWorldBuilder.setupPixelPerfectFollow(camera);

  }



  static getCameraSettings(mapConfig) {
    const camera = (mapConfig && mapConfig.camera) || {};
    const fillViewport = !!(mapConfig && (camera.mode === "fill" || mapConfig.fillViewport));

    return {
      fillViewport: fillViewport,
      fillFit: camera.fit === "contain" ? "contain" : "cover",
      fullscreenFit: camera.fullscreenFit === "cover" ? "cover" : "contain",
      letterboxColor: camera.letterboxColor || null,
      visibleTilesY: camera.visibleTilesY != null ? camera.visibleTilesY : 15,
      mobilePortraitTilesY: camera.mobilePortraitTilesY != null ? camera.mobilePortraitTilesY : 11,
      mobileLandscapeTilesY: camera.mobileLandscapeTilesY != null ? camera.mobileLandscapeTilesY : 9,
      mobilePortraitFillScale: camera.mobilePortraitFillScale != null ? camera.mobilePortraitFillScale : 0.92,
      mobileLandscapeFillScale: camera.mobileLandscapeFillScale != null ? camera.mobileLandscapeFillScale : 1.05,
      maxZoom: camera.maxZoom != null ? camera.maxZoom : 4,
    };
  }

  static resolveFillFit(cameraSettings) {
    if (isMobileDevice()) {
      return "cover";
    }

    if (isFullscreenActive()) {
      return cameraSettings.fullscreenFit;
    }

    return cameraSettings.fillFit;
  }

  static applyFillCameraBackground(camera, cameraSettings) {
    if (cameraSettings.letterboxColor) {
      camera.setBackgroundColor(
        Phaser.Display.Color.HexStringToColor(cameraSettings.letterboxColor).color
      );
      return;
    }

    camera.setBackgroundColor(0x1a1a2e);
  }

  static applyFillCameraFollow(scene, camera, mapW, mapH) {
    const playerSprite = scene._cameraFollowTarget;

    if ((isFullscreenActive() || isMobileDevice()) && playerSprite) {
      if (camera.followTarget !== playerSprite) {
        camera.startFollow(playerSprite, true, 1, 1);
      }
      return;
    }

    if (camera.followTarget) {
      camera.stopFollow();
    }

    camera.centerOn(mapW * 0.5, mapH * 0.5);
  }

  static applyCameraZoom(scene, world) {
    const camera = scene.cameras.main;

    if (!camera || !world.tileSize) {
      return;
    }

    const viewportWidth = scene.scale.gameSize.width;
    const viewportHeight = scene.scale.gameSize.height;
    const mapConfig = world.mapConfig;
    const cameraSettings = TiledWorldBuilder.getCameraSettings(mapConfig);
    const isMobile = isMobileDevice();
    const isPortrait = viewportHeight > viewportWidth;

    if (cameraSettings.fillViewport) {
      const mapW = world.mapWidth * world.tileSize;
      const mapH = world.mapHeight * world.tileSize;

      const zoomW = viewportWidth / mapW;
      const zoomH = viewportHeight / mapH;
      const fillFit = TiledWorldBuilder.resolveFillFit(cameraSettings);
      const zoom = fillFit === "contain" ? Math.min(zoomW, zoomH) : Math.max(zoomW, zoomH);

      TiledWorldBuilder.applyFillCameraBackground(camera, cameraSettings);
      camera.setZoom(zoom);
      TiledWorldBuilder.applyFillCameraFollow(scene, camera, mapW, mapH);
      return;
    }

    let visibleTilesY = cameraSettings.visibleTilesY;
    if (isMobile) {
      visibleTilesY = isPortrait
        ? cameraSettings.mobilePortraitTilesY
        : cameraSettings.mobileLandscapeTilesY;
    }

    const visibleTilesX = visibleTilesY * (viewportWidth / viewportHeight);
    const zoom = Math.min(
      viewportWidth / (visibleTilesX * world.tileSize),
      viewportHeight / (visibleTilesY * world.tileSize)
    );

    camera.setZoom(Phaser.Math.Clamp(zoom, 1, cameraSettings.maxZoom));
  }



  static setupPixelPerfectFollow(camera) {
    let lastScrollX = null;
    let lastScrollY = null;

    camera.on(Phaser.Cameras.Scene2D.Events.PRE_RENDER, function () {
      if (lastScrollX === camera.scrollX && lastScrollY === camera.scrollY) {
        return;
      }
      TiledWorldBuilder.snapCameraToPixels(camera);
      lastScrollX = camera.scrollX;
      lastScrollY = camera.scrollY;
    });
  }



  static snapCameraToPixels(camera) {

    if (!camera) {

      return;

    }



    const zoom = camera.zoom;

    camera.scrollX = Math.round(camera.scrollX * zoom) / zoom;

    camera.scrollY = Math.round(camera.scrollY * zoom) / zoom;

  }

}

TiledWorldBuilder.FURNITURE_IMAGES = [
  "assets/monkeyboy-source/Tiles_Interactive/kitchen.png",
  "assets/monkeyboy-source/Tiles_Interactive/bookshelf.png",
  "assets/monkeyboy-source/Tiles_Interactive/couch.png",
  "assets/monkeyboy-source/Tiles_Interactive/dinningTable.png",
  "assets/monkeyboy-source/Tiles_Interactive/drawer.png",
  "assets/monkeyboy-source/Tiles_Interactive/indoor1.png",
  "assets/monkeyboy-source/Tiles_Interactive/indoor8.png",
  "assets/monkeyboy-source/Tiles_Interactive/indoor9.png",
  "assets/monkeyboy-source/Tiles_Interactive/indoor10.png",
  "assets/monkeyboy-source/Tiles_Interactive/indoor11.png",
  "assets/monkeyboy-source/Tiles_Interactive/chair1.png",
  "assets/monkeyboy-source/Tiles_Interactive/chair2.png",
  "assets/monkeyboy-source/Tiles_Interactive/computerDesk.png",
  "assets/monkeyboy-source/Tiles_Interactive/stickyNote.png",
];
