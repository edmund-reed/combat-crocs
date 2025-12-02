// Input management utilities for Combat Crocs

import { Config } from "@config";
import { UIManager } from "@ui";
import { WeaponManager } from "@utils";

class InputManager {
  // Set up keyboard and mouse controls for the scene
  static setupInput(scene) {
    // Keyboard controls
    scene.cursors = scene.input.keyboard.createCursorKeys();
    scene.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Mouse aiming and shooting
    scene.input.on("pointermove", pointer => this.handleAiming(scene, pointer), scene);
    scene.input.on("pointerdown", pointer => this.handleShooting(scene, pointer), scene);

    // Clear aim line on turn change
    scene.events.on("turnChange", () => {
      InputManager.clearAimLine(scene);
    });

    // Keyboard shortcuts
    scene.input.keyboard.on("keydown-W", () => {
      if (!scene.turnManager.weaponLocked) {
        UIManager.showWeaponSelectMenu(scene);
      }
    });
  }

  // Handle mouse aiming calculations
  static handleAiming(scene, pointer) {
    if (!scene.gameStarted) return;

    const currentPlayerIndex = scene.turnManager.getCurrentPlayerIndex();
    if (!scene.players[currentPlayerIndex].canShoot) return;

    const player = scene.players[currentPlayerIndex];
    const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
    player.aimAngle = angle;

    // Update aim line when mouse moves
    InputManager.updateAimLine(scene);
  }

  // Handle shooting mechanics
  static handleShooting(scene, pointer) {
    // Prevent shooting while any modal overlay is active
    if (UIManager.isModalOpen(scene)) return;

    const currentPlayerIndex = scene.turnManager.getCurrentPlayerIndex();
    const player = scene.players[currentPlayerIndex];
    const currentWeapon = scene.turnManager.getCurrentWeapon();
    const turnInProgress = scene.turnManager.isTurnInProgress();

    if (!player.canShoot || turnInProgress) {
      return;
    }

    console.log(`Player ${player.id} shooting ${currentWeapon} at (${pointer.worldX}, ${pointer.worldY})`);

    // Decrement weapon ammo
    scene.turnManager.weaponAmmo[currentWeapon]--;
    console.log(`Ammo for ${currentWeapon}: ${scene.turnManager.weaponAmmo[currentWeapon]} remaining`);

    // Lock weapon selection after firing (can't change weapons mid-turn)
    scene.turnManager.weaponLocked = true;

    // Create weapon shot using data-driven dispatch system (MUST COME FIRST)
    WeaponManager.fireWeapon(scene, player, pointer.worldX, pointer.worldY, currentWeapon);

    // Behavior-driven turn ending (AFTER weapon fires)
    const weaponConfig = Config.WEAPON_CONFIGS[currentWeapon];
    if (weaponConfig.behaviorFlags.includes("timerExplosion")) {
      // Weapons with timer explosions wait for detonation (like grenades)
    } else {
      // All other weapons: end turn immediately if no ammo left
      if (scene.turnManager.weaponAmmo[currentWeapon] <= 0) {
        scene.turnManager.endCurrentTurn();
      }
    }

    // Each weapon manages its own canShoot/canMove state based on config

    // Clear aim line
    InputManager.clearAimLine(scene);
  }

  // Get current cursor keys for movement handling
  static getCursors(scene) {
    return scene.cursors;
  }

  // Get space key for jumping
  static getSpaceKey(scene) {
    return scene.spaceKey;
  }

  // Update aiming line graphics (moved from UI for input cohesion)
  static updateAimLine(scene) {
    this.clearAimLine(scene);

    const currentPlayerIndex = scene.turnManager.getCurrentPlayerIndex();
    if (!scene.players[currentPlayerIndex].canShoot) return;

    const player = scene.players[currentPlayerIndex];
    const mouse = scene.input.activePointer;
    const angle = Phaser.Math.Angle.Between(player.x, player.y, mouse.worldX, mouse.worldY);

    scene.aimLine = scene.add.graphics().lineStyle(4, 0xffd23f).moveTo(player.x, player.y);

    const lineLength = Math.max(150, 300 - Math.abs(player.body.velocity.y) * 5);
    const endX = player.x + Math.cos(angle) * lineLength;
    const endY = player.y + Math.sin(angle) * lineLength;

    scene.aimLine.lineTo(endX, endY).strokePath();

    // Add arrowhead
    scene.aimLine.moveTo(endX, endY);
    scene.aimLine.lineTo(endX - Math.cos(angle - Math.PI / 6) * 12, endY - Math.sin(angle - Math.PI / 6) * 12);
    scene.aimLine.moveTo(endX, endY);
    scene.aimLine.lineTo(endX - Math.cos(angle + Math.PI / 6) * 12, endY - Math.sin(angle + Math.PI / 6) * 12);
    scene.aimLine.strokePath();
  }

  // Clear aiming line graphics
  static clearAimLine(scene) {
    if (scene.aimLine) {
      scene.aimLine.destroy();
      scene.aimLine = null;
    }
  }

  // Add visual trail to projectile (called by WeaponManager)
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
