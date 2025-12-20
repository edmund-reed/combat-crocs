import { Config, Logger } from "@config";
import WeaponMath from "@weapons/weapon-math.js";
import { HealthBarManager } from "@ui";
import { getWeaponDamage, awardXP } from "@weapons";
import { DamageManager } from "@utils";

class HitscanWeapon {
  // Streamlined hitscan with generic utilities
  static createShotgunHitscan = (scene, player, targetX, targetY) => {
    const weaponType = "SHOTGUN"; // Default for hitscan weapons
    const weapon = Config.WEAPON_CONFIGS[weaponType];
    const damage = getWeaponDamage(player, "SHOTGUN") * (player.ability?.damageMultiplier ?? 1);
    const targets = scene.players.filter(p => p.id !== player.id && p.health > 0);
    const { player: hitPlayer, distance: hitDist } =
      WeaponMath.hitscanAlongLine(targets, player.x, player.y, targetX, targetY) || {};

    Logger.weaponEvent(`Player ${player.id} firing hitscan at (${targetX}, ${targetY})`);

    // Handle outcomes
    if (!hitPlayer) {
      console.log("❌ Hitscan MISS");
      this.showShotgunTrail(scene, player.x, player.y, targetX, targetY);
      scene.turnManager.markPlayerAttacked(player);
      return this.endTurn(scene, player, weapon);
    }

    // Check terrain using WeaponMath
    const terrainBlocks = WeaponMath.terrainBlocksPath(scene, player.x, player.y, hitPlayer.x, hitPlayer.y);
    if (terrainBlocks) {
      console.log(
        `🏔️ TERRAIN BLOCK: Shot to Player ${hitPlayer.id} blocked at (${terrainBlocks.x.toFixed(
          1,
        )}, ${terrainBlocks.y.toFixed(1)})`,
      );
      console.log(
        `   Shot path: (${player.x.toFixed(1)}, ${player.y.toFixed(1)}) → (${hitPlayer.x.toFixed(
          1,
        )}, ${hitPlayer.y.toFixed(1)})`,
      );
      this.showShotgunTrail(scene, player.x, player.y, terrainBlocks.x, terrainBlocks.y);
      scene.turnManager.markPlayerAttacked(player);
      return this.endTurn(scene, player, weapon);
    }

    console.log(`✅ CLEAR SHOT: Hit Player ${hitPlayer.id} at distance ${hitDist?.toFixed(1)}`);

    // Apply damage via central DamageManager (with Last Stand support)
    const damageResult = DamageManager.applyDamage(scene, hitPlayer, damage);

    Logger.weaponEvent(
      `🔫 HITSCAN DAMAGE: Player ${hitPlayer.id} ${damageResult.requestedDamage} damage ` +
        `(${damageResult.previousHealth} → ${damageResult.currentHealth}), distance=${hitDist?.toFixed(1)}`,
    );

    // Award XP to the attacking player (only for damage to opponents)
    const actualDamage = damageResult.actualDamage;
    if (player.teamId !== hitPlayer.teamId) {
      awardXP(player, "SHOTGUN", actualDamage, scene);
    }

    HealthBarManager.updateHealthBars(scene);
    scene.checkGameEnd?.();
    this.showShotgunTrail(scene, player.x, player.y, hitPlayer.x, hitPlayer.y);

    scene.turnManager.markPlayerAttacked(player);
    return this.endTurn(scene, player, weapon);
  };

  // Modern turn ending logic
  static endTurn = (scene, player, weapon) => {
    const { weaponAmmo } = scene.turnManager;
    const weaponShellAmmo =
      weaponAmmo[Object.keys(Config.WEAPON_CONFIGS).find(key => Config.WEAPON_CONFIGS[key] === weapon)];

    if (weapon.behaviorFlags.includes("multiShot") && weaponShellAmmo >= 1) {
      // Multi-shot continuation (shotgun): allow the player to reposition between shots.
      player.canShoot = true;
      player.canMove = true;
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
