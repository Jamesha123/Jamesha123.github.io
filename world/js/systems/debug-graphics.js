export class DebugGraphics {
  static setShowHitboxes(visible) {
    DebugGraphics.showHitboxes = visible;
    if (typeof window !== "undefined") {
      window.SHOW_HITBOXES = visible;
    }
  }

  static reset() {
    DebugGraphics.showHitboxes = false;
  }

  static addHitboxOutline(scene, bodyTarget) {
    const gfx = scene.add.graphics().setDepth(11);
    const drawOutline = function () {
      if (!DebugGraphics.showHitboxes) {
        gfx.clear();
        return;
      }

      const go = bodyTarget;
      const body = go.body;
      if (!body) {
        return;
      }
      gfx.clear();
      gfx.lineStyle(2, 0xff0000, 1);

      const angle = go.rotation || 0;
      if (Math.abs(angle) > 0.001) {
        DebugGraphics.strokeRotatedRect(
          gfx,
          go.x,
          go.y,
          go.displayWidth || go.width,
          go.displayHeight || go.height,
          angle
        );
      } else {
        gfx.strokeRect(body.x, body.y, body.width, body.height);
      }
    };
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, drawOutline);
    drawOutline();
    return gfx;
  }

  static strokeRotatedRect(gfx, centerX, centerY, width, height, angleRadians) {
    const cos = Math.cos(angleRadians);
    const sin = Math.sin(angleRadians);
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const localCorners = [
      [-halfWidth, -halfHeight],
      [halfWidth, -halfHeight],
      [halfWidth, halfHeight],
      [-halfWidth, halfHeight],
    ];
    const corners = localCorners.map(function (point) {
      const localX = point[0];
      const localY = point[1];
      return {
        x: centerX + localX * cos - localY * sin,
        y: centerY + localX * sin + localY * cos,
      };
    });

    gfx.beginPath();
    gfx.moveTo(corners[0].x, corners[0].y);
    for (let index = 1; index < corners.length; index += 1) {
      gfx.lineTo(corners[index].x, corners[index].y);
    }
    gfx.closePath();
    gfx.strokePath();
  }

  static addHotspotRangeOutline(scene, x, y, radius) {
    const gfx = scene.add.graphics().setDepth(10);
    const drawOutline = function () {
      gfx.clear();
      gfx.fillStyle(0xff0000, 0.08);
      gfx.fillCircle(x, y, radius);
      gfx.lineStyle(2, 0xff0000, 0.9);
      gfx.strokeCircle(x, y, radius);
    };
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, drawOutline);
    drawOutline();
    return gfx;
  }
}

DebugGraphics.showHitboxes = false;
