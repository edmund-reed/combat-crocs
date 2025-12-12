import { Config } from "@config";
import { UISceneHelpers } from "@ui";
import { WeaponUpgradeGrid } from "./weapon-upgrade-grid.js";
import UIManager from "./ui.js";

class WeaponMenuManager {
  static createWeaponSelectIcon(scene) {
    const x = Config.GAME_WIDTH - 100,
      y = 18;
    const icon = scene.add.graphics().fillStyle(0xffd23f);
    icon
      .fillRect(x, y, 18, 3)
      .fillRect(x, y + 6, 18, 3)
      .fillRect(x, y + 12, 18, 3);
    icon
      .setInteractive(new Phaser.Geom.Rectangle(x - 5, y - 5, 28, 23), Phaser.Geom.Rectangle.Contains)
      .on("pointerdown", (_, __, ___, e) => {
        e.stopPropagation();
        if (!scene.turnManager.weaponLocked) this.showWeaponSelectMenu(scene);
      });
    scene.weaponSelectIcon = icon;
  }

  static showWeaponSelectMenu(scene) {
    if (scene.gameEnded || scene.weaponMenu) return;
    const { GAME_WIDTH: w, GAME_HEIGHT: h } = Config;
    const depth = 1001;
    const player = scene.players[scene.turnManager.getCurrentPlayerIndex()];
    const currentWeapon = scene.turnManager.getCurrentWeapon();

    const weapons = Object.keys(Config.WEAPON_CONFIGS).map(type => {
      const s = player?.weaponStats?.[type],
        c = Config.WEAPON_CONFIGS[type];
      return {
        weaponType: type,
        currentLevel: s?.level || 1,
        currentXP: s?.xp || 0,
        xpThresholds: c.upgrades?.xpThresholds || [30, 80],
        maxLevel: c.upgrades?.maxLevel || 3,
      };
    });

    const [tile, gap] = [100, 5];
    const [gridW, gridH] = [(tile + gap) * 3 - gap, weapons.length * (tile + 12)];
    const labelW = 60;
    const totalW = gridW + labelW;
    const [gx, gy] = [w / 2 - totalW / 2 + labelW, h / 2 - gridH / 2 + 20];

    const els = {
      overlay: UIManager.createModalOverlay(scene, () => this.hideWeaponSelectMenu(scene)),
      bg: scene.add
        .graphics()
        .setDepth(depth + 1)
        .fillStyle(0x333333, 0.95)
        .fillRoundedRect(w / 2 - totalW / 2 - 20, h / 2 - gridH / 2 - 40, totalW + 40, gridH + 80, 10)
        .lineStyle(3, 0xffd23f)
        .strokeRoundedRect(w / 2 - totalW / 2 - 20, h / 2 - gridH / 2 - 40, totalW + 40, gridH + 80, 10),
      title: UISceneHelpers.styledText(scene, w / 2, h / 2 - gridH / 2 - 15, "Weapons Menu", 18, 2).setDepth(
        depth + 2,
      ),
      grid: WeaponUpgradeGrid.createGrid(scene, weapons, gx, gy, tile, gap, depth + 3, currentWeapon),
      labels: weapons.map((d, i) =>
        scene.add
          .text(gx - 30, gy + i * (tile + 12) + tile / 2, d.weaponType.toUpperCase(), {
            font: "16px Arial",
            fill: d.weaponType === currentWeapon ? "#00FF00" : "#FFFFFF",
            stroke: "#000000",
            strokeThickness: 2,
          })
          .setOrigin(0.5)
          .setAngle(-90)
          .setDepth(depth + 4),
      ),
    };
    scene.weaponMenu = els;
  }

  static hideWeaponSelectMenu(scene) {
    if (!scene.weaponMenu) return;
    UIManager.clearModalOverlays(scene);
    if (scene.inputManagerBackup) {
      scene.input.on("pointermove", scene.inputManagerBackup.aimingHandler);
      scene.input.on("pointerdown", scene.inputManagerBackup.shootingHandler);
      scene.inputManagerBackup = null;
    }
    Object.values(scene.weaponMenu).forEach(el => UIManager.destroyElement(el));
    scene.weaponMenu = null;
  }
}

export default WeaponMenuManager;
