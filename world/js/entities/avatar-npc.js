import { DebugGraphics } from "../systems/debug-graphics.js";
import { HotspotSystem } from "../systems/hotspot-system.js";

const FACING_DIRECTIONS = ["down", "left", "right", "up"];
const OPPOSITE_FACING = {
  down: "up",
  up: "down",
  left: "right",
  right: "left",
};

export class AvatarNpc {
  constructor(scene, content, world, hotspots) {
    this.scene = scene;
    this.config = content.avatarConfig;
    this.content = content;
    this.world = world;
    this.hotspots = hotspots;
    this.sprite = null;
    this.hitbox = null;
    this.animKeys = {};
    this.currentFacing = null;
    this.defaultFacing = "left";
  }

  spawn() {
    if (!this.config) {
      return;
    }

    const avatar = this.config;
    const frameRate = Math.round(1000 / (avatar.frameMs || 150));
    const sheetKey = avatar.id + "-sheet";
    const idleFramesByDirection = this.getIdleFramesByDirection(avatar);

    this.defaultFacing = avatar.defaultFacing || "left";
    this.createIdleAnimations(avatar.id, sheetKey, idleFramesByDirection, frameRate);

    const startFacing = this.defaultFacing;
    const startFrames = idleFramesByDirection[startFacing] || idleFramesByDirection.left;
    const tileX = avatar.x != null ? avatar.x : 32;
    const tileY = avatar.y != null ? avatar.y : 27;
    const x = tileX * this.world.tileSize;
    const y = tileY * this.world.tileSize;
    const scale = avatar.scale || 1;

    this.sprite = this.scene.add.sprite(x, y, sheetKey, startFrames[0]);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(scale);
    this.sprite.setDepth(9);
    this.setFacing(startFacing);

    this.hitbox = this.createHitbox(x, y, avatar);
    this.world.avatarNpc = this.hitbox;
    this.world.avatarEntity = this;

    if (avatar.showHitbox !== false) {
      DebugGraphics.addHitboxOutline(this.scene, this.hitbox);
    }

    if (avatar.hotspotId) {
      const hotspotPos = this.getHotspotPosition(x, y, avatar);
      const hotspotContent = this.content.getHotspot(avatar.hotspotId);
      if (hotspotContent) {
        this.hotspots.registerRuntimeHotspot(
          Object.assign({}, hotspotContent, hotspotPos)
        );
      }
      DebugGraphics.addHotspotRangeOutline(
        this.scene,
        hotspotPos.x,
        hotspotPos.y,
        this.hotspots.getReach()
      );
    }

    if (avatar.label) {
      this.addNameLabel(avatar.label, {
        gap: avatar.labelGap != null ? avatar.labelGap : 4,
        visualHeight: avatar.visualHeight != null ? avatar.visualHeight : 48,
      });
    }
  }

  getIdleFramesByDirection(avatar) {
    const framesByDirection = {};

    if (avatar.idleFrames) {
      FACING_DIRECTIONS.forEach(function (direction) {
        if (avatar.idleFrames[direction] && avatar.idleFrames[direction].length) {
          framesByDirection[direction] = avatar.idleFrames[direction];
        }
      });
    }

    if (!framesByDirection.left && avatar.idleLeftFrames && avatar.idleLeftFrames.length) {
      framesByDirection.left = avatar.idleLeftFrames;
    }

    return framesByDirection;
  }

  createIdleAnimations(id, sheetKey, idleFramesByDirection, frameRate) {
    FACING_DIRECTIONS.forEach((direction) => {
      const frames = idleFramesByDirection[direction];
      if (!frames || !frames.length) {
        return;
      }

      const animKey = id + "-idle-" + direction;
      this.animKeys[direction] = animKey;

      if (!this.scene.anims.exists(animKey)) {
        this.scene.anims.create({
          key: animKey,
          frames: frames.map(function (frameIndex) {
            return { key: sheetKey, frame: frameIndex };
          }),
          frameRate: frameRate,
          repeat: -1,
        });
      }
    });
  }

  updateFacing(player) {
    if (!player || !player.sprite || !this.sprite) {
      return;
    }

    const direction = OPPOSITE_FACING[player.facing.current];
    if (direction) {
      this.setFacing(direction);
    }
  }

  setFacing(direction) {
    const animKey = this.animKeys[direction];
    if (!animKey || direction === this.currentFacing) {
      return;
    }

    this.currentFacing = direction;
    this.sprite.play(animKey, true);
  }

  resetToDefaultFacing() {
    if (!this.sprite) {
      return;
    }

    this.currentFacing = null;
    this.setFacing(this.defaultFacing);
  }

  getHotspotPosition(x, feetY, avatar) {
    const scale = avatar.scale || 1;
    const bodyH = (avatar.bodyHeight != null ? avatar.bodyHeight : 8) * scale;
    const hitboxLift = bodyH + 8;
    return {
      x: x + (avatar.hotspotOffsetX != null ? avatar.hotspotOffsetX : 0),
      y: feetY - hitboxLift + bodyH / 2 + (avatar.hotspotOffsetY != null ? avatar.hotspotOffsetY : 0),
    };
  }

  createHitbox(x, feetY, avatar) {
    const scale = avatar.scale || 1;
    const bodyW = (avatar.bodyWidth != null ? avatar.bodyWidth : 14) * scale;
    const bodyH = (avatar.bodyHeight != null ? avatar.bodyHeight : 8) * scale;
    const hitbox = this.scene.add.zone(x, feetY - bodyH - 8, bodyW, bodyH);
    this.scene.physics.add.existing(hitbox, true);
    return hitbox;
  }

  addNameLabel(label, options) {
    options = options || {};
    const gap = options.gap != null ? options.gap : 4;
    const visualHeight = options.visualHeight != null ? options.visualHeight : 48;
    const scale = this.sprite.scaleY || 1;
    const fontSize = Math.max(8, Math.round(8 * scale)) + "px";
    const headTop = this.sprite.y - visualHeight * scale + 6;

    this.scene.add
      .text(this.sprite.x, headTop - gap, label, {
        fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: fontSize,
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
  }
}
