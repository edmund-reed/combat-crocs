// Weapon Menu Manager for Combat Crocs

import { Config } from "@config";
import { UITextHelpers } from "./ui-helpers.js";
import { TurnManager } from "@utils";
import UIManager from "./ui.js";

class WeaponMenuManager {
  static createWeaponSelectIcon(scene) {
    const iconX = Config.GAME_WIDTH - 100; // Moved way right for definite gap
    const iconY = 18; // Moved up to center with weapon text
    const icon = scene.add.graphics().fillStyle(0xffd23f);

    // Burger menu: 3 horizontal lines stacked vertically
    icon.fillRect(iconX, iconY, 18, 3); // Top line
    icon.fillRect(iconX, iconY + 6, 18, 3); // Middle line
    icon.fillRect(iconX, iconY + 12, 18, 3); // Bottom line

    icon
      .setInteractive(new Phaser.Geom.Rectangle(iconX - 5, iconY - 5, 28, 23), Phaser.Geom.Rectangle.Contains)
      .on("pointerdown", (_, __, ___, event) => {
        event.stopPropagation();
        // Prevent weapon switching after firing
        if (scene.turnManager.weaponLocked) {
          console.log("⚠️ Weapon locked - cannot change after firing");
          return;
        }
        this.showWeaponSelectMenu(scene);
      });

    scene.weaponSelectIcon = icon;
  }

  static showWeaponSelectMenu(scene) {
    if (scene.gameEnded || scene.weaponMenu) return;

    const { GAME_WIDTH: w, GAME_HEIGHT: h } = Config;
    const menuDepth = 1001;
    const currentWeapon = scene.turnManager.getCurrentWeapon();
    const currentPlayerIndex = scene.turnManager.getCurrentPlayerIndex();
    const currentPlayer = scene.players[currentPlayerIndex];

    console.log(`🎮 Opening menu - Player Index: ${currentPlayerIndex}, Player ID: ${currentPlayer?.id}`);

    // Generate weapon list with positions
    const weapons = Object.keys(Config.WEAPON_CONFIGS).map((key, i) => [key, key, h / 2 - 58 + i * 30]);

    const elements = {
      overlay: UIManager.createModalOverlay(scene, () => this.hideWeaponSelectMenu(scene)),
      menuBg: scene.add
        .graphics()
        .setDepth(menuDepth + 1)
        .fillStyle(0x333333, 0.95)
        .fillRoundedRect(w / 2 - 150, h / 2 - 100, 300, 180, 10)
        .lineStyle(3, 0xffd23f)
        .strokeRoundedRect(w / 2 - 150, h / 2 - 100, 300, 180, 10),
      title: UITextHelpers.primaryText(scene, w / 2, h / 2 - 80, "Select Weapon", 18).setDepth(menuDepth + 2),
    };

    // Create weapon buttons with upgrade info
    // Modal left edge is at w/2 - 150, so with 20px padding, start text at w/2 - 130
    weapons.forEach(([label, type, y]) => {
      const buttonElements = this.createWeaponButton(
        scene,
        w / 2 - 130, // 20px padding from modal left edge
        y,
        label,
        type,
        currentWeapon === type,
        currentPlayer,
        menuDepth + 3,
      );
      elements[`${label.toLowerCase()}Btn`] = buttonElements.button;
      elements[`${label.toLowerCase()}Info`] = buttonElements.info;
    });

    scene.weaponMenu = elements;
  }

  static createWeaponButton(scene, x, y, label, weaponType, isSelected, currentPlayer, depth = 0) {
    const stats = currentPlayer?.weaponStats?.[weaponType];
    const level = stats?.level || 1;
    const xp = stats?.xp || 0;
    const config = Config.WEAPON_CONFIGS[weaponType];
    const isMaxLevel = level >= (config.upgrades?.maxLevel || 3);
    const nextLevelXP = config.upgrades?.xpThresholds[level - 1];

    const stars = "⭐".repeat(level);
    const mainText = `${isSelected ? "▶ " : ""}${label} ${stars}`;
    const xpText = isMaxLevel ? "MAX" : `${Math.floor(xp)}/${nextLevelXP} XP`;
    const xpOffset = ((isSelected ? 2 : 0) + label.length + 1) * 8 + level * 20 + 12;

    const button = UITextHelpers.createStatusText(
      scene,
      x,
      y,
      mainText,
      isSelected ? "#00FF00" : UITextHelpers.SECONDARY_COLOR,
      14,
      0,
    )
      .setInteractive()
      .setDepth(depth)
      .on("pointerdown", (_, __, ___, event) => {
        event.stopPropagation();
        scene.turnManager.setCurrentWeapon(weaponType);
        TurnManager.updateWeaponDisplay(scene);
        WeaponMenuManager.hideWeaponSelectMenu(scene);
      });

    const info = UITextHelpers.createStatusText(scene, x + xpOffset, y, xpText, "#888888", 14, 0).setDepth(depth);

    return { button, info };
  }

  static hideWeaponSelectMenu(scene) {
    if (!scene.weaponMenu) return;

    UIManager.clearModalOverlays(scene);

    if (scene.inputManagerBackup) {
      scene.input.on("pointermove", scene.inputManagerBackup.aimingHandler);
      scene.input.on("pointerdown", scene.inputManagerBackup.shootingHandler);
      scene.inputManagerBackup = null;
    }

    Object.values(scene.weaponMenu).forEach(el => el?.destroy?.());
    scene.weaponMenu = null;
  }
}

export default WeaponMenuManager;
