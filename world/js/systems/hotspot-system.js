import { DebugGraphics } from "./debug-graphics.js";

export class HotspotSystem {
  constructor(content, world) {
    this.content = content;
    this.world = world;
    this.nearbyHotspot = null;
  }

  getAvatarHotspotId() {
    const avatar = this.content.avatarConfig;
    return avatar && avatar.hotspotId ? avatar.hotspotId : null;
  }

  filterAvatarHotspot(hotspots) {
    const avatarHotspotId = this.getAvatarHotspotId();
    if (!avatarHotspotId) {
      return hotspots;
    }
    return hotspots.filter(function (hotspot) {
      return hotspot.id !== avatarHotspotId;
    });
  }

  getReach() {
    const avatar = this.content.avatarConfig;
    const multiplier = avatar && avatar.hotspotReach != null ? avatar.hotspotReach : 1.5;
    return this.world.tileSize * multiplier;
  }

  registerRuntimeHotspot(hotspot) {
    this.world.runtimeHotspots.push(hotspot);
  }

  checkProximity(player, ui) {
    if (ui.isModalOpen() || !player) {
      return;
    }

    this.nearbyHotspot = null;
    const reach = this.getReach();

    for (const hotspot of this.world.runtimeHotspots) {
      const dx = player.x - hotspot.x;
      const dy = player.y - hotspot.y;
      if (Math.hypot(dx, dy) <= reach) {
        this.nearbyHotspot = hotspot;
        break;
      }
    }

    if (this.nearbyHotspot) {
      ui.setHint("Press E, Enter, or Interact to open: " + this.nearbyHotspot.label, true);
    } else {
      ui.setHint("WASD / arrows to move • tap to walk on mobile", true);
    }
  }

  tryInteract(ui) {
    if (this.nearbyHotspot && !ui.isModalOpen()) {
      ui.openModal(this.nearbyHotspot);
    }
  }

  addMarkers(scene) {
    const npcHotspotIds = this.content.npcConfigs.map(function (npc) {
      return npc.hotspotId;
    });
    const avatarHotspotId = this.getAvatarHotspotId();

    this.world.runtimeHotspots.forEach(function (hotspot) {
      if (npcHotspotIds.indexOf(hotspot.id) === -1 && hotspot.id !== avatarHotspotId) {
        const key = HotspotSystem.createMarkerTexture(scene, hotspot, this.world.tileSize);
        scene.add.sprite(hotspot.x, hotspot.y, key).setDepth(5).setOrigin(0.5, 1);
      }

      scene.add
        .text(hotspot.x, hotspot.y - this.world.tileSize * 1.2, hotspot.label, {
          fontFamily: "Press Start 2P, monospace",
          fontSize: "8px",
          color: "#ffffff",
          backgroundColor: "#000000aa",
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5, 1)
        .setDepth(6);
    }, this);
  }

  static createMarkerTexture(scene, hotspot, tileSize) {
    const key = "hotspot-" + hotspot.id;
    if (scene.textures.exists(key)) {
      return key;
    }

    const marker = scene.make.graphics({ x: 0, y: 0, add: false });
    const color = Phaser.Display.Color.HexStringToColor(hotspot.color || "#ffffff").color;
    marker.fillStyle(color, 1);
    marker.fillCircle(tileSize / 2, tileSize / 2, 10);
    marker.lineStyle(2, 0xffffff, 1);
    marker.strokeCircle(tileSize / 2, tileSize / 2, 10);
    marker.generateTexture(key, tileSize, tileSize);
    return key;
  }

  showRangeOutline(scene, x, y) {
    return DebugGraphics.addHotspotRangeOutline(scene, x, y, this.getReach());
  }
}
