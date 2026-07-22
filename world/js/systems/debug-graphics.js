import { isDebugEnabled } from "../config/debug.js?v=147";

function getStore() {
  if (typeof window !== "undefined") {
    if (!window.__DEBUG_GRAPHICS_STORE__) {
      window.__DEBUG_GRAPHICS_STORE__ = {
        hitboxTargets: [],
        hotspotRanges: [],
        hotspotRects: [],
      };
    }
    return window.__DEBUG_GRAPHICS_STORE__;
  }

  if (!getStore.fallback) {
    getStore.fallback = {
      hitboxTargets: [],
      hotspotRanges: [],
      hotspotRects: [],
    };
  }

  return getStore.fallback;
}

export class DebugGraphics {
  static reset(scene) {
    if (scene) {
      if (scene.debugOutlineGfx) {
        scene.debugOutlineGfx.destroy();
        scene.debugOutlineGfx = null;
      }
      if (scene.transitionOutlineGfx) {
        scene.transitionOutlineGfx.destroy();
        scene.transitionOutlineGfx = null;
      }
    }

    const store = getStore();
    store.hitboxTargets = [];
    store.hotspotRanges = [];
    store.hotspotRects = [];
  }

  static addHitboxOutline(scene, bodyTarget, kind) {
    if (!bodyTarget || !kind) {
      return;
    }

    getStore().hitboxTargets.push({
      target: bodyTarget,
      kind: kind,
    });
    DebugGraphics.redraw(scene);
  }

  static addHotspotRangeOutline(scene, x, y, radius) {
    getStore().hotspotRanges.push({ x: x, y: y, radius: radius });
    DebugGraphics.redraw(scene);
  }

  static addHotspotRectOutline(scene, rect) {
    getStore().hotspotRects.push(rect);
    DebugGraphics.redraw(scene);
  }

  static redraw(scene) {
    if (!scene) {
      return;
    }

    if (!scene.debugOutlineGfx) {
      scene.debugOutlineGfx = scene.add.graphics().setDepth(11);
    }

    const gfx = scene.debugOutlineGfx;
    const store = getStore();
    gfx.clear();

    store.hitboxTargets.forEach(function (entry) {
      if (!isDebugEnabled(entry.kind)) {
        return;
      }

      const go = entry.target;
      const body = go.body;

      gfx.lineStyle(2, 0xff0000, 1);
      const angle = go.rotation || 0;

      if (body) {
        if (Math.abs(angle) > 0.001) {
          DebugGraphics.strokeRotatedRect(
            gfx,
            go.x,
            go.y,
            go.displayWidth || go.width,
            go.displayHeight || go.height,
            angle
          );
          return;
        }

        if (body.updateFromGameObject) {
          body.updateFromGameObject();
        }

        const left = typeof body.left === "number" ? body.left : body.x - body.width / 2;
        const top = typeof body.top === "number" ? body.top : body.y - body.height / 2;
        gfx.strokeRect(left, top, body.width, body.height);
        return;
      }

      const width = go.displayWidth || go.width;
      const height = go.displayHeight || go.height;
      if (width && height) {
        if (Math.abs(angle) > 0.001) {
          DebugGraphics.strokeRotatedRect(gfx, go.x, go.y, width, height, angle);
          return;
        }

        gfx.strokeRect(go.x - width / 2, go.y - height / 2, width, height);
      }
    });

    if (!isDebugEnabled("showHotspots")) {
      return;
    }

    store.hotspotRanges.forEach(function (range) {
      gfx.fillStyle(0xff0000, 0.08);
      gfx.fillCircle(range.x, range.y, range.radius);
      gfx.lineStyle(2, 0xff0000, 0.9);
      gfx.strokeCircle(range.x, range.y, range.radius);
    });

    store.hotspotRects.forEach(function (rect) {
      gfx.fillStyle(0xff0000, 0.08);
      gfx.fillRect(rect.left, rect.top, rect.width, rect.height);
      gfx.lineStyle(2, 0xff0000, 0.9);
      gfx.strokeRect(rect.left, rect.top, rect.width, rect.height);
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
