// XP Tracking and Level-Up System for Combat Crocs

import { Config, Logger } from "@config";

class WeaponXPTracker {
  // Returns true if this XP gain caused a level up
  static awardXP(player, weaponType, damage) {
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

    // Check for level up
    return this.checkLevelUp(player, weaponType);
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
    const currentLevel = weaponStat.level;

    // Already at max level
    if (currentLevel >= maxLevel) {
      return false;
    }

    const nextLevel = currentLevel + 1;
    const xpRequired = xpThresholds[nextLevel - 1]; // Array is 0-indexed

    if (weaponStat.xp >= xpRequired) {
      weaponStat.level = nextLevel;
      Logger.gameEvent(`🎉 Player ${player.id} ${weaponType} upgraded to Level ${nextLevel}!`);
      return true;
    }

    return false;
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
