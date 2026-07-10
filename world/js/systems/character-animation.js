import { cacheBust } from "../utils/helpers.js";

export class CharacterAnimation {
  static preloadWalkFrames(loader, prefix, folder, walkConfig) {
    Object.keys(walkConfig).forEach(function (direction) {
      walkConfig[direction].forEach(function (filename, index) {
        loader.image(prefix + "-" + direction + "-" + index, cacheBust(folder + "/" + filename));
      });
    });
  }

  static createWalkAnimations(scene, prefix, walkConfig, frameRate) {
    frameRate = frameRate || 8;

    Object.keys(walkConfig).forEach(function (direction) {
      const filenames = walkConfig[direction];
      const animKey = prefix + "-walk-" + direction;

      if ((direction === "left" || direction === "right") && filenames.length === 3) {
        scene.anims.create({
          key: animKey + "-intro",
          frames: [0, 1, 2].map(function (index) {
            return { key: prefix + "-" + direction + "-" + index };
          }),
          frameRate: frameRate,
          repeat: 0,
        });
        scene.anims.create({
          key: animKey,
          frames: [1, 2].map(function (index) {
            return { key: prefix + "-" + direction + "-" + index };
          }),
          frameRate: frameRate,
          repeat: -1,
        });
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

  static getIdleFrameKey(prefix, direction) {
    return prefix + "-" + direction + "-0";
  }

  static applyIdlePose(sprite, prefix, direction) {
    sprite.anims.stop();
    sprite.setFlipY(false);
    sprite.setTexture(CharacterAnimation.getIdleFrameKey(prefix, direction));
  }

  static playWalkAnimation(sprite, prefix, direction) {
    const animKey = prefix + "-walk-" + direction;
    const introKey = animKey + "-intro";

    sprite.setFlipY(false);

    if (sprite.scene.anims.exists(introKey)) {
      sprite.play(introKey);
      sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, function (animation) {
        if (animation.key !== introKey) {
          return;
        }
        sprite.play(animKey, true);
      });
      return;
    }

    sprite.play(animKey, true);
  }

  static update(sprite, prefix, vx, vy, facingState) {
    if (vx === 0 && vy === 0) {
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

    if (currentKey === animKey || currentKey === introKey) {
      return;
    }

    CharacterAnimation.playWalkAnimation(sprite, prefix, direction);
  }
}
