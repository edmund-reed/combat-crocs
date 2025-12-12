import { Config } from "@config";
import UIManager from "./ui.js";

export class WeaponUpgradeGrid {
  static createGrid(scene, weapons, x, y, tileSize = 60, spacing = 2, depth = 0, currentWeapon = null) {
    return weapons.map((data, i) => {
      const isSelected = currentWeapon === data.weaponType;
      const row = scene.add
        .container(x, y + i * (tileSize + spacing + 8))
        .setDepth(depth)
        .setAlpha(isSelected ? 1 : 0.5);

      for (let lvl = 1; lvl <= data.maxLevel; lvl++) {
        row.add(this._tile(scene, data, lvl, (lvl - 1) * (tileSize + spacing), tileSize, isSelected, row));
      }
      return row;
    });
  }

  static _tile(scene, data, level, x, size, isSelected, row) {
    const { weaponType, currentLevel, currentXP, xpThresholds } = data;
    const config = Config.WEAPON_CONFIGS[weaponType];
    const isCurrent = level === currentLevel;
    const locked = level > currentLevel;
    const tile = scene.add.container(0, 0).setAlpha(locked ? 0.6 : 1);
    const isCurrentUnlocked = isCurrent && !locked; // current level
    const isPreviouslyUnlocked = !locked && !isCurrent; // below current level
    const gfx = scene.add.graphics();

    // Base background
    gfx.fillStyle(0x333333).fillRoundedRect(x, 0, size, size, 4);

    // Darken previously unlocked levels with transparent black
    if (isPreviouslyUnlocked) {
      gfx.fillStyle(0x000000, 0.3).fillRoundedRect(x, 0, size, size, 4);
    }

    // Brighten current unlocked level with transparent white
    if (isCurrentUnlocked) {
      gfx.fillStyle(0xffffff, 0.3).fillRoundedRect(x, 0, size, size, 4);
    }

    const borderColor = isCurrent && isSelected ? 0x00ff00 : 0xffffff;
    let borderAlpha = 1;
    if (locked) borderAlpha = 0.3;
    else if (isPreviouslyUnlocked) borderAlpha = 0.5;

    gfx.lineStyle(2, borderColor, borderAlpha).strokeRoundedRect(x, 0, size, size, 4);

    // Progress bar (on current level only)
    if (isCurrent && level < config.upgrades?.maxLevel) {
      const prog = Math.min(currentXP / xpThresholds[level - 1], 1);
      const h = 6;
      const py = size - h;
      gfx
        .fillStyle(isSelected ? 0x006400 : 0x666666)
        .fillRect(x, py, size, h)
        .fillStyle(isSelected ? 0x00ff00 : 0x999999)
        .fillRect(x, py, size * prog, h)
        .lineStyle(1, 0xffffff)
        .strokeRect(x, py, size, h);
    }
    tile.add(gfx);

    // Icon (scale to 57px width)
    const icon = scene.add.image(x + size / 2, size / 2 - 8, config.heldSpriteKey);
    icon.setScale(57 / icon.width);
    if (locked) icon.setTint(0x666666);
    tile.add(icon);

    // Stars
    tile.add(
      scene.add
        .text(x + size / 2, size - 17, "⭐".repeat(level), {
          font: "12px Arial",
          fill: locked ? "#666" : "#FFD700",
        })
        .setOrigin(0.5),
    );

    // Hit area
    const hit = scene.add
      .graphics()
      .fillStyle(0, 0)
      .fillRect(x, 0, size, size)
      .setInteractive(new Phaser.Geom.Rectangle(x, 0, size, size), Phaser.Geom.Rectangle.Contains);
    hit.on("pointerdown", (ptr, lx, ly, event) => {
      event.stopPropagation();
      this._select(scene, weaponType);
    });
    hit.on("pointerover", () => row.setAlpha(1));
    hit.on("pointerout", () => row.setAlpha(isSelected ? 1 : 0.5));
    tile.add(hit);

    return tile;
  }

  static _select(scene, weaponType) {
    scene.turnManager.setCurrentWeapon(weaponType);
    const idx = scene.turnManager.getCurrentPlayerIndex();
    const cfg = Config.WEAPON_CONFIGS[weaponType];

    scene.players.forEach((p, i) => {
      if (!p.weaponSprite) return;
      if (cfg?.hasHeldSprite) {
        p.weaponSprite
          .setTexture(cfg.heldSpriteKey)
          .setScale(cfg.heldSpriteScale)
          .setVisible(i === idx);
      } else {
        p.weaponSprite.setVisible(false);
      }
    });

    if (scene.weaponMenu) {
      UIManager.clearModalOverlays(scene);
      Object.values(scene.weaponMenu).forEach(el => UIManager.destroyElement(el));
      scene.weaponMenu = null;
    }
  }
}
