// Explosion effect and damage system for Combat Crocs

import { Config } from "@config";
import PhysicsManager from "@utils/physics-manager.js";
import { HealthBarManager } from "@ui";
import { getWeaponDamage, getWeaponRadius, getExplosionColor, awardXP } from "@weapons";

class ExplosionSystem {
  // Create explosion effect and apply damage
  static createExplosion(scene, x, y, projectileOwner = null, weaponType = "BAZOOKA") {
    // Get attacking player to determine upgraded weapon stats
    const attackingPlayer = projectileOwner ? scene.players.find(p => p.id === projectileOwner) : null;

    // Use upgraded damage and radius if player has upgrades, otherwise use base values
    const maxDamage = attackingPlayer
      ? getWeaponDamage(attackingPlayer, weaponType)
      : Config.WEAPON_CONFIGS[weaponType].damage;

    const radius = attackingPlayer
      ? getWeaponRadius(attackingPlayer, weaponType)
      : Config.WEAPON_CONFIGS[weaponType].radius;

    // Get weapon level for visual effects
    const weaponLevel = attackingPlayer?.weaponStats?.[weaponType]?.level || 1;

    console.log(
      `ACTUAL EXPLOSION at (${x.toFixed(1)}, ${y.toFixed(1)}) from ${
        projectileOwner ? `Player ${projectileOwner}` : "timeout"
      }. Radius: ${radius}, Damage: ${maxDamage}, Level: ${weaponLevel}`,
    );

    // Create explosion graphics based on weapon level
    const color = getExplosionColor(weaponLevel);
    const explosion = scene.add.graphics({ x, y }).fillStyle(color, 0.8).fillCircle(0, 0, radius);
    scene.tweens.add({
      targets: explosion,
      scaleX: 0,
      scaleY: 0,
      duration: 300,
      onComplete: () => explosion.destroy(),
    });

    // Track total damage for XP awarding
    let totalDamageDealt = 0;

    // Damage nearby players (check for terrain protection)
    scene.players.forEach((player, index) => {
      const distance = Phaser.Math.Distance.Between(x, y, player.x, player.y);
      console.log(`Player ${index + 1} distance: ${distance.toFixed(1)}, health: ${player.health}`);

      if (distance < radius) {
        const blockedByTerrain = PhysicsManager.isExplosionBlocked(x, y, player.x, player.y, scene.currentMapPlatforms);

        if (!blockedByTerrain) {
          // Apply damage with distance falloff
          const damage = Math.max(0, maxDamage - (distance / radius) * (maxDamage * 0.75));
          console.log(
            `${projectileOwner === player.id ? "🎯 OWN" : "💥"} Player ${index + 1} hit for ${damage} damage`,
          );

          player.health = Math.max(0, player.health - damage);
          HealthBarManager.updateHealthBars(scene);

          // Track damage for XP (but not self-damage)
          if (projectileOwner && projectileOwner !== player.id && damage > 0) {
            totalDamageDealt += damage;
          }

          // Check if the game should end after damage
          scene.checkGameEnd?.();
        } else {
          console.log(`🛡️ Player ${index + 1} protected by terrain from explosion`);
        }
      }
    });

    // Award XP to the attacking player
    console.log(
      `🔍 XP Award Check: attackingPlayer=${attackingPlayer?.id}, totalDamage=${totalDamageDealt}, weaponType=${weaponType}`,
    );
    if (attackingPlayer && totalDamageDealt > 0) {
      console.log(`✅ Awarding ${totalDamageDealt} XP to Player ${attackingPlayer.id} for ${weaponType}`);
      awardXP(attackingPlayer, weaponType, totalDamageDealt, scene);
    } else {
      console.log(`❌ XP NOT awarded - attackingPlayer: ${!!attackingPlayer}, totalDamage: ${totalDamageDealt}`);
    }

    // Screen shake
    scene.cameras.main.shake(200, 0.02);

    return projectileOwner;
  }
}

export default ExplosionSystem;
