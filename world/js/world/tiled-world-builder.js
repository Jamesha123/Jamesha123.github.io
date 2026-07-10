import { getObjectProperty, getObjectFeetPosition } from "../utils/helpers.js";

import { CharacterAnimation } from "../systems/character-animation.js";

import { MapPropSystem } from "../systems/map-prop-system.js";

import { AvatarNpc } from "../entities/avatar-npc.js";



export class TiledWorldBuilder {

  static build(scene, content, world, hotspots, player, mapConfig, mapTransitions, spawnOptions) {

    const mapKey = "map-" + mapConfig.id;

    const tilesetKey = "tileset-" + mapConfig.tilesetName;

    const map = scene.make.tilemap({ key: mapKey });

    if (!map) {

      throw new Error("Could not parse tilemap JSON for " + mapConfig.id + ".");

    }



    const tileMargin = mapConfig.tileMargin ?? 0;

    const tileSpacing = mapConfig.tileSpacing ?? 0;

    const tileset = map.addTilesetImage(

      mapConfig.tilesetName,

      tilesetKey,

      map.tileWidth,

      map.tileHeight,

      tileMargin,

      tileSpacing

    );

    if (!tileset) {

      throw new Error(

        'Tileset "' + mapConfig.tilesetName + '" not found. Re-export with: python world/scripts/export-map.py'

      );

    }



    world.tileSize = map.tileWidth;

    world.mapWidth = map.width;

    world.mapHeight = map.height;

    world.mapId = mapConfig.id;



    const groundLayer = map.createLayer(mapConfig.groundLayer, tileset, 0, 0);

    if (!groundLayer) {

      throw new Error('Missing layer "' + mapConfig.groundLayer + '" in map JSON.');

    }

    groundLayer.setDepth(0);

    TiledWorldBuilder.configureTileLayer(groundLayer);



    if (mapConfig.decorLayer) {

      const decorLayer = map.createLayer(mapConfig.decorLayer, tileset, 0, 0);

      if (decorLayer) {

        decorLayer.setDepth(1);

        TiledWorldBuilder.configureTileLayer(decorLayer);

      }

    }



    const wallsLayer = map.createLayer(mapConfig.wallsLayer, tileset, 0, 0);

    if (wallsLayer) {

      wallsLayer.setDepth(2);

      TiledWorldBuilder.configureTileLayer(wallsLayer);

      wallsLayer.setCollisionByProperty({ collides: true });

      world.collisionLayer = wallsLayer;

    }



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



          hotspots.registerRuntimeHotspot(

            Object.assign({}, hotspotContent, getObjectFeetPosition(obj, world.tileSize))

          );

        });

      }

    }



    world.runtimeHotspots = hotspots.filterAvatarHotspot(world.runtimeHotspots);

    if (mapConfig.features?.hotspotMarkers !== false && mapConfig.hotspotsLayer) {

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

      spawnOptions?.spawnId,

      spawnOptions?.returnState

    );



    player.create(spawnPos.x, spawnPos.y);

    player.setupColliders(world.collisionLayer, world.avatarNpc, world.propColliders);

    TiledWorldBuilder.setupCamera(scene, world, player.sprite);

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

    layer.setCullPadding(2);

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

    camera.startFollow(playerSprite, true, 1, 1);

    camera.setBounds(

      0,

      0,

      world.mapWidth * world.tileSize,

      world.mapHeight * world.tileSize

    );



    TiledWorldBuilder.applyCameraZoom(scene, world);



    if (!scene._cameraResizeBound) {

      scene._cameraResizeBound = true;

      scene.scale.on("resize", function () {

        TiledWorldBuilder.applyCameraZoom(scene, world);

      });

    }



    TiledWorldBuilder.setupPixelPerfectFollow(camera);

  }



  static applyCameraZoom(scene, world) {

    const camera = scene.cameras.main;

    if (!camera || !world.tileSize) {

      return;

    }



    const viewportWidth = scene.scale.gameSize.width;

    const viewportHeight = scene.scale.gameSize.height;

    const visibleTilesX = 20;

    const visibleTilesY = 15;



    const zoom = Math.min(

      viewportWidth / (visibleTilesX * world.tileSize),

      viewportHeight / (visibleTilesY * world.tileSize)

    );



    camera.setZoom(Phaser.Math.Clamp(zoom, 1, 4));

  }



  static setupPixelPerfectFollow(camera) {

    camera.on(Phaser.Cameras.Scene2D.Events.PRE_RENDER, function () {

      TiledWorldBuilder.snapCameraToPixels(camera);

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

