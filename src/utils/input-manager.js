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
    if (!currentPlayer?.canShoot) {
      this.clearAimIndicator(scene);
      return;
    }

    // Keyboard aiming adjustments
    if (cursors.up.isDown) currentPlayer.aimAngle -= 0.026;
    if (cursors.down.isDown) currentPlayer.aimAngle += 0.026;

    // Update player direction when not moving
    if (!isMoving) {
      const aimTargetX = currentPlayer.x + Math.cos(currentPlayer.aimAngle) * 100;
      const shouldFaceLeft = aimTargetX < currentPlayer.x;
      if (shouldFaceLeft !== currentPlayer.facingLeft) {
        currentPlayer.facingLeft = shouldFaceLeft;
        currentPlayer.graphics.setFlipX(shouldFaceLeft);
      }
    }

    this.updateAimIndicator(scene);
  }

  static handleShooting(scene) {
    if (UIManager.isModalOpen(scene)) return;

    const currentPlayerIndex = scene.turnManager.getCurrentPlayerIndex();
    const player = scene.players[currentPlayerIndex];
    const currentWeapon = scene.turnManager.getCurrentWeapon();

    if (
      !player.canShoot ||
      scene.turnManager.isTurnInProgress() ||
      scene.turnManager.weaponAmmo[currentWeapon] <= 0
    )
      return;

    // Calculate target position from aim angle (supports both mouse and keyboard aiming)
    const shootDistance = 500;
    const targetX = player.x + Math.cos(player.aimAngle) * shootDistance;
    const targetY = player.y + Math.sin(player.aimAngle) * shootDistance;

    scene.turnManager.weaponAmmo[currentWeapon]--;
    scene.turnManager.weaponLocked = true;
    scene.canReviveThisTurn = false;

    WeaponManager.fireWeapon(scene, player, targetX, targetY, currentWeapon);

    const { behaviorFlags } = Config.WEAPON_CONFIGS[currentWeapon];

    // Cancel turn timer for delayed explosion weapons to prevent race condition
    if (behaviorFlags.includes("timerExplosion")) {
      scene.turnManager.currentTurnTimer?.destroy();
      scene.turnManager.currentTurnTimer = null;
    } else if (scene.turnManager.weaponAmmo[currentWeapon] <= 0) {
      scene.turnManager.endCurrentTurn();
    }

    this.clearAimIndicator(scene);
  }

  static getCursors = scene => scene.cursors;
  static getSpaceKey = scene => scene.spaceKey;

  static updateAimIndicator(scene) {
    this.clearAimIndicator(scene);

    const player = scene.players[scene.turnManager.getCurrentPlayerIndex()];
    if (!player.canShoot) return;

    const { x, y } = player;
    const angle = player.aimAngle; // Use player's aim angle (set by mouse or keyboard)

    // Place crosshair closer than max firing distance for a more Worms-like feel
    // (and slightly closer still per tuning)
    const crosshairDistance = Math.max(110, 220 - Math.abs(player.body.velocity.y) * 3 - 40);
    const endX = x + Math.cos(angle) * crosshairDistance;
    const endY = y + Math.sin(angle) * crosshairDistance;

    // Worms-style crosshair at the end of the aim line
    const crosshair = scene.add.image(endX, endY, "crosshair").setOrigin(0.5).setDepth(200);
    const targetSizePx = 41;
    crosshair.setScale(targetSizePx / crosshair.width);
    scene.aimIndicator = crosshair;
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
          trail.fillStyle(0xff4500);
          trail.fillCircle(0, 0, 2);
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
