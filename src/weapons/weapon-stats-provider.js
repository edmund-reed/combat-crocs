// Provides current weapon stats based on upgrade level

import { Config, Logger } from "@config";

class WeaponStatsProvider {
  static getWeaponDamage(player, weaponType) {
    const config = Config.WEAPON_CONFIGS[weaponType];

    if (!config) {
      Logger.error(`Unknown weapon type: ${weaponType}`);
      return 0;
    }

    // If no upgrades config or player has no stats, return base damage
    if (!config.upgrades || !player.weaponStats || !player.weaponStats[weaponType]) {
      return config.damage;
    }

    const level = player.weaponStats[weaponType].level;
    const damagePerLevel = config.upgrades.damagePerLevel;

    // Return damage for current level (array is 0-indexed)
    return damagePerLevel[level - 1] || config.damage;
  }

  static getWeaponRadius(player, weaponType) {
    const config = Config.WEAPON_CONFIGS[weaponType];

    if (!config) {
      Logger.error(`Unknown weapon type: ${weaponType}`);
      return 0;
    }

    // If no upgrades config or player has no stats, return base radius
    if (!config.upgrades || !player.weaponStats || !player.weaponStats[weaponType]) {
      return config.radius;
    }

    const level = player.weaponStats[weaponType].level;
    const radiusPerLevel = config.upgrades.radiusPerLevel;

    // Return radius for current level (array is 0-indexed), fallback to base
    return radiusPerLevel ? radiusPerLevel[level - 1] || config.radius : config.radius;
  }

  // Returns summary of all weapon stats for display/debugging
  static getPlayerWeaponStats(player) {
    if (!player.weaponStats) {
      return {};
    }

    const summary = {};

    Object.keys(player.weaponStats).forEach(weaponType => {
      const stat = player.weaponStats[weaponType];
      const config = Config.WEAPON_CONFIGS[weaponType];

      if (config && config.upgrades) {
        const nextLevelXP = config.upgrades.xpThresholds[stat.level]; // Next level threshold

        summary[weaponType] = {
          level: stat.level,
          xp: stat.xp,
          xpToNextLevel: nextLevelXP ? nextLevelXP - stat.xp : 0,
          maxLevel: config.upgrades.maxLevel,
          isMaxLevel: stat.level >= config.upgrades.maxLevel,
        };
      }
    });

    return summary;
  }
}

export default WeaponStatsProvider;
