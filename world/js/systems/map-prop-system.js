import { cacheBust, getObjectProperty, getObjectFeetPosition } from "../utils/helpers.js?v=147";
import { DebugGraphics } from "./debug-graphics.js?v=147";
import { createWorldLabel } from "../ui/world-label.js?v=147";

export class MapPropSystem {
  static preload(scene, propConfigs) {
    propConfigs.forEach(function (prop) {
      scene.load.image("prop-" + prop.id, cacheBust(prop.image));
    });
  }

  static spawnFromMap(scene, content, world, map, mapConfig, mapTransitions, hotspots) {
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

      MapPropSystem.spawnProp(scene, content, world, obj, propDef, mapTransitions, hotspots);
    });
  }

  static spawnProp(scene, content, world, obj, propDef, mapTransitions, hotspots) {
    const preferConfigSize = propDef.preferConfigSize === true;
    const placementWidth = preferConfigSize
      ? propDef.width || obj.width || 16
      : obj.width || propDef.width || 16;
    const placementHeight = preferConfigSize
      ? propDef.height || obj.height || 16
      : obj.height || propDef.height || 16;
    const feetPos = getObjectFeetPosition(obj, world.tileSize);
    const spriteOffsetX = propDef.offsetX != null ? propDef.offsetX : 0;
    const spriteOffsetY = propDef.offsetY != null ? propDef.offsetY : 0;
    const feetX = feetPos.x + spriteOffsetX;
    const feetY = feetPos.y + spriteOffsetY;
    const extraScale = MapPropSystem.readNumber(obj, "scale", propDef.scale != null ? propDef.scale : 1);
    const originX = propDef.originX != null ? propDef.originX : 0.5;
    const originY = propDef.originY != null ? propDef.originY : 1;
    const displayWidth = placementWidth * extraScale;
    const displayHeight = placementHeight * extraScale;

    const sprite = scene.add.image(feetX, feetY, "prop-" + propDef.id);
    const nativeWidth = sprite.frame.width || propDef.width || placementWidth;
    const nativeHeight = sprite.frame.height || propDef.height || placementHeight;
    sprite.setOrigin(originX, originY);
    sprite.setDisplaySize(displayWidth, displayHeight);
    sprite.setDepth(propDef.depth != null ? propDef.depth : 4);

    const hitboxOffsetX = MapPropSystem.readNumber(
      obj,
      "hitboxOffsetX",
      propDef.hitboxOffsetX != null ? propDef.hitboxOffsetX : 0
    );
    const hitboxOffsetY = MapPropSystem.readNumber(
      obj,
      "hitboxOffsetY",
      propDef.hitboxOffsetY != null ? propDef.hitboxOffsetY : 0
    );
    const propLeft = feetX - displayWidth * originX + hitboxOffsetX;
    const propTop = feetY - displayHeight * originY + hitboxOffsetY;
    const hitboxes = [];

    if (Array.isArray(propDef.hitboxes) && propDef.hitboxes.length > 0) {
      propDef.hitboxes.forEach(function (box) {
        hitboxes.push(
          MapPropSystem.spawnHitbox(scene, world, propLeft, propTop, displayWidth, displayHeight, box)
        );
      });
    } else if (propDef.collision !== false) {
      const sizeScaleX = placementWidth / nativeWidth;
      const sizeScaleY = placementHeight / nativeHeight;
      const bodyWidth = MapPropSystem.readNumber(
        obj,
        "bodyWidth",
        MapPropSystem.resolveBodySize(
          propDef.hitboxWidth,
          propDef.defaultBodyWidth,
          nativeWidth * 0.67 * sizeScaleX
        )
      );
      const bodyHeight = MapPropSystem.readNumber(
        obj,
        "bodyHeight",
        MapPropSystem.resolveBodySize(
          propDef.hitboxHeight,
          propDef.defaultBodyHeight,
          (propDef.defaultBodyHeight != null ? propDef.defaultBodyHeight : 28) * sizeScaleY
        )
      );
      const hitboxLift = MapPropSystem.readNumber(
        obj,
        "hitboxLift",
        propDef.hitboxLift != null ? propDef.hitboxLift : 8
      );
      const hitbox = scene.add.zone(
        feetX + hitboxOffsetX,
        feetY - bodyHeight - hitboxLift + hitboxOffsetY,
        bodyWidth,
        bodyHeight
      );
      scene.physics.add.existing(hitbox, true);
      if (hitbox.body && hitbox.body.updateFromGameObject) {
        hitbox.body.updateFromGameObject();
      }
      world.propColliders.push(hitbox);
      hitboxes.push(hitbox);
    }

    hitboxes.forEach(function (hitbox) {
      if (hitbox) {
        DebugGraphics.addHitboxOutline(scene, hitbox, "showProps");
      }
    });

    const interaction = propDef.interaction;
    if (interaction && interaction.targetMap && mapTransitions) {
      mapTransitions.registerPropInteraction({
        x: feetX + (interaction.offsetX != null ? interaction.offsetX : 0),
        y: feetY + (interaction.offsetY != null ? interaction.offsetY : -32),
        reach: interaction.reach != null ? interaction.reach : 48,
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

    if (propDef.hotspotId && hotspots) {
      MapPropSystem.registerPropHotspot(
        scene,
        content,
        hotspots,
        world,
        propDef,
        obj,
        feetX,
        feetY,
        displayWidth,
        displayHeight,
        originX,
        originY
      );
    }

    return { sprite: sprite, hitboxes: hitboxes };
  }

  static registerPropHotspot(
    scene,
    content,
    hotspots,
    world,
    propDef,
    obj,
    feetX,
    feetY,
    displayWidth,
    displayHeight,
    originX,
    originY
  ) {
    const hotspotContent = content.getHotspot(propDef.hotspotId);
    if (!hotspotContent) {
      console.warn("Missing hotspot content for prop:", propDef.id, propDef.hotspotId);
      return;
    }

    const hotspotOffsetX = MapPropSystem.readNumber(
      obj,
      "hotspotOffsetX",
      propDef.hotspotOffsetX != null ? propDef.hotspotOffsetX : 0
    );
    const hotspotOffsetY = MapPropSystem.readNumber(
      obj,
      "hotspotOffsetY",
      propDef.hotspotOffsetY != null ? propDef.hotspotOffsetY : 0
    );
    const reachTiles = MapPropSystem.readNumber(
      obj,
      "hotspotReach",
      propDef.hotspotReach != null ? propDef.hotspotReach : 2
    );
    const spriteCenterX = feetX + (0.5 - originX) * displayWidth;
    const spriteCenterY = feetY + (0.5 - originY) * displayHeight;
    const hotspotX = spriteCenterX + hotspotOffsetX;
    const hotspotY = spriteCenterY + hotspotOffsetY;
    const reach = world.tileSize * reachTiles;

    hotspots.registerRuntimeHotspot(
      Object.assign({}, hotspotContent, {
        x: hotspotX,
        y: hotspotY,
        reach: reach,
        sourcePropId: propDef.id,
      })
    );

    DebugGraphics.addHotspotRangeOutline(scene, hotspotX, hotspotY, reach);

    const labelText = propDef.label || hotspotContent.label;
    if (labelText) {
      const gap = propDef.labelGap != null ? propDef.labelGap : 4;
      const labelOffsetX = MapPropSystem.readNumber(
        obj,
        "labelOffsetX",
        propDef.labelOffsetX != null ? propDef.labelOffsetX : 0
      );
      const labelOffsetY = MapPropSystem.readNumber(
        obj,
        "labelOffsetY",
        propDef.labelOffsetY != null ? propDef.labelOffsetY : 0
      );
      const spriteTop = feetY - displayHeight * originY;
      const labelX = Math.round(hotspotX + labelOffsetX);
      const labelY = Math.round(spriteTop - gap + labelOffsetY);
      const label = createWorldLabel(scene, labelX, labelY, labelText, {
        fontSize: propDef.labelFontSize,
      });
      if (label) {
        if (!world.propLabels) {
          world.propLabels = [];
        }
        world.propLabels.push(label);
      }
    }
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
    if (hitbox.body && hitbox.body.updateFromGameObject) {
      hitbox.body.updateFromGameObject();
    }
    world.propColliders.push(hitbox);
    return hitbox;
  }

  static resolveBodySize(explicitSize, legacyDefault, fallback) {
    if (explicitSize != null) {
      return explicitSize;
    }
    if (legacyDefault != null) {
      return legacyDefault;
    }
    return fallback;
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
