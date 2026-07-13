import { showHitboxesEnabled } from "./debug-graphics.js";

export class MapTransitionSystem {
  constructor(scene, content, world) {
    this.scene = scene;
    this.content = content;
    this.world = world;
    this.nearbyTarget = null;
    this.pendingTransition = false;
  }

  registerTransition(transition) {
    this.world.transitions.push(transition);
    if (this.shouldShowOutline(transition)) {
      MapTransitionSystem.drawRectOutline(
        this.scene,
        transition.x,
        transition.y,
        transition.width,
        transition.height
      );
    }
  }

  registerPropInteraction(interaction) {
    this.world.propInteractions.push(interaction);
    if (this.shouldShowOutline(interaction)) {
      MapTransitionSystem.drawReachOutline(
        this.scene,
        interaction.x,
        interaction.y,
        interaction.reach || this.world.tileSize * 1.5
      );
    }
  }

  shouldShowOutline(target) {
    if (!showHitboxesEnabled()) {
      return false;
    }
    return target.showOutline !== false;
  }

  checkProximity(playerSprite, ui) {
    this.nearbyTarget = null;

    if (ui.isModalOpen() || ui.isMapFading() || !playerSprite) {
      return;
    }

    const playerX = playerSprite.x;
    const playerY = playerSprite.y;

    for (const interaction of this.world.propInteractions) {
      if (this.isWithinReach(playerX, playerY, interaction)) {
        this.nearbyTarget = interaction;
        ui.setInteractPrompt(interaction.label.toLowerCase());
        return;
      }
    }

    for (const transition of this.world.transitions) {
      if (this.isWithinReach(playerX, playerY, transition)) {
        this.nearbyTarget = transition;
        ui.setInteractPrompt(transition.label.toLowerCase());
        return;
      }
    }
  }

  isWithinReach(playerX, playerY, target) {
    if (target.width && target.height) {
      const left = target.x - target.width / 2;
      const right = target.x + target.width / 2;
      const top = target.y - target.height / 2;
      const bottom = target.y + target.height / 2;
      return playerX >= left && playerX <= right && playerY >= top && playerY <= bottom;
    }

    const reach = target.reach || this.world.tileSize * 1.5;
    return Math.hypot(playerX - target.x, playerY - target.y) <= reach;
  }

  tryTransition() {
    if (!this.nearbyTarget || this.pendingTransition) {
      return false;
    }

    this.transitionTo(
      this.nearbyTarget.targetMap,
      this.nearbyTarget.spawnId,
      this.nearbyTarget.returnState
    );
    return true;
  }

  transitionTo(targetMapId, spawnId, returnState) {
    const targetMap = this.content.getMap(targetMapId);
    if (!targetMap) {
      console.warn("Missing map config:", targetMapId);
      return;
    }

    if (this.pendingTransition) {
      return;
    }

    this.pendingTransition = true;
    this.nearbyTarget = null;

    const scene = this.scene;
    if (scene.player) {
      scene.player.stop();
    }

    const ui = scene.ui;
    ui.fadeOutForMapTransition().then(function () {
      scene.scene.restart({
        mapId: targetMapId,
        spawnId: spawnId || null,
        returnState: returnState || null,
        fadeIn: true,
      });
    });
  }

  buildReturnState(returnSpawnId) {
    return {
      mapId: this.world.mapId,
      spawnId: returnSpawnId || "default",
    };
  }

  static redrawOutlines(scene, world) {
    if (scene.transitionOutlineGfx) {
      scene.transitionOutlineGfx.clear();
    }

    if (!showHitboxesEnabled()) {
      return;
    }

    world.propInteractions.forEach(function (interaction) {
      if (interaction.showOutline === false) {
        return;
      }
      MapTransitionSystem.drawReachOutline(
        scene,
        interaction.x,
        interaction.y,
        interaction.reach || world.tileSize * 1.5
      );
    });

    world.transitions.forEach(function (transition) {
      if (transition.showOutline === false) {
        return;
      }
      MapTransitionSystem.drawRectOutline(
        scene,
        transition.x,
        transition.y,
        transition.width,
        transition.height
      );
    });
  }

  static drawReachOutline(scene, x, y, reach) {
    if (!scene.transitionOutlineGfx) {
      scene.transitionOutlineGfx = scene.add.graphics().setDepth(11);
    }

    const gfx = scene.transitionOutlineGfx;
    gfx.fillStyle(0xff0000, 0.08);
    gfx.fillCircle(x, y, reach);
    gfx.lineStyle(2, 0xff0000, 1);
    gfx.strokeCircle(x, y, reach);
  }

  static drawRectOutline(scene, centerX, centerY, width, height) {
    if (!scene.transitionOutlineGfx) {
      scene.transitionOutlineGfx = scene.add.graphics().setDepth(11);
    }

    const gfx = scene.transitionOutlineGfx;
    gfx.lineStyle(2, 0xff0000, 1);
    gfx.strokeRect(centerX - width / 2, centerY - height / 2, width, height);
  }
}
