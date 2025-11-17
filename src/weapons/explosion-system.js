// Explosion effect and damage system for Combat Crocs

class ExplosionSystem {
  // Create explosion effect and apply damage
  static createExplosion(scene, x, y, projectileOwner = null, weaponType = "BAZOOKA") {
    const weaponConfig = Config.WEAPON_TYPES[weaponType];
    const radius = weaponConfig.radius;
    console.log(
      `ACTUAL EXPLOSION at (${x.toFixed(1)}, ${y.toFixed(1)}) from ${
        projectileOwner ? `Player ${projectileOwner}` : "timeout"
      }. Radius: ${radius}`,
    );

    // Explosion graphics
    const explosion = scene.add.graphics({ x: x, y: y });
    explosion.fillStyle(0xff4500);
    explosion.fillCircle(0, 0, radius);

    scene.tweens.add({
      targets: explosion,
      scaleX: 0,
      scaleY: 0,
      duration: 300,
      onComplete: () => explosion.destroy(),
    });

    // Damage nearby players (check for terrain protection)
    scene.players.forEach((player, index) => {
      const distance = Phaser.Math.Distance.Between(x, y, player.x, player.y);
      console.log(`Player ${index + 1} distance: ${distance.toFixed(1)}, health: ${player.health}`);

      if (distance < radius) {
        const blockedByTerrain = ExplosionPhysics.isExplosionBlockedByTerrain(
          x,
          y,
          player.x,
          player.y,
          scene.currentMapPlatforms,
        );

        if (!blockedByTerrain) {
          // Apply damage with distance falloff
          const maxDamage = weaponConfig.damage;
          const damage = Math.max(0, maxDamage - (distance / radius) * (maxDamage * 0.75));
          console.log(
            `${projectileOwner === player.id ? "🎯 OWN" : "💥"} Player ${index + 1} hit for ${damage} damage`,
          );

          player.health = Math.max(0, player.health - damage);
          UIManager.updateHealthBars(scene);

          // Check if the game should end after damage
          scene.checkGameEnd?.();
        } else {
          console.log(`🛡️ Player ${index + 1} protected by terrain from explosion`);
        }
      }
    });

    // Screen shake
    scene.cameras.main.shake(200, 0.02);

    return projectileOwner;
  }
}

window.ExplosionSystem = ExplosionSystem;
