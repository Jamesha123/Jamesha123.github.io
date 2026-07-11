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

  isPlayerInHotspot(player, hotspot) {
    if (hotspot.hitboxRect) {
      const rect = hotspot.hitboxRect;
      return (
        player.x >= rect.left &&
        player.x <= rect.right &&
        player.y >= rect.top &&
        player.y <= rect.bottom
      );
    }

    const reach = hotspot.reach != null ? hotspot.reach : this.getReach();
    const dx = player.x - hotspot.x;
    const dy = player.y - hotspot.y;
    return Math.hypot(dx, dy) <= reach;
  }

  findNearbyHotspot(player) {
    if (!player) {
      return null;
    }

    for (const hotspot of this.world.runtimeHotspots) {
      if (this.isPlayerInHotspot(player, hotspot)) {
        return hotspot;
      }
    }

    return null;
  }

  checkProximity(player, ui, options) {
    options = options || {};

    if (!player) {
      return;
    }

    if (!ui.isModalOpen() && !ui.isMapFading()) {
      this.nearbyHotspot = this.findNearbyHotspot(player);
    }

    if (ui.isModalOpen() || ui.isMapFading() || options.suppressHint) {
      return;
    }

    if (this.nearbyHotspot) {
      ui.setHint("Press E or Interact to open: " + this.nearbyHotspot.label, true);
    } else if (!options.transitionHintActive) {
      ui.setHint("WASD / arrows to move • click or tap to walk", true);
    }
  }

  tryInteract(ui, player) {
    if (ui.isModalOpen()) {
      return;
    }

    const hotspot = this.findNearbyHotspot(player) || this.nearbyHotspot;
    if (hotspot) {
      this.nearbyHotspot = hotspot;
      ui.openModal(hotspot);
    }
  }

  addMarkers(scene) {
    const npcHotspotIds = this.content.npcConfigs.map(function (npc) {
      return npc.hotspotId;
    });
    const avatarHotspotId = this.getAvatarHotspotId();

    this.world.runtimeHotspots.forEach(function (hotspot) {
      if (npcHotspotIds.indexOf(hotspot.id) !== -1 || hotspot.id === avatarHotspotId) {
        return;
      }

      let labelX = hotspot.x;
      let labelY = hotspot.y;

      if (hotspot.hitboxRect) {
        DebugGraphics.addHotspotRectOutline(scene, hotspot.hitboxRect);
        labelX = hotspot.hitboxRect.left + hotspot.hitboxRect.width / 2;
        labelY = hotspot.hitboxRect.top - 4;
      } else {
        const reach = hotspot.reach != null ? hotspot.reach : this.getReach();
        DebugGraphics.addHotspotRangeOutline(scene, hotspot.x, hotspot.y, reach);
        labelY = hotspot.y - reach - 4;
      }

      scene.add
        .text(labelX, labelY, hotspot.label, {
          fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: "8px",
          fontStyle: "bold",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 1,
          backgroundColor: "#000000aa",
          padding: { x: 1, y: 0 },
        })
        .setOrigin(0.5, 1)
        .setDepth(10)
        .setResolution(2);
    }, this);
  }

  showRangeOutline(scene, x, y, reach) {
    const radius = reach != null ? reach : this.getReach();
    return DebugGraphics.addHotspotRangeOutline(scene, x, y, radius);
  }
}
