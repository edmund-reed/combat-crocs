// Consolidated weapon upgrade system for Combat Crocs

import { Config, Logger } from "@config";

// Initialize weapon stats for a team (inline, no separate class needed)
export const initWeaponStats = () =>
  Object.keys(Config.WEAPON_CONFIGS).reduce((stats, type) => ({ ...stats, [type]: { xp: 0, level: 1 } }), {});

// Get weapon damage based on upgrade level
export const getWeaponDamage = (player, weaponType) => {
  const config = Config.WEAPON_CONFIGS[weaponType];
  if (!config?.upgrades || !player.weaponStats?.[weaponType]) return config?.damage || 0;
  return config.upgrades.damagePerLevel[player.weaponStats[weaponType].level - 1] || config.damage;
};

// Get weapon radius based on upgrade level
export const getWeaponRadius = (player, weaponType) => {
  const config = Config.WEAPON_CONFIGS[weaponType];
  if (!config?.upgrades || !player.weaponStats?.[weaponType]) return config?.radius || 0;
  return config.upgrades.radiusPerLevel?.[player.weaponStats[weaponType].level - 1] || config.radius;
};

// Get explosion color based on level
export const getExplosionColor = level => [0xffff00, 0xff8800, 0xff0000][level - 1] || 0xffff00;

// Award XP and check for level-ups
export const awardXP = (player, weaponType, damage, scene = null) => {
  if (!player?.weaponStats?.[weaponType] || damage <= 0) return false;

  const weaponStat = player.weaponStats[weaponType];
  const config = Config.WEAPON_CONFIGS[weaponType];
  if (!config?.upgrades) return false;

  weaponStat.xp += damage;
  Logger.weaponEvent(`Player ${player.id} ${weaponType}: +${damage} XP → ${weaponStat.xp}`);

  // Check for level-ups (handles multi-level jumps)
  const { maxLevel, xpThresholds } = config.upgrades;
  let leveledUp = false;

  while (weaponStat.level < maxLevel && weaponStat.xp >= xpThresholds[weaponStat.level - 1]) {
    weaponStat.level++;
    Logger.gameEvent(`🎉 Player ${player.id} ${weaponType} → Level ${weaponStat.level}!`);
    leveledUp = true;
  }

  // Show notification if leveled up
  if (leveledUp && scene) {
    showLevelUpNotification(scene, weaponType, weaponStat.level);
  }

  return leveledUp;
};

// Level-up notification (consolidated from separate file)
const showLevelUpNotification = (scene, weaponType, level) => {
  if (scene.gameEnded) return;

  // Flash effect
  const flash = scene.add
    .graphics()
    .fillStyle(0xffd700, 0.3)
    .fillRect(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT)
    .setDepth(1999);
  scene.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });

  // Notification popup
  const { GAME_WIDTH: w, GAME_HEIGHT: h } = Config;
  const x = w / 2,
    y = h / 2;

  const bg = scene.add
    .graphics()
    .fillStyle(0x000000, 0.8)
    .fillRoundedRect(x - 150, y - 50, 300, 100, 10)
    .lineStyle(3, 0xffd700)
    .strokeRoundedRect(x - 150, y - 50, 300, 100, 10)
    .setDepth(2000)
    .setAlpha(0);

  const texts = [
    scene.add
      .text(x, y - 15, "LEVEL UP!", { font: "bold 24px Arial", fill: "#FFD700" })
      .setOrigin(0.5)
      .setDepth(2001)
      .setAlpha(0)
      .setScale(0.5),
    scene.add
      .text(x, y + 10, weaponType, { font: "18px Arial", fill: "#FFD700" })
      .setOrigin(0.5)
      .setDepth(2001)
      .setAlpha(0),
    scene.add
      .text(x, y + 30, "⭐".repeat(level), { font: "16px Arial", fill: "#FFD700" })
      .setOrigin(0.5)
      .setDepth(2001)
      .setAlpha(0),
  ];

  scene.tweens.add({ targets: bg, alpha: 1, duration: 200 });
  scene.tweens.add({ targets: texts[0], alpha: 1, scale: 1, duration: 300, ease: "Back.easeOut" });
  scene.tweens.add({ targets: [texts[1], texts[2]], alpha: 1, duration: 300, delay: 150 });

  scene.time.delayedCall(2000, () => {
    scene.tweens.add({
      targets: [bg, ...texts],
      alpha: 0,
      duration: 300,
      onComplete: () => [bg, ...texts].forEach(el => el.destroy()),
    });
  });
};
