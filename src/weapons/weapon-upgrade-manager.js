// Facade providing unified API for weapon upgrade system

import WeaponXPTracker from "./weapon-xp-tracker.js";
import WeaponStatsProvider from "./weapon-stats-provider.js";
import WeaponUpgradeInitializer from "./weapon-upgrade-initializer.js";

class WeaponUpgradeManager {
  static initializePlayerWeaponStats() {
    return WeaponUpgradeInitializer.initializePlayerWeaponStats();
  }

  static awardXP(player, weaponType, damage, scene = null) {
    return WeaponXPTracker.awardXP(player, weaponType, damage, scene);
  }

  static checkLevelUp(player, weaponType) {
    return WeaponXPTracker.checkLevelUp(player, weaponType);
  }

  static getXPProgress(player, weaponType) {
    return WeaponXPTracker.getXPProgress(player, weaponType);
  }

  static getWeaponDamage(player, weaponType) {
    return WeaponStatsProvider.getWeaponDamage(player, weaponType);
  }

  static getWeaponRadius(player, weaponType) {
    return WeaponStatsProvider.getWeaponRadius(player, weaponType);
  }

  static getPlayerWeaponStats(player) {
    return WeaponStatsProvider.getPlayerWeaponStats(player);
  }
}

export default WeaponUpgradeManager;
