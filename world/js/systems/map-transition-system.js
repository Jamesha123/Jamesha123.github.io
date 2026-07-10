export class MapTransitionSystem {
  constructor(scene, content, world) {
    this.scene = scene;
    this.content = content;
    this.world = world;
    this.nearbyTarget = null;
    this.showOutlines = true;
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
    if (!this.showOutlines) {
      return false;
    }
    return target.showOutline !== false;
  }

  checkProximity(playerSprite, ui) {
    this.nearbyTarget = null;

    if (ui.isModalOpen() || !playerSprite) {
      return;
    }

    const playerX = playerSprite.x;
    const playerY = playerSprite.y;

    for (const interaction of this.world.propInteractions) {
      if (this.isWithinReach(playerX, playerY, interaction)) {
        this.nearbyTarget = interaction;
        ui.setHint("Press E, Enter, or Interact to " + interaction.label, true);
        return;
      }
    }

    for (const transition of this.world.transitions) {
      if (this.isWithinReach(playerX, playerY, transition)) {
        this.nearbyTarget = transition;
        ui.setHint("Press E, Enter, or Interact to " + transition.label, true);
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
    if (!this.nearbyTarget) {
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

    this.scene.scene.restart({
      mapId: targetMapId,
      spawnId: spawnId || null,
      returnState: returnState || null,
    });
  }

  buildReturnState(returnSpawnId) {
    return {
      mapId: this.world.mapId,
      spawnId: returnSpawnId || "default",
    };
  }

  static drawReachOutline(scene, x, y, reach) {
    const gfx = scene.add.graphics().setDepth(11);
    const drawOutline = function () {
      gfx.clear();
      gfx.fillStyle(0xff0000, 0.08);
      gfx.fillCircle(x, y, reach);
      gfx.lineStyle(2, 0xff0000, 1);
      gfx.strokeCircle(x, y, reach);
    };
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, drawOutline);
    drawOutline();
    return gfx;
  }

  static drawRectOutline(scene, centerX, centerY, width, height) {
    const gfx = scene.add.graphics().setDepth(11);
    const drawOutline = function () {
      gfx.clear();
      gfx.lineStyle(2, 0xff0000, 1);
      gfx.strokeRect(centerX - width / 2, centerY - height / 2, width, height);
    };
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, drawOutline);
    drawOutline();
    return gfx;
  }
}
