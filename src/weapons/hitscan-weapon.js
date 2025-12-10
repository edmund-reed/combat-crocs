import { Config, Logger } from "@config";
import WeaponMath from "@weapons/weapon-math.js";
import { HealthBarManager } from "@ui";
import { getWeaponDamage, awardXP } from "@weapons";

class HitscanWeapon {
  // Streamlined hitscan with generic utilities
  static createShotgunHitscan = (scene, player, targetX, targetY) => {
    const weaponType = "SHOTGUN"; // Default for hitscan weapons
    Logger.weaponEvent(`Player ${player.id} firing hitscan at (${targetX}, ${targetY})`);

    const weapon = Config.WEAPON_CONFIGS[weaponType];
    const { behaviorFlags } = weapon;

    // Use upgraded damage if player has upgrades, otherwise use base damage
    let damage = getWeaponDamage(player, "SHOTGUN");

    // Apply CROCODILE damage multiplier
    if (player.ability?.damageMultiplier) {
      damage *= player.ability.damageMultiplier;
    }

    const targets = scene.players.filter(p => p.id !== player.id && p.health > 0);
    const { player: hitPlayer, distance: hitDist } =
      WeaponMath.hitscanAlongLine(targets, player.x, player.y, targetX, targetY) || {};

    // Handle outcomes
    if (!hitPlayer) {
      console.log("❌ Hitscan MISS");
      this.showShotgunTrail(scene, player.x, player.y, targetX, targetY);

      // Mark that player has attempted to attack this turn (even if missed)
      scene.hasAttackedThisTurn = true;
      scene.canReviveThisTurn = false;
      player.canMove = false;

      return this.endTurn(scene, player, weapon);
    }

    // Check terrain using WeaponMath
    const terrainBlocks = WeaponMath.terrainBlocksPath(scene, player.x, player.y, hitPlayer.x, hitPlayer.y);
    if (terrainBlocks) {
      console.log(`🏔️ TERRAIN BLOCK: Player ${hitPlayer.id} path blocked`);
      this.showShotgunTrail(scene, player.x, player.y, terrainBlocks.x, terrainBlocks.y);

      // Mark that player has attempted to attack this turn (even if blocked)
      scene.hasAttackedThisTurn = true;
      scene.canReviveThisTurn = false;
      player.canMove = false;

      return this.endTurn(scene, player, weapon);
    }

    // Apply damage with Last Stand handling
    const { health: healthBefore } = hitPlayer;

    // Handle GECKO Last Stand ability
    if (
      healthBefore - damage <= 0 &&
      hitPlayer.ability?.reviveHealthPercent !== undefined &&
      !hitPlayer.lastStandUsed &&
      !hitPlayer.inLastStand
    ) {
      // Check if player has living teammates who could revive them
      const livingTeammates = scene.players.filter(
        p => p.teamId === hitPlayer.teamId && p.id !== hitPlayer.id && p.health > 0 && !p.inLastStand,
      );

      console.log(
        `🔍 Last Stand Check for ${hitPlayer.id}: Health=${hitPlayer.health}, Damage=${damage}, reviveHealthPercent=${hitPlayer.ability?.reviveHealthPercent}, lastStandUsed=${hitPlayer.lastStandUsed}, livingTeammates=${livingTeammates.length}`,
      );

      if (livingTeammates.length > 0) {
        // Has teammates - enter Last Stand
        hitPlayer.health = 0.1; // Keep barely alive
        hitPlayer.inLastStand = true;
        hitPlayer.lastStandUsed = true;
        // Record the team turn when entering Last Stand
        hitPlayer.lastStandTeamTurn = scene.turnManager.teamTurnCounters[hitPlayer.teamId] || 0;
        console.log(
          `🦎 Player ${hitPlayer.id} entered Last Stand at team turn ${hitPlayer.lastStandTeamTurn}! (${livingTeammates.length} teammates can revive)`,
        );
      } else {
        // No teammates - die immediately
        hitPlayer.health = 0;
        console.log(`💀 Player ${hitPlayer.id} died (no teammates to revive)`);
      }
    } else {
      hitPlayer.health = Math.max(0, healthBefore - damage);
      // Debug when Last Stand condition fails
      if (healthBefore - damage <= 0) {
        console.log(
          `❌ Last Stand BLOCKED for ${hitPlayer.id}: reviveHealthPercent=${hitPlayer.ability?.reviveHealthPercent}, lastStandUsed=${hitPlayer.lastStandUsed}, inLastStand=${hitPlayer.inLastStand}`,
        );
      }
    }

    console.log(
      `🔫 HITSCAN DAMAGE: Player ${hitPlayer.id} ${damage} damage (${healthBefore} → ${hitPlayer.health})`,
    );
    console.log(`🔫 Hit distance: ${hitDist?.toFixed(1)}`);

    // Award XP to the attacking player (only for damage to opponents)
    const actualDamage = healthBefore - hitPlayer.health;
    if (player.teamId !== hitPlayer.teamId) {
      awardXP(player, "SHOTGUN", actualDamage, scene);
    }

    HealthBarManager.updateHealthBars(scene);
    scene.checkGameEnd?.();
    this.showShotgunTrail(scene, player.x, player.y, hitPlayer.x, hitPlayer.y);

    // Mark that player has attacked this turn and disable further actions
    scene.hasAttackedThisTurn = true;
    scene.canReviveThisTurn = false;
    player.canMove = false;

    return this.endTurn(scene, player, weapon);
  };

  // Modern turn ending logic
  static endTurn = (scene, player, weapon) => {
    const { weaponAmmo } = scene.turnManager;
    const weaponShellAmmo =
      weaponAmmo[Object.keys(Config.WEAPON_CONFIGS).find(key => Config.WEAPON_CONFIGS[key] === weapon)];

    if (weapon.behaviorFlags.includes("multiShot") && weaponShellAmmo >= 1) {
      player.canShoot = true;
      scene.turnManager.turnInProgress = false;
    } else {
      scene.turnManager.turnInProgress = false;
      scene.turnManager.startTurn();
    }
  };

  // Show visual trail for hitscan shot
  static showShotgunTrail(scene, startX, startY, endX, endY) {
    const trail = scene.add.graphics();
    trail.lineStyle(3, 0xffff00, 0.8);
    trail.moveTo(startX, startY);
    trail.lineTo(endX, endY);
    trail.strokePath();

    // Auto-disappear
    scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 400,
      onComplete: () => trail.destroy(),
    });
  }
}

export default HitscanWeapon;
