import { cacheBust } from "../utils/helpers.js?v=147";

export class CharacterAnimation {
  static preloadWalkFrames(loader, prefix, folder, walkConfig) {
    if (!walkConfig || typeof walkConfig !== "object" || !folder) {
      return;
    }

    Object.keys(walkConfig).forEach(function (direction) {
      const filenames = walkConfig[direction];
      if (!Array.isArray(filenames) || !filenames.length) {
        return;
      }

      filenames.forEach(function (filename, index) {
        loader.image(prefix + "-" + direction + "-" + index, cacheBust(folder + "/" + filename));
      });
    });
  }

  static createWalkAnimations(scene, prefix, walkConfig, frameRate) {
    if (!walkConfig || typeof walkConfig !== "object") {
      return;
    }

    frameRate = frameRate || 8;

    Object.keys(walkConfig).forEach(function (direction) {
      const filenames = walkConfig[direction];
      if (!Array.isArray(filenames) || !filenames.length) {
        return;
      }

      const animKey = prefix + "-walk-" + direction;

      if ((direction === "left" || direction === "right") && filenames.length === 3) {
        const introKey = animKey + "-intro";
        if (!CharacterAnimation.hasWalkFrameTextures(scene, prefix, direction, [0, 1, 2])) {
          return;
        }

        if (!scene.anims.exists(introKey)) {
          scene.anims.create({
            key: introKey,
            frames: [0, 1, 2].map(function (index) {
              return { key: prefix + "-" + direction + "-" + index };
            }),
            frameRate: frameRate,
            repeat: 0,
          });
        }
        if (!scene.anims.exists(animKey)) {
          scene.anims.create({
            key: animKey,
            frames: [1, 2].map(function (index) {
              return { key: prefix + "-" + direction + "-" + index };
            }),
            frameRate: frameRate,
            repeat: -1,
          });
        }
        return;
      }

      if (!CharacterAnimation.hasWalkFrameTextures(scene, prefix, direction, filenames)) {
        return;
      }

      if (scene.anims.exists(animKey)) {
        return;
      }

      scene.anims.create({
        key: animKey,
        frames: filenames.map(function (_filename, index) {
          return { key: prefix + "-" + direction + "-" + index };
        }),
        frameRate: frameRate,
        repeat: -1,
      });
    });
  }

  static hasWalkFrameTextures(scene, prefix, direction, filenames) {
    if (!Array.isArray(filenames)) {
      return false;
    }

    return filenames.every(function (_filename, index) {
      return scene.textures.exists(prefix + "-" + direction + "-" + index);
    });
  }

  static hasSheetFrame(scene, sheetKey, frameIndex) {
    if (!scene.textures.exists(sheetKey)) {
      return false;
    }

    const texture = scene.textures.get(sheetKey);
    return texture.has(String(frameIndex));
  }

  static getIdleFrameKey(prefix, direction) {
    return prefix + "-" + direction + "-0";
  }

  static applyIdlePose(sprite, prefix, direction) {
    CharacterAnimation.clearWalkListeners(sprite);
    sprite.anims.stop();
    sprite.setFlipY(false);
    sprite.setTexture(CharacterAnimation.getIdleFrameKey(prefix, direction));
  }

  static clearWalkListeners(sprite) {
    if (sprite._walkAnimCompleteHandler) {
      sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE, sprite._walkAnimCompleteHandler);
      sprite._walkAnimCompleteHandler = null;
    }
  }

  static playWalkAnimation(sprite, prefix, direction) {
    const animKey = prefix + "-walk-" + direction;
    const introKey = animKey + "-intro";

    CharacterAnimation.clearWalkListeners(sprite);
    sprite.setFlipY(false);

    if (sprite.scene.anims.exists(introKey)) {
      const handler = function (animation) {
        if (animation.key !== introKey) {
          return;
        }
        CharacterAnimation.clearWalkListeners(sprite);
        if (sprite.scene.anims.exists(animKey)) {
          sprite.play(animKey, true);
        }
      };
      sprite._walkAnimCompleteHandler = handler;
      sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, handler);
      sprite.play(introKey);
      return;
    }

    if (!sprite.scene.anims.exists(animKey)) {
      return;
    }

    sprite.play(animKey, true);
  }

  static update(sprite, prefix, vx, vy, facingState) {
    const isMoving = Math.abs(vx) >= 1 || Math.abs(vy) >= 1;

    if (!isMoving) {
      CharacterAnimation.applyIdlePose(sprite, prefix, facingState.current);
      return;
    }

    let direction = facingState.current;
    if (Math.abs(vy) >= Math.abs(vx)) {
      direction = vy < 0 ? "up" : "down";
    } else {
      direction = vx < 0 ? "left" : "right";
    }

    facingState.current = direction;

    const animKey = prefix + "-walk-" + direction;
    const introKey = animKey + "-intro";
    const currentKey = sprite.anims.currentAnim ? sprite.anims.currentAnim.key : null;

    if (currentKey === introKey && sprite.anims.isPlaying) {
      return;
    }

    if (currentKey === introKey && !sprite.anims.isPlaying) {
      CharacterAnimation.clearWalkListeners(sprite);
      if (sprite.scene.anims.exists(animKey)) {
        sprite.play(animKey, true);
      }
      return;
    }

    if (currentKey === animKey && sprite.anims.isPlaying) {
      return;
    }

    if (currentKey === animKey && !sprite.anims.isPlaying) {
      sprite.play(animKey, true);
      return;
    }

    CharacterAnimation.playWalkAnimation(sprite, prefix, direction);
  }
}
