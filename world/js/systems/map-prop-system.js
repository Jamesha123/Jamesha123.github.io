import { cacheBust, getObjectProperty, getObjectFeetPosition } from "../utils/helpers.js";
import { DebugGraphics } from "./debug-graphics.js";

export class MapPropSystem {
  static preload(scene, propConfigs) {
    propConfigs.forEach(function (prop) {
      scene.load.image("prop-" + prop.id, cacheBust(prop.image));
    });
  }

  static spawnFromMap(scene, content, world, map, mapConfig, mapTransitions) {
    world.propColliders = [];
    const layerName = mapConfig.propsLayer;
    if (!layerName) {
      return;
    }

    const layer = map.getObjectLayer(layerName);
    if (!layer) {
      return;
    }

    layer.objects.forEach(function (obj) {
      const propId = getObjectProperty(obj, "propId");
      if (!propId) {
        return;
      }

      const propDef = content.getProp(propId);
      if (!propDef) {
        console.warn("Missing content.json prop entry:", propId);
        return;
      }

      MapPropSystem.spawnProp(scene, world, obj, propDef, mapTransitions);
    });
  }

  static spawnProp(scene, world, obj, propDef, mapTransitions) {
    const placementWidth = obj.width || propDef.width || 16;
    const placementHeight = obj.height || propDef.height || 16;
    const feetPos = getObjectFeetPosition(obj, world.tileSize);
    const feetX = feetPos.x;
    const feetY = feetPos.y;
    const extraScale = MapPropSystem.readNumber(obj, "scale", propDef.scale ?? 1);
    const originX = propDef.originX ?? 0.5;
    const originY = propDef.originY ?? 1;
    const displayWidth = placementWidth * extraScale;
    const displayHeight = placementHeight * extraScale;

    const sprite = scene.add.image(feetX, feetY, "prop-" + propDef.id);
    const nativeWidth = sprite.frame.width || propDef.width || placementWidth;
    const nativeHeight = sprite.frame.height || propDef.height || placementHeight;
    sprite.setOrigin(originX, originY);
    sprite.setDisplaySize(displayWidth, displayHeight);
    sprite.setDepth(propDef.depth ?? 4);

    const hitboxOffsetX = MapPropSystem.readNumber(obj, "hitboxOffsetX", propDef.hitboxOffsetX ?? 0);
    const hitboxOffsetY = MapPropSystem.readNumber(obj, "hitboxOffsetY", propDef.hitboxOffsetY ?? 0);
    const showHitbox =
      getObjectProperty(obj, "showHitbox") ?? propDef.showHitbox ?? true;
    const propLeft = feetX - displayWidth * originX + hitboxOffsetX;
    const propTop = feetY - displayHeight * originY + hitboxOffsetY;
    const hitboxes = [];

    if (Array.isArray(propDef.hitboxes) && propDef.hitboxes.length > 0) {
      propDef.hitboxes.forEach(function (box) {
        hitboxes.push(
          MapPropSystem.spawnHitbox(scene, world, propLeft, propTop, displayWidth, displayHeight, box)
        );
      });
    } else {
      const sizeScaleX = placementWidth / nativeWidth;
      const sizeScaleY = placementHeight / nativeHeight;
      const bodyWidth = MapPropSystem.readNumber(
        obj,
        "bodyWidth",
        (propDef.defaultBodyWidth ?? nativeWidth * 0.67) * sizeScaleX
      );
      const bodyHeight = MapPropSystem.readNumber(
        obj,
        "bodyHeight",
        (propDef.defaultBodyHeight ?? 28) * sizeScaleY
      );
      const hitboxLift = MapPropSystem.readNumber(obj, "hitboxLift", propDef.hitboxLift ?? 8);
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

    const interaction = propDef.interaction;
    if (interaction && interaction.targetMap && mapTransitions) {
      mapTransitions.registerPropInteraction({
        x: feetX + (interaction.offsetX ?? 0),
        y: feetY + (interaction.offsetY ?? -32),
        reach: interaction.reach ?? 48,
        label: interaction.label || "Enter",
        targetMap: interaction.targetMap,
        spawnId: interaction.spawnId || "default",
        showOutline: interaction.showOutline !== false,
        returnState: {
          mapId: world.mapId,
          spawnId: interaction.returnSpawnId || "default",
        },
      });
    }

    return { sprite: sprite, hitboxes: hitboxes };
  }

  static spawnHitbox(scene, world, propLeft, propTop, displayWidth, displayHeight, box) {
    const width = box.w * displayWidth;
    const height = box.h * displayHeight;
    if (width <= 0 || height <= 0) {
      return null;
    }
    const usesCenter = box.origin === "center" || (box.angle && box.origin !== "topleft");
    let centerX;
    let centerY;

    if (usesCenter) {
      centerX = propLeft + box.x * displayWidth;
      centerY = propTop + box.y * displayHeight;
    } else {
      centerX = propLeft + box.x * displayWidth + width / 2;
      centerY = propTop + box.y * displayHeight + height / 2;
    }

    const hitbox = scene.add.zone(centerX, centerY, width, height);
    hitbox.setOrigin(0.5, 0.5);
    if (box.angle) {
      hitbox.setAngle(box.angle);
    }
    scene.physics.add.existing(hitbox, true);
    world.propColliders.push(hitbox);
    return hitbox;
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
