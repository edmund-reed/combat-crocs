// Weapon Menu Manager for Combat Crocs

import { Config } from "@config";
import { UITextHelpers } from "./ui-helpers.js";
import { WeaponUpgradeGrid } from "./weapon-upgrade-grid.js";
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
    const currentPlayerIndex = scene.turnManager.getCurrentPlayerIndex();
    const currentPlayer = scene.players[currentPlayerIndex];

    console.log(
      `🎮 Opening weapon upgrade grid - Player Index: ${currentPlayerIndex}, Player ID: ${currentPlayer?.id}`,
    );

    // Prepare weapon data for grid
    const weaponData = Object.keys(Config.WEAPON_CONFIGS).map(weaponType => {
      const stats = currentPlayer?.weaponStats?.[weaponType];
      const config = Config.WEAPON_CONFIGS[weaponType];
      return {
        weaponType,
        currentLevel: stats?.level || 1,
        currentXP: stats?.xp || 0,
        xpThresholds: config.upgrades?.xpThresholds || [30, 80],
        maxLevel: config.upgrades?.maxLevel || 3,
      };
    });

    // Calculate grid dimensions
    const tileSize = 100; // Larger tiles for better proportions and breathing room
    const spacing = 5;
    const gridWidth = (tileSize + spacing) * 3 - spacing; // 3 tiers per weapon
    const gridHeight = weaponData.length * (tileSize + 12); // More space for progress bars
    const labelSpace = 60; // Space for vertical weapon labels on the left
    const totalContentWidth = gridWidth + labelSpace; // Total width including labels
    const gridX = w / 2 - totalContentWidth / 2 + labelSpace; // Center grid with labels
    const gridY = h / 2 - gridHeight / 2 + 20; // Center vertically with title space

    const elements = {
      overlay: UIManager.createModalOverlay(scene, () => this.hideWeaponSelectMenu(scene)),
      menuBg: scene.add
        .graphics()
        .setDepth(menuDepth + 1)
        .fillStyle(0x333333, 0.95)
        .fillRoundedRect(
          w / 2 - totalContentWidth / 2 - 20,
          h / 2 - gridHeight / 2 - 40,
          totalContentWidth + 40,
          gridHeight + 80,
          10,
        )
        .lineStyle(3, 0xffd23f)
        .strokeRoundedRect(
          w / 2 - totalContentWidth / 2 - 20,
          h / 2 - gridHeight / 2 - 40,
          totalContentWidth + 40,
          gridHeight + 80,
          10,
        ),
      title: scene.add
        .text(w / 2, h / 2 - gridHeight / 2 - 15, "Weapons Menu", {
          font: "18px Arial",
          fill: "#FFFFFF",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(menuDepth + 2),
    };

    // Create upgrade grid with selected weapon highlighting
    const currentWeapon = scene.turnManager.getCurrentWeapon();
    const gridElements = WeaponUpgradeGrid.createGrid(
      scene,
      weaponData,
      gridX,
      gridY,
      tileSize,
      spacing,
      menuDepth + 3,
      currentWeapon, // Pass current weapon for row opacity
    );
    elements.grid = gridElements;

    // Create vertical weapon name labels (currentWeapon already declared above)
    const weaponLabels = [];

    weaponData.forEach((weaponDataItem, index) => {
      const { weaponType } = weaponDataItem;
      const isSelected = weaponType === currentWeapon;
      const labelY = gridY + index * (tileSize + 12) + tileSize / 2;
      const labelX = gridX - 30; // 30px to the left of grid

      const weaponLabel = scene.add
        .text(labelX, labelY, weaponType.toUpperCase(), {
          font: "16px Arial",
          fill: isSelected ? "#00FF00" : "#FFFFFF", // Green for selected, white for others
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setAngle(-90) // Rotate 90° counterclockwise for vertical text
        .setDepth(menuDepth + 4);

      weaponLabels.push(weaponLabel);
    });

    elements.weaponLabels = weaponLabels;

    scene.weaponMenu = elements;
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
