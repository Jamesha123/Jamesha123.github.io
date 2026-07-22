import { CharacterAnimation } from "../systems/character-animation.js?v=147";
import { DebugGraphics } from "../systems/debug-graphics.js?v=147";
import { createWorldLabel } from "../ui/world-label.js?v=147";

const FACING_DIRECTIONS = ["down", "left", "right", "up"];
const OPPOSITE_FACING = {
  down: "up",
  up: "down",
  left: "right",
  right: "left",
};

export class AvatarNpc {
  constructor(scene, content, world, hotspots, config) {
    this.scene = scene;
    this.config = config || content.avatarConfig;
    this.content = content;
    this.world = world;
    this.hotspots = hotspots;
    this.sprite = null;
    this.hitbox = null;
    this.animKeys = {};
    this.currentFacing = null;
    this.defaultFacing = "left";
    this.spritePrefix = null;
    this.isWalkPortrait = false;
  }

  spawn() {
    if (!this.config) {
      return;
    }

    try {
      this.isWalkPortrait =
        !this.config.spritesheet && !!this.config.folder && (!!this.config.idle || !!this.config.walk);
      if (this.isWalkPortrait) {
        this.spawnWalkPortrait();
        return;
      }

      this.spawnSheetPortrait();
    } catch (error) {
      const npcId = this.config.id || "unknown";
      throw new Error("NPC \"" + npcId + "\": " + error.message, { cause: error });
    }
  }

  spawnWalkPortrait() {
    const avatar = this.config;
    this.spritePrefix = "portrait-" + avatar.id;
    const idleFrames = avatar.idle || avatar.walk;
    if (!idleFrames) {
      console.warn("Portrait NPC is missing idle/walk frames:", avatar.id);
      return;
    }

    const frameRate = Math.round(
      1000 / (avatar.idleFrameMs || avatar.frameMs || (avatar.idle ? 450 : 180))
    );

    if (avatar.walk) {
      CharacterAnimation.createWalkAnimations(
        this.scene,
        this.spritePrefix,
        avatar.walk,
        avatar.walkFrameRate || 6
      );
    }

    this.createIdleAnimations(avatar.id, this.spritePrefix, idleFrames, frameRate, true);

    this.defaultFacing = avatar.defaultFacing || avatar.idleDirection || "down";
    const startPose = this.resolveWalkPortraitPose(idleFrames, this.defaultFacing);
    if (!startPose) {
      console.warn("Portrait NPC has no usable idle frames:", avatar.id);
      return;
    }

    this.defaultFacing = startPose.direction;
    const { x, y, scale } = this.getSpawnPosition(avatar);

    this.sprite = this.scene.add.sprite(
      x,
      y,
      CharacterAnimation.getIdleFrameKey(this.spritePrefix, startPose.direction)
    );
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(scale);
    this.sprite.setDepth(9);
    this.currentFacing = null;
    this.setFacing(startPose.direction);

    this.finishSpawn(x, y, avatar);
  }

  spawnSheetPortrait() {
    const avatar = this.config;
    const frameRate = Math.round(1000 / (avatar.frameMs || 150));
    const sheetKey = avatar.id + "-sheet";
    if (!this.scene.textures.exists(sheetKey)) {
      console.warn("Portrait NPC spritesheet not loaded:", avatar.id);
      return;
    }

    const idleFramesByDirection = this.getIdleFramesByDirection(avatar);

    this.defaultFacing = avatar.defaultFacing || "left";
    this.createIdleAnimations(avatar.id, sheetKey, idleFramesByDirection, frameRate, false);

    const startPose = this.resolveSheetPortraitPose(idleFramesByDirection, this.defaultFacing);
    if (!startPose) {
      console.warn("Portrait NPC is missing spritesheet idle frames:", avatar.id);
      return;
    }

    this.defaultFacing = startPose.direction;
    const { x, y, scale } = this.getSpawnPosition(avatar);

    this.sprite = this.scene.add.sprite(x, y, sheetKey, startPose.frame);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setScale(scale);
    this.sprite.setDepth(9);
    this.currentFacing = null;
    this.setFacing(startPose.direction);

    this.finishSpawn(x, y, avatar);
  }

  resolveWalkPortraitPose(frameSource, preferredDirection) {
    const directions = [preferredDirection, "down", "left", "right", "up"];
    for (let i = 0; i < directions.length; i += 1) {
      const direction = directions[i];
      const frames = frameSource[direction];
      if (!frames || !frames.length) {
        continue;
      }

      const textureKey = CharacterAnimation.getIdleFrameKey(this.spritePrefix, direction);
      if (!this.scene.textures.exists(textureKey)) {
        continue;
      }

      return { direction: direction };
    }

    return null;
  }

  resolveSheetPortraitPose(idleFramesByDirection, preferredDirection) {
    const directions = [preferredDirection, "left", "down", "right", "up"];
    for (let i = 0; i < directions.length; i += 1) {
      const direction = directions[i];
      const frames = idleFramesByDirection[direction];
      if (frames && frames.length) {
        return { direction: direction, frame: frames[0] };
      }
    }

    return null;
  }

  getSpawnPosition(avatar) {
    const tileX = avatar.x != null ? avatar.x : 32;
    const tileY = avatar.y != null ? avatar.y : 27;
    return {
      x: tileX * this.world.tileSize,
      y: tileY * this.world.tileSize,
      scale: avatar.scale || 1,
    };
  }

