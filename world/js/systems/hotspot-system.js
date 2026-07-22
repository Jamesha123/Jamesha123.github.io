import { DebugGraphics } from "./debug-graphics.js?v=146";
import { createWorldLabel } from "../ui/world-label.js?v=146";

export class HotspotSystem {
  constructor(content, world) {
    this.content = content;
    this.world = world;
    this.nearbyHotspot = null;
    this.markerLabels = [];
  }

  getAvatarHotspotId() {
    const avatar = this.content.avatarConfig;
    return avatar && avatar.hotspotId ? avatar.hotspotId : null;
  }

  getCharacterEmbeddedHotspotIds() {
    const ids = [];
    const avatarHotspotId = this.getAvatarHotspotId();
    if (avatarHotspotId) {
      ids.push(avatarHotspotId);
    }

    this.content.portraitNpcConfigs.forEach(function (npc) {
      if (npc.hotspotId) {
        ids.push(npc.hotspotId);
      }
    });

    return ids;
  }

  getPropHotspotIds() {
    return this.content.propConfigs
      .map(function (prop) {
        return prop && prop.hotspotId ? prop.hotspotId : null;
      })
      .filter(Boolean);
  }

  getEmbeddedHotspotIds() {
    return this.getCharacterEmbeddedHotspotIds().concat(this.getPropHotspotIds());
  }

  filterEmbeddedHotspots(hotspots) {
    const embeddedIds = this.getCharacterEmbeddedHotspotIds();
    if (!embeddedIds.length) {
      return hotspots;
    }

    return hotspots.filter(function (hotspot) {
      return embeddedIds.indexOf(hotspot.id) === -1;
    });
  }

  filterAvatarHotspot(hotspots) {
    return this.filterEmbeddedHotspots(hotspots);
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

    if (!ui.isInputBlocked()) {
      this.nearbyHotspot = this.findNearbyHotspot(player);
    }

    if (ui.isInputBlocked() || options.suppressHint) {
      return;
    }

    if (this.nearbyHotspot) {
      ui.setInteractPrompt("open " + this.nearbyHotspot.label);
    } else if (!options.transitionHintActive) {
      ui.setDefaultHint();
    }
  }

  tryInteract(ui, player) {
    if (ui.isInputBlocked()) {
      return;
    }

    const hotspot = this.findNearbyHotspot(player) || this.nearbyHotspot;
    if (hotspot) {
      this.nearbyHotspot = hotspot;
      ui.openModal(hotspot);
    }
  }

  clearMarkers() {
    this.markerLabels.forEach(function (label) {
      label.destroy();
    });
    this.markerLabels = [];
  }

  addMarkers(scene) {
    this.clearMarkers();

    const npcHotspotIds = this.content.npcConfigs
      .filter(function (npc) {
        return npc.type !== "portrait";
      })
      .map(function (npc) {
        return npc.hotspotId;
      })
      .filter(Boolean);
    const embeddedHotspotIds = this.getEmbeddedHotspotIds();

    this.world.runtimeHotspots.forEach(function (hotspot) {
      if (npcHotspotIds.indexOf(hotspot.id) !== -1 || embeddedHotspotIds.indexOf(hotspot.id) !== -1) {
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

      const label = createWorldLabel(scene, labelX, labelY, hotspot.label);
      if (label) {
        this.markerLabels.push(label);
      }
    }, this);
  }

  showRangeOutline(scene, x, y, reach) {
    const radius = reach != null ? reach : this.getReach();
    return DebugGraphics.addHotspotRangeOutline(scene, x, y, radius);
  }
}
