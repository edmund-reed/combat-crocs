// Weapon Upgrade Grid - RPG Inventory Style Interface
// Displays weapons as a grid of upgradeable tiles

import { Config } from "@config";
import UIManager from "./ui.js";

export class WeaponUpgradeGrid {
  static createGrid(scene, weapons, startX, startY, tileSize = 60, spacing = 2, depth = 0, currentWeapon = null) {
    const tileContainers = [];
    let currentY = startY;

    weapons.forEach(weaponData => {
      const rowContainer = this.createWeaponRow(
        scene,
        weaponData,
        startX,
        currentY,
        tileSize,
        spacing,
        depth,
        currentWeapon,
      );
      tileContainers.push(rowContainer);
      currentY += tileSize + spacing + 8; // Tile height + progress bar space + padding
    });

    return tileContainers;
  }

  static createWeaponRow(scene, weaponData, startX, rowY, tileSize, spacing, depth, currentWeapon = null) {
    const { weaponType, currentLevel, currentXP, xpThresholds, maxLevel } = weaponData;
    const config = Config.WEAPON_CONFIGS[weaponType];
    const isSelected = currentWeapon === weaponType;

    // Create row container to group all tiles for this weapon
    const rowContainer = scene.add
      .container(startX, rowY)
      .setDepth(depth)
      .setAlpha(isSelected ? 1.0 : 0.5);

    // Create tiles for each level and add them to the row container
    for (let level = 1; level <= maxLevel; level++) {
      const x = (level - 1) * (tileSize + spacing);
      const tileContainer = this.createUpgradeTile(
        scene,
        weaponType,
        level,
        currentLevel,
        currentXP,
        xpThresholds,
        x,
        0,
        tileSize,
        0,
        isSelected,
        rowContainer,
      );
      rowContainer.add(tileContainer);
    }

    return rowContainer;
  }

  static createUpgradeTile(
    scene,
    weaponType,
    level,
    currentLevel,
    currentXP,
    xpThresholds,
    x,
    y,
    size,
    depth,
    isSelected = true,
    rowContainer = null,
  ) {
    const config = Config.WEAPON_CONFIGS[weaponType];
    const isCurrentLevel = level === currentLevel;
    const isUnlocked = level <= currentLevel;
    const isLocked = level > currentLevel;
    const finalOpacity = isLocked ? 0.6 : 1.0;

    const tileContainer = scene.add.container(0, 0).setDepth(depth).setAlpha(finalOpacity);

    const tileBg = scene.add.graphics().fillStyle(0x333333).fillRoundedRect(x, y, size, size, 4);

    const borderColor = isCurrentLevel && isSelected ? 0x00ff00 : 0xffffff;
    const borderAlpha = isLocked ? 0.3 : 1;
    tileBg.lineStyle(2, borderColor, borderAlpha).strokeRoundedRect(x, y, size, size, 4);

    tileContainer.add(tileBg);

    const TARGET_ICON_WIDTH = 52;
    const icon = scene.add.image(x + size / 2, y + size / 2 - 8, config.heldSpriteKey);
    const scale = TARGET_ICON_WIDTH / icon.width;
    icon.setScale(scale);
    if (isLocked) icon.setTint(0x666666);

    tileContainer.add(icon);

    const starText = "⭐".repeat(level);
    const stars = scene.add
      .text(x + size / 2, y + size - 17, starText, {
        font: "12px Arial",
        fill: isLocked ? "#666666" : "#FFD700",
      })
      .setOrigin(0.5);

    tileContainer.add(stars);

    if (isCurrentLevel && level < config.upgrades?.maxLevel) {
      const progress = this.calculateProgress(currentXP, xpThresholds[level - 1]);
      const progressHeight = 6;
      const progressBarElements = this.createProgressBar(
        scene,
        x,
        y + size - progressHeight,
        size,
        progressHeight,
        progress,
        0, // No separate depth - container handles layering
        1.0, // No separate alpha - container handles transparency
        isSelected,
      );
      progressBarElements.forEach(el => tileContainer.add(el));
    }

    const hitArea = scene.add
      .graphics()
      .fillStyle(0x000000, 0)
      .fillRect(x, y, size, size)
      .setInteractive(new Phaser.Geom.Rectangle(x, y, size, size), Phaser.Geom.Rectangle.Contains)
      .on("pointerdown", (pointer, localX, localY, event) => {
        event.stopPropagation();
        this.handleTileClick(scene, weaponType);
      });

    if (rowContainer) {
      const originalAlpha = rowContainer.alpha;
      hitArea.on("pointerover", () => rowContainer.setAlpha(1.0));
      hitArea.on("pointerout", () => rowContainer.setAlpha(originalAlpha));
    }

    tileContainer.add(hitArea);
    return tileContainer;
  }

  static calculateProgress(currentXP, requiredXP) {
    return Math.min(currentXP / requiredXP, 1.0);
  }

  static createProgressBar(scene, x, y, width, height, progress, depth, finalOpacity = 1.0, isSelected = true) {
    const bgColor = isSelected ? 0x006400 : 0x666666;
    const fillColor = isSelected ? 0x00ff00 : 0x999999;

    const bg = scene.add.graphics().fillStyle(bgColor).fillRect(x, y, width, height);
    const fillWidth = width * progress;
    const fill = scene.add.graphics().fillStyle(fillColor).fillRect(x, y, fillWidth, height);
    const border = scene.add.graphics().lineStyle(1, 0xffffff).strokeRect(x, y, width, height);

    return [bg, fill, border];
  }

  static handleTileClick(scene, weaponType) {
    scene.turnManager.setCurrentWeapon(weaponType);

    const currentPlayerIndex = scene.turnManager.getCurrentPlayerIndex();
    const weaponConfig = Config.WEAPON_CONFIGS[weaponType];
    scene.players.forEach((p, i) => {
      if (p.weaponSprite && weaponConfig?.hasHeldSprite) {
        p.weaponSprite.setTexture(weaponConfig.heldSpriteKey);
        p.weaponSprite.setScale(weaponConfig.heldSpriteScale);
        p.weaponSprite.setVisible(i === currentPlayerIndex);
      } else {
        p.weaponSprite?.setVisible(false);
      }
    });

    if (scene.weaponMenu) {
      UIManager.clearModalOverlays(scene);
      Object.values(scene.weaponMenu).forEach(el => UIManager.destroyElement(el));
      scene.weaponMenu = null;
    }
  }
}