  finishSpawn(x, y, avatar) {
    this.hitbox = this.createHitbox(x, y, avatar);
    this.registerWorldRefs(avatar);

    DebugGraphics.addHitboxOutline(this.scene, this.hitbox, "showCharacters");

    if (avatar.hotspotId) {
      const hotspotPos = this.getHotspotPosition(x, y, avatar);
      DebugGraphics.addHotspotRangeOutline(
        this.scene,
        hotspotPos.x,
        hotspotPos.y,
        this.getHotspotReach(avatar)
      );
    }

    if (avatar.hotspotId) {
      const hotspotPos = this.getHotspotPosition(x, y, avatar);
      const hotspotContent = this.content.getHotspot(avatar.hotspotId);
      if (hotspotContent) {
        this.hotspots.registerRuntimeHotspot(
          Object.assign({}, hotspotContent, hotspotPos, {
            reach: this.getHotspotReach(avatar),
          })
        );
      }
    }

    if (avatar.label) {
      const labelPos = this.getLabelPosition();
      this.nameLabel = createWorldLabel(this.scene, labelPos.x, labelPos.y, avatar.label, {
        fontSize: avatar.labelFontSize,
      });
    }
  }

  registerWorldRefs(avatar) {
    if (!this.config.type || this.config === this.content.avatarConfig) {
      this.world.avatarNpc = this.hitbox;
      this.world.avatarEntity = this;
      return;
    }

    if (!this.world.portraitHitboxes) {
      this.world.portraitHitboxes = [];
    }
    if (!this.world.portraitEntities) {
      this.world.portraitEntities = [];
    }

    this.world.portraitHitboxes.push(this.hitbox);
    this.world.portraitEntities.push({
      entity: this,
      hotspotId: avatar.hotspotId || null,
    });
  }

  getHotspotReach(avatar) {
    const multiplier = avatar.hotspotReach != null ? avatar.hotspotReach : 1.5;
    return this.world.tileSize * multiplier;
  }

  getLabelPosition() {
    const avatar = this.config;
    const scale = this.sprite.scaleY || 1;
    const gap = avatar.labelGap != null ? avatar.labelGap : 2;
    const visualHeight = avatar.visualHeight != null ? avatar.visualHeight : 48;
    const headTop = this.sprite.y - visualHeight * scale + 6;

    return {
      x: Math.round(this.sprite.x + (avatar.labelOffsetX != null ? avatar.labelOffsetX : 0)),
      y: Math.round(headTop - gap),
    };
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

  createIdleAnimations(id, sourceKey, frameSource, frameRate, fromWalkFrames) {
    if (!frameSource || typeof frameSource !== "object") {
      return;
    }

    FACING_DIRECTIONS.forEach((direction) => {
      const frames = frameSource[direction];
      if (!frames || !frames.length) {
        return;
      }

      if (fromWalkFrames && frames.length === 1) {
        const textureKey = sourceKey + "-" + direction + "-0";
        if (!this.scene.textures.exists(textureKey)) {
          return;
        }
        this.animKeys[direction] = id + "-static-" + direction;
        return;
      }

      const animKey = id + "-idle-" + direction;
      this.animKeys[direction] = animKey;

      if (!this.scene.anims.exists(animKey)) {
        const phaserFrames = frames
          .map(function (frameValue, index) {
            if (fromWalkFrames) {
              const textureKey = sourceKey + "-" + direction + "-" + index;
              if (!this.scene.textures.exists(textureKey)) {
                return null;
              }
              return { key: textureKey };
            }

            if (!CharacterAnimation.hasSheetFrame(this.scene, sourceKey, frameValue)) {
              return null;
            }
            return { key: sourceKey, frame: frameValue };
          }, this)
          .filter(Boolean);

        if (!phaserFrames.length) {
          return;
        }

        this.scene.anims.create({
          key: animKey,
          frames: phaserFrames,
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
    if (direction === this.currentFacing) {
      return;
    }

    if (this.isWalkPortrait && this.spritePrefix) {
      const idleFrames = this.config.idle || this.config.walk;
      const frames = idleFrames && idleFrames[direction];
      if (frames && frames.length === 1) {
        const textureKey = CharacterAnimation.getIdleFrameKey(this.spritePrefix, direction);
        if (this.scene.textures.exists(textureKey)) {
          this.currentFacing = direction;
          this.sprite.anims.stop();
          this.sprite.setTexture(textureKey);
        }
        return;
      }
    }

    const animKey = this.animKeys[direction];
    if (!animKey || !this.sprite) {
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
    const offsetX =
      avatar.hitboxOffsetX != null
        ? avatar.hitboxOffsetX
        : avatar.offsetX != null
          ? avatar.offsetX
          : 0;
    const offsetY =
      avatar.hitboxOffsetY != null
        ? avatar.hitboxOffsetY
        : avatar.offsetY != null
          ? avatar.offsetY
          : 0;

    const hitbox = this.scene.add.zone(
      x + offsetX,
      feetY - bodyH - 8 + offsetY,
      bodyW,
      bodyH
    );
    this.scene.physics.add.existing(hitbox, true);
    if (hitbox.body && hitbox.body.updateFromGameObject) {
      hitbox.body.updateFromGameObject();
    }
    return hitbox;
  }
}
