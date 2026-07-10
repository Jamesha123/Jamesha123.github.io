import { CharacterAnimation } from "../systems/character-animation.js";

export class Player {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config || {};
    this.sprite = null;
    this.facing = { current: "down" };
    this.speed = this.config.speed ?? 140;
    this.touchTarget = null;
  }

  create(x, y) {
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

    let vx = 0;
    let vy = 0;

    if (input.cursors.left.isDown || input.keys.A.isDown) {
      vx = -1;
    } else if (input.cursors.right.isDown || input.keys.D.isDown) {
      vx = 1;
    }

    if (input.cursors.up.isDown || input.keys.W.isDown) {
      vy = -1;
    } else if (input.cursors.down.isDown || input.keys.S.isDown) {
      vy = 1;
    }

    if (vx !== 0 || vy !== 0) {
      const length = Math.hypot(vx, vy);
      vx = (vx / length) * this.speed;
      vy = (vy / length) * this.speed;
    }

    if (!vx && !vy && this.touchTarget) {
      const dx = this.touchTarget.x - this.sprite.x;
      const dy = this.touchTarget.y - this.sprite.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 8) {
        vx = (dx / distance) * this.speed;
        vy = (dy / distance) * this.speed;
      } else {
        this.touchTarget = null;
      }
    }

    if (world.useTiled && world.collisionLayer) {
      this.sprite.body.setVelocity(vx, vy);
      CharacterAnimation.update(this.sprite, "player", vx, vy, this.facing);
      return;
    }

    const nextX = this.sprite.x + vx * (deltaMs / 1000);
    const nextY = this.sprite.y + vy * (deltaMs / 1000);

    if (Player.canMoveTo(nextX, this.sprite.y, world)) {
      this.sprite.x = nextX;
    }
    if (Player.canMoveTo(this.sprite.x, nextY, world)) {
      this.sprite.y = nextY;
    }
    this.sprite.body.setVelocity(0, 0);
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
  }

  stop() {
    if (this.sprite) {
      this.sprite.body.setVelocity(0, 0);
      CharacterAnimation.applyIdlePose(this.sprite, "player", this.facing.current);
    }
  }
}
