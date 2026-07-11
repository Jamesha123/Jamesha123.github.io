import { getObjectProperty } from "../utils/helpers.js";
import { DebugGraphics } from "./debug-graphics.js";
import { MapPropSystem } from "./map-prop-system.js";

export class FurnitureSystem {
  static shouldCollide(obj, furnitureDef) {
    const collides = getObjectProperty(obj, "collides");
    if (collides === false || collides === "false") {
      return false;
    }
    if (furnitureDef.collides === false) {
      return false;
    }
    return true;
  }

  static spawnHitbox(scene, world, obj, furnitureDef) {
    if (!scene.physics || !scene.physics.add) {
      return [];
    }

    if (!FurnitureSystem.shouldCollide(obj, furnitureDef)) {
      return [];
    }

    const width = obj.width || 16;
    const height = obj.height || 16;
    const feetX = obj.x + width / 2;
    const feetY = obj.y;
    const hitboxOffsetX = FurnitureSystem.readNumber(obj, "hitboxOffsetX", furnitureDef.hitboxOffsetX != null ? furnitureDef.hitboxOffsetX : 0);
    const hitboxOffsetY = FurnitureSystem.readNumber(obj, "hitboxOffsetY", furnitureDef.hitboxOffsetY != null ? furnitureDef.hitboxOffsetY : 0);
    const showHitboxProp = getObjectProperty(obj, "showHitbox");
    const showHitbox =
      showHitboxProp != null
        ? showHitboxProp
        : furnitureDef.showHitbox != null
          ? furnitureDef.showHitbox
          : true;
    const propLeft = obj.x + hitboxOffsetX;
    const propTop = obj.y - height + hitboxOffsetY;
    const hitboxes = [];

    if (Array.isArray(furnitureDef.hitboxes) && furnitureDef.hitboxes.length > 0) {
      furnitureDef.hitboxes.forEach(function (box) {
        const spawned = MapPropSystem.spawnHitbox(scene, world, propLeft, propTop, width, height, box);
        if (spawned) {
          hitboxes.push(spawned);
        }
      });
    } else {
      const bodyWidth = FurnitureSystem.readNumber(
        obj,
        "bodyWidth",
        width * (furnitureDef.bodyWidthRatio != null ? furnitureDef.bodyWidthRatio : 0.75)
      );
      const bodyHeight = FurnitureSystem.readNumber(
        obj,
        "bodyHeight",
        height * (furnitureDef.bodyHeightRatio != null ? furnitureDef.bodyHeightRatio : 0.35)
      );

      if (bodyWidth <= 0 || bodyHeight <= 0) {
        return [];
      }

      const hitboxLift = FurnitureSystem.readNumber(
        obj,
        "hitboxLift",
        height * (furnitureDef.hitboxLiftRatio != null ? furnitureDef.hitboxLiftRatio : 0.12)
      );
      const hitbox = scene.add.zone(
        feetX + hitboxOffsetX,
        feetY - bodyHeight - hitboxLift + hitboxOffsetY,
        bodyWidth,
        bodyHeight
      );
      scene.physics.add.existing(hitbox, true);
      world.propColliders.push(hitbox);
      hitboxes.push(hitbox);
    }

    if (showHitbox) {
      hitboxes.forEach(function (hitbox) {
        DebugGraphics.addHitboxOutline(scene, hitbox);
      });
    }

    return hitboxes;
  }

  static readNumber(obj, propertyName, fallback) {
    const value = getObjectProperty(obj, propertyName);
    if (value === null || value === undefined || value === "") {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
