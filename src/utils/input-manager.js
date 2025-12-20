import { Config } from "@config";
import { UIManager } from "@ui";
import { WeaponManager } from "@utils";

class InputManager {
  static setupInput(scene) {
    scene.cursors = scene.input.keyboard.createCursorKeys();
    scene.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    scene.input.on("pointermove", pointer => this.handleAiming(scene, pointer), scene);
    scene.input.on("pointerdown", () => this.handleShooting(scene), scene);
    scene.events.on("turnChange", () => this.clearAimIndicator(scene));
    scene.input.keyboard.on("keydown-W", () => {
      if (!scene.turnManager.weaponLocked) UIManager.showWeaponSelectMenu(scene);
    });
  }

  static handleAiming(scene, pointer) {
    const currentPlayerIndex = scene.turnManager.getCurrentPlayerIndex();
    const player = scene.players[currentPlayerIndex];
    if (!player?.canShoot) return;
    player.aimAngle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
    this.updateAimIndicator(scene);
  }

  static handleAimingInput(scene, currentPlayer, cursors, isMoving) {
    if (!currentPlayer?.canShoot) return this.clearAimIndicator(scene);
    if (cursors.up.isDown) currentPlayer.aimAngle -= 0.026;
    if (cursors.down.isDown) currentPlayer.aimAngle += 0.026;
    if (!isMoving) this._updatePlayerFacing(currentPlayer);
    this.updateAimIndicator(scene);
  }

  static _updatePlayerFacing(player) {
    const aimTargetX = player.x + Math.cos(player.aimAngle) * 100;
    const shouldFaceLeft = aimTargetX < player.x;
    if (shouldFaceLeft !== player.facingLeft) {
      player.facingLeft = shouldFaceLeft;
      player.graphics.setFlipX(shouldFaceLeft);
    }
  }

  static handleShooting(scene) {
    if (UIManager.isModalOpen(scene)) return;

    const player = scene.players[scene.turnManager.getCurrentPlayerIndex()];
    const weapon = scene.turnManager.getCurrentWeapon();
    const isInProgress = scene.turnManager.isTurnInProgress();

    if (!player.canShoot || isInProgress || scene.turnManager.weaponAmmo[weapon] <= 0) {
      return;
    }

    const targetX = player.x + Math.cos(player.aimAngle) * 500;
    const targetY = player.y + Math.sin(player.aimAngle) * 500;
    this._executeShot(scene, player, weapon, targetX, targetY);
  }

  static _executeShot(scene, player, weapon, targetX, targetY) {
    scene.turnManager.weaponAmmo[weapon]--;
    scene.turnManager.weaponLocked = true;
    scene.canReviveThisTurn = false;

    // Record action for AI training
    scene.recorder?.recordAction(scene, {
      weapon: weapon,
      aimAngle: player.aimAngle,
      targetX: targetX,
      targetY: targetY,
      movementUsed: {
        left: scene.cursors?.left?.isDown ? 1 : 0,
        right: scene.cursors?.right?.isDown ? 1 : 0,
      },
    });

    WeaponManager.fireWeapon(scene, player, targetX, targetY, weapon);

    if (Config.WEAPON_CONFIGS[weapon].behaviorFlags.includes("timerExplosion")) {
      scene.turnManager.currentTurnTimer?.destroy();
      scene.turnManager.currentTurnTimer = null;
    } else if (scene.turnManager.weaponAmmo[weapon] <= 0) {
      scene.turnManager.endCurrentTurn();
    }

    this.clearAimIndicator(scene);
  }

  static updateAimIndicator(scene) {
    this.clearAimIndicator(scene);

    const player = scene.players[scene.turnManager.getCurrentPlayerIndex()];
    if (!player.canShoot) return;

    const distance = Math.max(110, 220 - Math.abs(player.body.velocity.y) * 3 - 40);
    const endX = player.x + Math.cos(player.aimAngle) * distance;
    const endY = player.y + Math.sin(player.aimAngle) * distance;

    scene.aimIndicator = scene.add
      .image(endX, endY, "crosshair")
      .setOrigin(0.5)
      .setDepth(200)
      .setScale(41 / scene.textures.get("crosshair").source[0].width);
  }

  static clearAimIndicator(scene) {
    scene.aimIndicator?.destroy();
    scene.aimIndicator = null;
  }

  static addProjectileTrail(scene, projectileBody) {
    scene.time.addEvent({
      delay: 100,
      repeat: 10,
      callback: () => {
        if (!projectileBody.destroyed) {
          const trail = scene.add.graphics({
            x: projectileBody.position.x,
            y: projectileBody.position.y,
          });
          trail.fillStyle(0xff4500).fillCircle(0, 0, 2);
          scene.tweens.add({
            targets: trail,
            alpha: 0,
            duration: 500,
            onComplete: () => trail && trail.destroy(),
          });
        }
      },
    });
  }
}

export default InputManager;
