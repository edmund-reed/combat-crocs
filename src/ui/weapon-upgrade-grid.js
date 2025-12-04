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
      const x = (level - 1) * (tileSize + spacing); // Relative to row container
      const tileContainer = this.createUpgradeTile(
        scene,
        weaponType,
        level,
        currentLevel,
        currentXP,
        xpThresholds,
        x, // Use relative positioning within row container
        0, // Relative to row container
        tileSize,
        0, // Depth handled by row container
        isSelected,
        rowContainer, // Pass row container for hover effects
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

    // Calculate final opacity based on new rules:
    // - Locked tiles: always 60% opacity (0.6) regardless of selection
    // - All unlocked tiles: 100% opacity (1.0 - fully visible) regardless of current level
    let finalOpacity = 0.6; // Base 60% opacity

    if (!isLocked) {
      // All unlocked tiles have full opacity regardless of current level
      finalOpacity = 1.0;
    }

    // Create container to group all tile elements and apply alpha to entire tile
    const tileContainer = scene.add.container(0, 0).setDepth(depth).setAlpha(finalOpacity);

    // Tile background - always gray
    const tileBg = scene.add
      .graphics()
      .fillStyle(0x333333) // No alpha here - container handles it
      .fillRoundedRect(x, y, size, size, 4);

    // Border - green for current level only when weapon is selected, white otherwise
    const borderColor = isCurrentLevel && isSelected ? 0x00ff00 : 0xffffff;
    const borderAlpha = isLocked ? 0.3 : 1; // Local alpha for locked state only
    tileBg.lineStyle(2, borderColor, borderAlpha).strokeRoundedRect(x, y, size, size, 4);

    tileContainer.add(tileBg);

    // Weapon icon - consistent absolute sizing regardless of source image dimensions
    const TARGET_ICON_WIDTH = 52;
    const icon = scene.add.image(x + size / 2, y + size / 2 - 8, config.heldSpriteKey);

    // Calculate scale to reach target width
    const scale = TARGET_ICON_WIDTH / icon.width;
    icon.setScale(scale);

    if (isLocked) {
      icon.setTint(0x666666); // Gray out locked icons
    }

    tileContainer.add(icon);

    // Star rating
    const starText = "⭐".repeat(level);
    const stars = scene.add
      .text(x + size / 2, y + size - 17, starText, {
        font: "12px Arial",
        fill: isLocked ? "#666666" : "#FFD700",
      })
      .setOrigin(0.5);

    tileContainer.add(stars);

    // Progress bar (only for current level) - inside tile, flush with bottom
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
        isSelected, // Pass selected state for color logic
      );
      // Add progress bar elements to container
      progressBarElements.forEach(el => tileContainer.add(el));
    }

    // Make tile interactive - add hit area to container
    const hitArea = scene.add
      .graphics()
      .fillStyle(0x000000, 0) // Invisible
      .fillRect(x, y, size, size)
      .setInteractive(new Phaser.Geom.Rectangle(x, y, size, size), Phaser.Geom.Rectangle.Contains)
      .on("pointerdown", (pointer, localX, localY, event) => {
        event.stopPropagation(); // Prevent event bubbling to avoid accidental shooting
        this.handleTileClick(scene, weaponType);
      });

    // Add hover effects for row transparency removal
    if (rowContainer) {
      const originalAlpha = rowContainer.alpha;
      hitArea.on("pointerover", () => {
        rowContainer.setAlpha(1.0); // Remove transparency on hover
      });
      hitArea.on("pointerout", () => {
        rowContainer.setAlpha(originalAlpha); // Restore original transparency
      });
    }

    // Add hit area to container for proper z-index management
    tileContainer.add(hitArea);

    // Return single container per tile
    return tileContainer;
  }

  static calculateProgress(currentXP, requiredXP) {
    return Math.min(currentXP / requiredXP, 1.0);
  }

  static createProgressBar(scene, x, y, width, height, progress, depth, finalOpacity = 1.0, isSelected = true) {
    // When in a container, depth and alpha are handled by the container
    // Colors depend on weapon selection status
    const bgColor = isSelected ? 0x006400 : 0x666666; // Dark green for selected, grey for unselected
    const fillColor = isSelected ? 0x00ff00 : 0x999999; // Bright green for selected, light grey for unselected

    // Background
    const bg = scene.add.graphics().fillStyle(bgColor).fillRect(x, y, width, height);

    // Fill
    const fillWidth = width * progress;
    const fill = scene.add.graphics().fillStyle(fillColor).fillRect(x, y, fillWidth, height);

    // Border
    const border = scene.add.graphics().lineStyle(1, 0xffffff).strokeRect(x, y, width, height);

    // Return as array for adding to container
    return [bg, fill, border];
  }

  static handleTileClick(scene, weaponType) {
    // Update weapon selection (reuse existing logic)
    scene.turnManager.setCurrentWeapon(weaponType);

    // Update weapon sprites (reuse existing logic)
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

    // Close menu using proper cleanup (handles nested arrays)
    if (scene.weaponMenu) {
      // Recursively destroy all elements, including nested arrays
      function destroyElement(el) {
        if (Array.isArray(el)) {
          el.forEach(subEl => destroyElement(subEl));
        } else {
          el?.destroy?.();
        }
      }

      UIManager.clearModalOverlays(scene);
      Object.values(scene.weaponMenu).forEach(destroyElement);
      scene.weaponMenu = null;
    }
  }
}
