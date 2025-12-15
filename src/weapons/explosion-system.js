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
      const inRadius = distance < radius;

      // New LOS check: raycast against actual Matter bodies (PhysicsEditor polygons etc.)
      const blocked = PhysicsManager.isExplosionBlocked(x, y, player.x, player.y, scene);

      if (inRadius && blocked) {
        console.log(
          `💥 Explosion(${weaponType}) BLOCKED for P${player.id}: dist=${distance.toFixed(1)}/${radius} ` +
            `exp=(${x.toFixed(1)},${y.toFixed(1)}) player=(${player.x.toFixed(1)},${player.y.toFixed(1)})`,
        );
      }

      if (inRadius && !blocked) {
        const damage =
          Math.max(0, maxDamage * (1 - (distance / radius) * 0.75)) *
          (attackingPlayer?.ability?.damageMultiplier ?? 1);

        console.log(
          `💥 Explosion(${weaponType}) hits P${player.id}: dist=${distance.toFixed(
            1,
          )}/${radius}, dmg=${damage.toFixed(1)}`,
        );

        const { actualDamage } = DamageManager.applyDamage(scene, player, damage);

        if (attackerTeamId !== null && player.teamId !== attackerTeamId) {
          totalDamage += actualDamage;
        }

        scene.checkGameEnd?.();
      }
    });

    HealthBarManager.updateHealthBars(scene);
    if (attackingPlayer && totalDamage > 0) awardXP(attackingPlayer, weaponType, totalDamage, scene);
    scene.cameras.main.shake(200, 0.02);

    // Mark that player has attacked this turn and disable further actions
    if (attackingPlayer) scene.turnManager.markPlayerAttacked(attackingPlayer);

    return projectileOwner;
  }
}

export default ExplosionSystem;
