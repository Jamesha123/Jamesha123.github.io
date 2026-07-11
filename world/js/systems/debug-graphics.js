export function showHitboxesEnabled() {
  return typeof window !== "undefined" && window.SHOW_HITBOXES === true;
}

export class DebugGraphics {
  static reset() {
    DebugGraphics.hitboxTargets = [];
    DebugGraphics.hotspotRanges = [];
    DebugGraphics.hotspotRects = [];
  }

  static addHitboxOutline(scene, bodyTarget) {
    DebugGraphics.hitboxTargets.push(bodyTarget);
    if (showHitboxesEnabled()) {
      DebugGraphics.redraw(scene);
    }
  }

  static addHotspotRangeOutline(scene, x, y, radius) {
    DebugGraphics.hotspotRanges.push({ x: x, y: y, radius: radius });
    if (showHitboxesEnabled()) {
      DebugGraphics.redraw(scene);
    }
  }

  static addHotspotRectOutline(scene, rect) {
    DebugGraphics.hotspotRects.push(rect);
    if (showHitboxesEnabled()) {
      DebugGraphics.redraw(scene);
    }
  }

  static redraw(scene) {
    if (!scene) {
      return;
    }

    if (!scene.debugOutlineGfx) {
      scene.debugOutlineGfx = scene.add.graphics().setDepth(11);
    }

    const gfx = scene.debugOutlineGfx;
    gfx.clear();

    if (!showHitboxesEnabled()) {
      return;
    }

    DebugGraphics.hotspotRanges.forEach(function (range) {
      gfx.fillStyle(0xff0000, 0.08);
      gfx.fillCircle(range.x, range.y, range.radius);
      gfx.lineStyle(2, 0xff0000, 0.9);
      gfx.strokeCircle(range.x, range.y, range.radius);
    });

    DebugGraphics.hotspotRects.forEach(function (rect) {
      gfx.fillStyle(0xff0000, 0.08);
      gfx.fillRect(rect.left, rect.top, rect.width, rect.height);
      gfx.lineStyle(2, 0xff0000, 0.9);
      gfx.strokeRect(rect.left, rect.top, rect.width, rect.height);
    });

    DebugGraphics.hitboxTargets.forEach(function (bodyTarget) {
      const go = bodyTarget;
      const body = go.body;
      if (!body) {
        return;
      }

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
    });
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
}

DebugGraphics.hitboxTargets = [];
DebugGraphics.hotspotRanges = [];
DebugGraphics.hotspotRects = [];
