import { Config } from "@config";
import PhysicsManager from "@utils/physics-manager.js";
import { HealthBarManager } from "@ui";
import { getWeaponDamage, getWeaponRadius, getExplosionColor, awardXP } from "@weapons";
import { DamageManager } from "@utils";

class ExplosionSystem {
  static createExplosion(scene, x, y, projectileOwner = null, weaponType = "BAZOOKA") {
    const attackingPlayer = projectileOwner ? scene.players.find(p => p.id === projectileOwner) : null;
    const config = Config.WEAPON_CONFIGS[weaponType];
    const maxDamage = attackingPlayer ? getWeaponDamage(attackingPlayer, weaponType) : config.damage;
    const radius = attackingPlayer ? getWeaponRadius(attackingPlayer, weaponType) : config.radius;
    const weaponLevel = attackingPlayer?.weaponStats?.[weaponType]?.level || 1;

    const explosion = scene.add
      .graphics({ x, y })
      .fillStyle(getExplosionColor(weaponLevel), 0.8)
      .fillCircle(0, 0, radius);

    // Create small red dot at explosion center for visual feedback
    const centerDot = scene.add.graphics({ x, y }).fillStyle(0xff0000, 1.0).fillCircle(0, 0, 5);

    // Skip explosion animation in training mode
    if (window.__SKIP_ANIMATIONS__) {
      // TRAINING MODE: Destroy big circle, keep center dot for visual debugging
      explosion.destroy();
      // centerDot persists - don't destroy it
      console.log(`[EXPLOSION] Created at (${x.toFixed(0)}, ${y.toFixed(0)}), radius: ${radius}`);
    } else {
      // NORMAL MODE: Animate big circle, destroy both after animation
      scene.tweens.add({
        targets: explosion,
        scaleX: 0,
        scaleY: 0,
        duration: 300,
        onComplete: () => {
          explosion.destroy();
          centerDot.destroy();
        },
      });
    }

    let totalDamage = 0;
    let selfDamage = 0;
    const attackerTeamId = attackingPlayer?.teamId ?? null;
    const enemiesHit = [];
    let enemiesKilled = 0;

    // TRAINING MODE: Detailed damage logging
    if (window.__TRAINING_MODE__) {
      console.log(`[EXPLOSION DAMAGE] Checking ${scene.players.length} players, radius: ${radius}`);
    }

    scene.players.forEach(player => {
      const distance = Phaser.Math.Distance.Between(x, y, player.x, player.y);
      const isBlocked = PhysicsManager.isExplosionBlocked(x, y, player.x, player.y, scene);

      // TRAINING MODE: Log each player check
      if (window.__TRAINING_MODE__) {
        console.log(
          `[EXPLOSION DAMAGE] Player ${player.id} (Team ${player.team}): pos=(${player.x.toFixed(
            0,
          )}, ${player.y.toFixed(0)}), distance=${distance.toFixed(0)}, blocked=${isBlocked}`,
        );
      }

      if (distance >= radius || isBlocked) {
        if (window.__TRAINING_MODE__ && distance < radius) {
          console.log(`[EXPLOSION DAMAGE] Player ${player.id} BLOCKED by terrain`);
        }
        return;
      }

      const damage =
        Math.max(0, maxDamage * (1 - (distance / radius) * 0.75)) *
        (attackingPlayer?.ability?.damageMultiplier ?? 1);

      const { actualDamage } = DamageManager.applyDamage(scene, player, damage);

      // TRAINING MODE: Log damage applied
      if (window.__TRAINING_MODE__) {
        console.log(
          `[EXPLOSION DAMAGE] Player ${player.id}: calculated=${damage.toFixed(
            1,
          )}, actual=${actualDamage.toFixed(1)}, health=${player.health}`,
        );
      }

      // Track self-damage if this is the attacking player
      if (attackingPlayer && player.id === attackingPlayer.id) {
        selfDamage = actualDamage;
      }

      if (attackerTeamId !== null && player.teamId !== attackerTeamId) {
        totalDamage += actualDamage;
        enemiesHit.push(player.id);
        if (player.health <= 0) enemiesKilled++;
      }
      scene.checkGameEnd?.();
    });

    // TRAINING MODE: Summary
    if (window.__TRAINING_MODE__) {
      console.log(
        `[EXPLOSION DAMAGE] Total enemy damage: ${totalDamage.toFixed(1)}, self damage: ${selfDamage.toFixed(
          1,
        )}`,
      );
    }

    HealthBarManager.updateHealthBars(scene);
    attackingPlayer && totalDamage > 0 && awardXP(attackingPlayer, weaponType, totalDamage, scene);

    // Skip camera shake in training mode
    if (!window.__SKIP_ANIMATIONS__) {
      scene.cameras.main.shake(200, 0.02);
    }

    attackingPlayer && scene.turnManager.markPlayerAttacked(attackingPlayer);

    // Record result for AI training
    scene.recorder?.recordResult(scene, {
      damageDealt: totalDamage,
      enemiesHit: enemiesHit,
      enemiesKilled: enemiesKilled,
      hitSuccess: totalDamage > 0,
      selfDamage: selfDamage,
      explosionX: x,
      explosionY: y,
      explosionBlocked: false, // Could enhance this later
    });

    return projectileOwner;
  }
}

export default ExplosionSystem;
