/**
 * ExplosionManager - Handles explosion effects, damage calculation, and terrain blocking
 * Responsible for: Visual effects, damage application, line-of-sight calculations
 */

class ExplosionManager {
  static instance = null;

  constructor(scene) {
    this.scene = scene;
    this.explosionRenderer = new ExplosionRenderer(scene);
    console.log("💥 ExplosionManager initialized - handling combat logic");
  }

  static getInstance(scene) {
    if (!ExplosionManager.instance) {
      ExplosionManager.instance = new ExplosionManager(scene);
    }
    return ExplosionManager.instance;
  }

  /**
   * Create explosion effect at location
   */
  createExplosion(x, y, projectileOwner = null, weapon = null) {
    // Get weapon definition to determine explosion radius
    let weaponDef = null;
    if (weapon && WEAPON_DEFINITIONS[weapon]) {
      weaponDef = WEAPON_DEFINITIONS[weapon];
    } else {
      // Fallback to BAZOOKA if no weapon specified
      weaponDef = WEAPON_DEFINITIONS.BAZOOKA;
    }

    const radius = weaponDef.radius; // Weapon-specific blast radius!
    console.log(
      `ACTUAL EXPLOSION at (${x.toFixed(1)}, ${y.toFixed(1)}) from ${
        projectileOwner ? `Player ${projectileOwner}` : "timeout"
      } with ${weaponDef.name}. Radius: ${radius}`
    );

    // Delegate visual effects to ExplosionRenderer
    this.explosionRenderer.createExplosionEffect(x, y, projectileOwner);

    // Damage nearby players (check for terrain protection)
    this.scene.players.forEach((player, index) => {
      const distance = Phaser.Math.Distance.Between(x, y, player.x, player.y);
      console.log(
        `Player ${index + 1} distance: ${distance.toFixed(1)}, health: ${
          player.health
        }`
      );

      if (distance < radius) {
        // Special case: If this is the shooter's own explosion, no terrain protection
        const isOwnExplosion = projectileOwner === player.id;
        const blockedByTerrain = isOwnExplosion
          ? false
          : ExplosionManager.isExplosionBlockedByTerrain(
              this.scene,
              x,
              y,
              player.x,
              player.y
            );

        if (!blockedByTerrain) {
          const damage = Math.max(0, 100 - (distance / radius) * 75);
          console.log(
            `${isOwnExplosion ? "🎯 OWN" : "💥"} Player ${
              index + 1
            } hit for ${damage} damage`
          );

          // Use HealthBarManager to apply damage instead of direct health modification
          const healthBarManager = HealthBarManager.getInstance();
          healthBarManager.applyDamage(index + 1, damage); // Player ID is index + 1
        } else {
          console.log(
            `🛡️ Player ${index + 1} protected by terrain from explosion`
          );
        }
      }
    });

    return projectileOwner;
  }

  /**
   * Check if terrain blocks the explosion path to a player
   */
  static isExplosionBlockedByTerrain(
    scene,
    explosionX,
    explosionY,
    playerX,
    playerY
  ) {
    // Delegate to TerrainCollisionChecker for terrain collision logic
    return TerrainCollisionChecker.isExplosionBlockedByTerrain(
      scene,
      explosionX,
      explosionY,
      playerX,
      playerY
    );
  }
}

window.ExplosionManager = ExplosionManager;
