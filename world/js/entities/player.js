import { CharacterAnimation } from "../systems/character-animation.js";

export class Player {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config || {};
    this.sprite = null;
    this.facing = { current: "down" };
    this.speed = this.config.speed != null ? this.config.speed : 140;
    this.touchTarget = null;
    this.touchStuckFrames = 0;
    this.lastTouchDistance = null;
  }

  create(x, y) {
    if (this.sprite) {
      this.sprite.destroy();
    }

    const scale = this.config.scale || 1;
    this.sprite = this.scene.physics.add.sprite(
      x,
      y,
      CharacterAnimation.getIdleFrameKey("player", "down")
    );
    this.sprite.setCollideWorldBounds(true);
    this.configureBody(scale);
    this.sprite.setDepth(10);
    this.facing = { current: "down" };
    return this.sprite;
  }

  configureBody(scale) {
    this.sprite.setScale(scale);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.body.setSize(10, 8);
    this.sprite.body.setOffset(3, 8);
  }

  setupColliders(collisionLayer, avatarHitbox, propColliders) {
    if (collisionLayer) {
      this.scene.physics.add.collider(this.sprite, collisionLayer);
    }
    if (avatarHitbox) {
      this.scene.physics.add.collider(this.sprite, avatarHitbox);
    }
    (propColliders || []).forEach((hitbox) => {
      this.scene.physics.add.collider(this.sprite, hitbox);
    });
  }

  update(input, world, deltaMs) {
    if (!this.sprite) {
      return;
    }

    const deltaSec = deltaMs / 1000;

    let vx = 0;
    let vy = 0;

    const keys = input.keys || {};
    const cursors = input.cursors;
    const joystick = input.joystick;

    let usingJoystick = false;

    if (joystick && (joystick.x !== 0 || joystick.y !== 0)) {
      vx = joystick.x;
      vy = joystick.y;
      usingJoystick = true;
    } else {
      if (cursors.left.isDown || keys.A.isDown) {
        vx = -1;
      } else if (cursors.right.isDown || keys.D.isDown) {
        vx = 1;
      }

      if (cursors.up.isDown || keys.W.isDown) {
        vy = -1;
      } else if (cursors.down.isDown || keys.S.isDown) {
        vy = 1;
      }
    }

    const usingKeyboard = usingJoystick || vx !== 0 || vy !== 0;

    if (usingKeyboard) {
      if (usingJoystick || vx !== 0 || vy !== 0) {
        const length = Math.hypot(vx, vy);
        if (length > 0) {
          vx = (vx / length) * this.speed;
          vy = (vy / length) * this.speed;
        }
      }
      this.touchTarget = null;
      this.touchStuckFrames = 0;
    } else if (this.touchTarget) {
      const dx = this.touchTarget.x - this.sprite.x;
      const dy = this.touchTarget.y - this.sprite.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 8) {
        vx = (dx / distance) * this.speed;
        vy = (dy / distance) * this.speed;

        if (
          this.lastTouchDistance != null &&
          distance >= this.lastTouchDistance - 0.5 &&
          distance > 12
        ) {
          this.touchStuckFrames += 1;
        } else {
          this.touchStuckFrames = 0;
        }

        if (this.touchStuckFrames > 12) {
          this.touchTarget = null;
          this.touchStuckFrames = 0;
          this.lastTouchDistance = null;
          vx = 0;
          vy = 0;
        } else {
          this.lastTouchDistance = distance;
        }
      } else {
        this.touchTarget = null;
        this.touchStuckFrames = 0;
        this.lastTouchDistance = null;
      }
    } else {
      this.touchStuckFrames = 0;
      this.lastTouchDistance = null;
    }

    if (world.useTiled && world.collisionLayer) {
      this.sprite.body.setVelocity(vx, vy);
    } else {
      const nextX = this.sprite.x + vx * deltaSec;
      const nextY = this.sprite.y + vy * deltaSec;

      if (Player.canMoveTo(nextX, this.sprite.y, world)) {
        this.sprite.x = nextX;
      }
      if (Player.canMoveTo(this.sprite.x, nextY, world)) {
        this.sprite.y = nextY;
      }
      this.sprite.body.setVelocity(0, 0);
    }

    CharacterAnimation.update(this.sprite, "player", vx, vy, this.facing);
  }

  static canMoveTo(x, y, world) {
    if (world.useTiled && world.collisionLayer) {
      const margin = world.tileSize * 0.25;
      const points = [
        { x: x - margin, y: y - margin },
        { x: x + margin, y: y - margin },
        { x: x - margin, y: y + margin },
        { x: x + margin, y: y + margin },
      ];

      return points.every(function (point) {
        const tile = world.collisionLayer.worldToTileXY(point.x, point.y);
        return !world.collisionLayer.hasTileAt(tile.x, tile.y);
      });
    }

    if (!world.fallbackMap) {
      return true;
    }

    const margin = 10;
    const points = [
      { x: x - margin, y: y - margin },
      { x: x + margin, y: y - margin },
      { x: x - margin, y: y + margin },
      { x: x + margin, y: y + margin },
    ];

    return points.every(function (point) {
      const tx = Math.floor(point.x / world.tileSize);
      const ty = Math.floor(point.y / world.tileSize);
      if (tx < 0 || ty < 0 || tx >= world.mapWidth || ty >= world.mapHeight) {
        return false;
      }
      return world.fallbackMap[ty][tx] !== "#";
    });
  }

  setTouchTarget(x, y) {
    this.touchTarget = { x: x, y: y };
  }

  clearTouchTarget() {
    this.touchTarget = null;
    this.touchStuckFrames = 0;
    this.lastTouchDistance = null;
  }

  stop() {
    if (this.sprite) {
      this.sprite.body.setVelocity(0, 0);
      CharacterAnimation.applyIdlePose(this.sprite, "player", this.facing.current);
    }
  }
}
