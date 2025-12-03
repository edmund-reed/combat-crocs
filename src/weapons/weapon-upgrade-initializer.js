// Initializes weapon stats for new players

import { Config } from "@config";

class WeaponUpgradeInitializer {
  static initializePlayerWeaponStats() {
    const weaponStats = {};

    // Initialize stats for each weapon in the config
    Object.keys(Config.WEAPON_CONFIGS).forEach(weaponType => {
      weaponStats[weaponType] = {
        xp: 0,
        level: 1,
      };
    });

    return weaponStats;
  }
}

export default WeaponUpgradeInitializer;
