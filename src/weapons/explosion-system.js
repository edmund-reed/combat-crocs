// Explosion effect and damage system for Combat Crocs

import { Config } from "@config";
import PhysicsManager from "@utils/physics-manager.js";
import { HealthBarManager } from "@ui";
import { getWeaponDamage, getWeaponRadius, getExplosionColor, awardXP } from "@weapons";

class ExplosionSystem {
  static createExplosion(scene, x, y, projectileOwner = null, weaponType = "BAZOOKA") {
    const attackingPlayer = projectileOwner ? scene.players.find(p => p.id === projectileOwner) : null;
    const config = Config.WEAPON_CONFIGS[weaponType];
    const maxDamage = attackingPlayer ? getWeaponDamage(attackingPlayer, weaponType) : config.damage;
    const radius = attackingPlayer ? getWeaponRadius(attackingPlayer, weaponType) : config.radius;
    const weaponLevel = attackingPlayer?.weaponStats?.[weaponType]?.level || 1;

    // Create explosion visual
    const explosion = scene.add
      .graphics({ x, y })
      .fillStyle(getExplosionColor(weaponLevel), 0.8)
      .fillCircle(0, 0, radius);
    scene.tweens.add({
      targets: explosion,
      scaleX: 0,
      scaleY: 0,
      duration: 300,
      onComplete: () => explosion.destroy(),
    });

    let totalDamage = 0;
    const attackerTeamId = attackingPlayer ? attackingPlayer.teamId : null;

    scene.players.forEach(player => {
      const distance = Phaser.Math.Distance.Between(x, y, player.x, player.y);
      if (
        distance < radius &&
        !PhysicsManager.isExplosionBlocked(x, y, player.x, player.y, scene.currentMapPlatforms)
      ) {
        let damage = Math.max(0, maxDamage * (1 - (distance / radius) * 0.75));

        // Apply CROCODILE damage multiplier
        if (attackingPlayer?.ability?.damageMultiplier) {
          damage *= attackingPlayer.ability.damageMultiplier;
        }

        // Handle GECKO Last Stand ability
        if (
          player.health - damage <= 0 &&
          player.ability?.reviveHealthPercent !== undefined &&
          !player.lastStandUsed &&
          !player.inLastStand
        ) {
          // Check if player has living teammates who could revive them
          const livingTeammates = scene.players.filter(
            p => p.teamId === player.teamId && p.id !== player.id && p.health > 0 && !p.inLastStand,
          );

          console.log(
            `🔍 Last Stand Check for ${player.id}: Health=${player.health}, Damage=${damage}, reviveHealthPercent=${player.ability?.reviveHealthPercent}, lastStandUsed=${player.lastStandUsed}, livingTeammates=${livingTeammates.length}`,
          );

          if (livingTeammates.length > 0) {
            // Has teammates - enter Last Stand
            player.health = 0.1; // Keep barely alive
            player.inLastStand = true;
            player.lastStandUsed = true;
            // Record the team turn when entering Last Stand
            player.lastStandTeamTurn = scene.turnManager.teamTurnCounters[player.teamId] || 0;
            console.log(
              `🦎 Player ${player.id} entered Last Stand at team turn ${player.lastStandTeamTurn}! (${livingTeammates.length} teammates can revive)`,
            );
          } else {
            // No teammates - die immediately
            player.health = 0;
            console.log(`💀 Player ${player.id} died (no teammates to revive)`);
          }
        } else {
          player.health = Math.max(0, player.health - damage);
          // Debug when Last Stand condition fails
          if (player.health - damage <= 0) {
            console.log(
              `❌ Last Stand BLOCKED for ${player.id}: reviveHealthPercent=${player.ability?.reviveHealthPercent}, lastStandUsed=${player.lastStandUsed}, inLastStand=${player.inLastStand}`,
            );
          }
        }

        if (attackerTeamId !== null && player.teamId !== attackerTeamId) {
          totalDamage += damage;
        }

        scene.checkGameEnd?.();
      }
    });

    HealthBarManager.updateHealthBars(scene);
    if (attackingPlayer && totalDamage > 0) awardXP(attackingPlayer, weaponType, totalDamage, scene);
    scene.cameras.main.shake(200, 0.02);

    // Mark that player has attacked this turn and disable further actions
    if (attackingPlayer) {
      scene.hasAttackedThisTurn = true;
      scene.canReviveThisTurn = false;
      attackingPlayer.canMove = false;
    }

    return projectileOwner;
  }
}

export default ExplosionSystem;
