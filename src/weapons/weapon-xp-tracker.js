// XP Tracking and Level-Up System for Combat Crocs

import { Config, Logger } from "@config";
import { WeaponLevelUpNotification } from "@ui";

class WeaponXPTracker {
  // Returns true if this XP gain caused a level up
  static awardXP(player, weaponType, damage, scene = null) {
    if (!player || !weaponType || damage <= 0) {
      return false;
    }

    // Ensure player has weapon stats initialized
    if (!player.weaponStats || !player.weaponStats[weaponType]) {
      return false;
    }

    const weaponStat = player.weaponStats[weaponType];
    const config = Config.WEAPON_CONFIGS[weaponType];

    if (!config || !config.upgrades) {
      Logger.warn(`No upgrade config found for weapon: ${weaponType}`);
      return false;
    }

    // Add XP
    const oldXP = weaponStat.xp;
    weaponStat.xp += damage;

    Logger.weaponEvent(`Player ${player.id} ${weaponType}: +${damage} XP (${oldXP} → ${weaponStat.xp})`);

    // Check for level up and show notification if leveled up
    const leveledUp = this.checkLevelUp(player, weaponType);

    if (leveledUp && scene) {
      WeaponLevelUpNotification.show(scene, weaponType, weaponStat.level);
    }

    return leveledUp;
  }

  static checkLevelUp(player, weaponType) {
    if (!player.weaponStats || !player.weaponStats[weaponType]) {
      return false;
    }

    const weaponStat = player.weaponStats[weaponType];
    const config = Config.WEAPON_CONFIGS[weaponType];

    if (!config || !config.upgrades) {
      return false;
    }

    const { maxLevel, xpThresholds } = config.upgrades;
    let leveledUp = false;

    // Keep checking for level ups until we can't level up anymore
    // This handles cases where one big XP gain skips multiple levels
    while (weaponStat.level < maxLevel) {
      const nextLevel = weaponStat.level + 1;
      // Threshold array: [5, 12] means 5 XP for Level 2, 12 XP for Level 3
      // So nextLevel 2 needs xpThresholds[0], nextLevel 3 needs xpThresholds[1]
      const xpRequired = xpThresholds[nextLevel - 2];

      if (weaponStat.xp >= xpRequired) {
        weaponStat.level = nextLevel;
        Logger.gameEvent(`🎉 Player ${player.id} ${weaponType} upgraded to Level ${nextLevel}!`);
        leveledUp = true;
      } else {
        break; // Stop checking if we can't level up
      }
    }

    return leveledUp;
  }

  // Returns progress percentage (0-100) for UI progress bars
  static getXPProgress(player, weaponType) {
    if (!player.weaponStats || !player.weaponStats[weaponType]) {
      return 0;
    }

    const stat = player.weaponStats[weaponType];
    const config = Config.WEAPON_CONFIGS[weaponType];

    if (!config || !config.upgrades) {
      return 0;
    }

    // At max level, show 100%
    if (stat.level >= config.upgrades.maxLevel) {
      return 100;
    }

    const currentLevelXP = config.upgrades.xpThresholds[stat.level - 1];
    const nextLevelXP = config.upgrades.xpThresholds[stat.level];
    const xpInCurrentLevel = stat.xp - currentLevelXP;
    const xpNeededForLevel = nextLevelXP - currentLevelXP;

    return Math.min(100, (xpInCurrentLevel / xpNeededForLevel) * 100);
  }
}

export default WeaponXPTracker;
