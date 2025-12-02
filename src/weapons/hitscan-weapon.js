// Hitscan weapon system for Combat Crocs - High-Level Pipeline Architecture

import { Config } from "@config";
import WeaponMath from "@weapons/weapon-math.js";
import { HealthBarManager } from "@ui";

class HitscanWeapon {
  // Streamlined hitscan with generic utilities
  static createShotgunHitscan = (scene, player, targetX, targetY) => {
    console.log(`🔍 SHOTGUN: Player ${player.id} shooting at (${targetX}, ${targetY})`);

    // Extract weapon config once at top
    const weapon = Config.WEAPON_CONFIGS.SHOTGUN;
    const { damage, behaviorFlags } = weapon;

    // Filter targets once
    const targets = scene.players.filter(p => p.id !== player.id && p.health > 0);

    // Single call to generic hitscan utility
    const hitResult = WeaponMath.hitscanAlongLine(targets, player.x, player.y, targetX, targetY);
    const hitPlayer = hitResult?.player ?? null;
    const hitDist = hitResult?.distance ?? null;

    // Handle outcomes
    if (!hitPlayer) {
      console.log("❌ Hitscan MISS");
      this.showShotgunTrail(scene, player.x, player.y, targetX, targetY);
      return this.endTurn(scene, player, weapon);
    }

    // Check terrain using WeaponMath
    const terrainBlocks = WeaponMath.terrainBlocksPath(scene, player.x, player.y, hitPlayer.x, hitPlayer.y);
    if (terrainBlocks) {
      console.log(`🏔️ TERRAIN BLOCK: Player ${hitPlayer.id} path blocked`);
      this.showShotgunTrail(scene, player.x, player.y, terrainBlocks.x, terrainBlocks.y);
      return this.endTurn(scene, player, weapon);
    }

    // Apply damage
    const { health: healthBefore } = hitPlayer;
    hitPlayer.health = Math.max(0, healthBefore - damage);

    console.log(`🔫 HITSCAN DAMAGE: Player ${hitPlayer.id} ${damage} damage (${healthBefore} → ${hitPlayer.health})`);
    console.log(`🔫 Hit distance: ${hitDist?.toFixed(1)}`);

    HealthBarManager.updateHealthBars(scene);
    scene.checkGameEnd?.();
    this.showShotgunTrail(scene, player.x, player.y, hitPlayer.x, hitPlayer.y);

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
