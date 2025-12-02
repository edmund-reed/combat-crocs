import { Config } from "@config";
import { UIManager } from "@ui";
import { WeaponManager } from "@utils";

class InputManager {
  static setupInput(scene) {
    scene.cursors = scene.input.keyboard.createCursorKeys();
    scene.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    scene.input.on("pointermove", pointer => this.handleAiming(scene, pointer), scene);
    scene.input.on("pointerdown", pointer => this.handleShooting(scene, pointer), scene);
    scene.events.on("turnChange", () => this.clearAimLine(scene));

    scene.input.keyboard.on("keydown-W", () => {
      if (!scene.turnManager.weaponLocked) UIManager.showWeaponSelectMenu(scene);
    });
  }

  static handleAiming(scene, pointer) {
    if (!scene.gameStarted) return;

    const currentPlayerIndex = scene.turnManager.getCurrentPlayerIndex();
    const player = scene.players[currentPlayerIndex];
    if (!player.canShoot) return;

    player.aimAngle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
    this.updateAimLine(scene);
  }

  static handleShooting(scene, pointer) {
    if (UIManager.isModalOpen(scene)) return;

    const currentPlayerIndex = scene.turnManager.getCurrentPlayerIndex();
    const player = scene.players[currentPlayerIndex];
    const currentWeapon = scene.turnManager.getCurrentWeapon();

    if (!player.canShoot || scene.turnManager.isTurnInProgress()) return;

    console.log(`Player ${player.id} shooting ${currentWeapon} at (${pointer.worldX}, ${pointer.worldY})`);

    scene.turnManager.weaponAmmo[currentWeapon]--;
    console.log(`Ammo for ${currentWeapon}: ${scene.turnManager.weaponAmmo[currentWeapon]} remaining`);
    scene.turnManager.weaponLocked = true;

    WeaponManager.fireWeapon(scene, player, pointer.worldX, pointer.worldY, currentWeapon);

    const { behaviorFlags } = Config.WEAPON_CONFIGS[currentWeapon];
    if (!behaviorFlags.includes("timerExplosion") && scene.turnManager.weaponAmmo[currentWeapon] <= 0) {
      scene.turnManager.endCurrentTurn();
    }

    this.clearAimLine(scene);
  }

  static getCursors = scene => scene.cursors;
  static getSpaceKey = scene => scene.spaceKey;

  static updateAimLine(scene) {
    this.clearAimLine(scene);

    const player = scene.players[scene.turnManager.getCurrentPlayerIndex()];
    if (!player.canShoot) return;

    const { x, y } = player;
    const { worldX, worldY } = scene.input.activePointer;
    const angle = Phaser.Math.Angle.Between(x, y, worldX, worldY);
    const lineLength = Math.max(150, 300 - Math.abs(player.body.velocity.y) * 5);
    const endX = x + Math.cos(angle) * lineLength;
    const endY = y + Math.sin(angle) * lineLength;

    scene.aimLine = scene.add.graphics().lineStyle(4, 0xffd23f);
    scene.aimLine.moveTo(x, y).lineTo(endX, endY).strokePath();
    scene.aimLine.moveTo(endX, endY);
    scene.aimLine.lineTo(endX - Math.cos(angle - Math.PI / 6) * 12, endY - Math.sin(angle - Math.PI / 6) * 12);
    scene.aimLine.moveTo(endX, endY);
    scene.aimLine.lineTo(endX - Math.cos(angle + Math.PI / 6) * 12, endY - Math.sin(angle + Math.PI / 6) * 12);
    scene.aimLine.strokePath();
  }

  static clearAimLine(scene) {
    scene.aimLine?.destroy();
    scene.aimLine = null;
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
