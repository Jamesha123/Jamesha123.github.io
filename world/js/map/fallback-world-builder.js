import { FALLBACK_MAP } from "../config/fallback-map.js?v=146";
import { AvatarNpc } from "../entities/avatar-npc.js?v=146";
import { setupCamera } from "./camera-controller.js?v=146";

export class FallbackWorldBuilder {
  static collectNpcHitboxes(world) {
    const hitboxes = [];
    if (world.avatarNpc) {
      hitboxes.push(world.avatarNpc);
    }
    if (world.portraitHitboxes && world.portraitHitboxes.length) {
      hitboxes.push.apply(hitboxes, world.portraitHitboxes);
    }
    return hitboxes;
  }

  static build(scene, content, world, hotspots, player) {
    world.tileSize = 32;
    world.mapWidth = FALLBACK_MAP[0].length;
    world.mapHeight = FALLBACK_MAP.length;
    world.fallbackMap = FALLBACK_MAP;

    FallbackWorldBuilder.createTiles(scene);

    for (let y = 0; y < world.mapHeight; y++) {
      for (let x = 0; x < world.mapWidth; x++) {
        const cell = FALLBACK_MAP[y][x];
        const key = cell === "#" ? "tile-wall" : "tile-floor";
        scene.add.image(x * 32 + 16, y * 32 + 16, key);
      }
    }

    world.runtimeHotspots = hotspots.filterAvatarHotspot(
      content.hotspots.map(function (hotspot) {
        return Object.assign({}, hotspot, {
          x: hotspot.x * world.tileSize + world.tileSize / 2,
          y: hotspot.y * world.tileSize + world.tileSize / 2,
        });
      })
    );

    hotspots.addMarkers(scene);
    new AvatarNpc(scene, content, world, hotspots).spawn();
    content.portraitNpcConfigs.forEach(function (npc) {
      new AvatarNpc(scene, content, world, hotspots, npc).spawn();
    });
    player.create(9 * 32 + 16, 7 * 32 + 16);
    player.setupColliders(null, FallbackWorldBuilder.collectNpcHitboxes(world));
    setupCamera(scene, world, player.sprite);
  }

  static createTiles(scene) {
    const floor = scene.make.graphics({ x: 0, y: 0, add: false });
    floor.fillStyle(0x3d5a3d, 1);
    floor.fillRect(0, 0, 32, 32);
    floor.fillStyle(0x4a6b4a, 1);
    floor.fillRect(2, 2, 28, 28);
    floor.generateTexture("tile-floor", 32, 32);

    const wall = scene.make.graphics({ x: 0, y: 0, add: false });
    wall.fillStyle(0x5c4033, 1);
    wall.fillRect(0, 0, 32, 32);
    wall.fillStyle(0x3e2a22, 1);
    wall.fillRect(0, 0, 32, 4);
    wall.fillRect(0, 0, 4, 32);
    wall.generateTexture("tile-wall", 32, 32);
  }
}
