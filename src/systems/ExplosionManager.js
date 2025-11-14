/**
 * ExplosionManager - Handles explosion effects, damage calculation, and terrain blocking
 * Responsible for: Visual effects, damage application, line-of-sight calculations
 */

class ExplosionManager {
  static instance = null;

  constructor(scene) {
    this.scene = scene;
    console.log("💥 ExplosionManager initialized");
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
  createExplosion(x, y, projectileOwner = null) {
    const radius = 200; // Much larger for development testing
    console.log(
      `ACTUAL EXPLOSION at (${x.toFixed(1)}, ${y.toFixed(1)}) from ${
        projectileOwner ? `Player ${projectileOwner}` : "timeout"
      }. Radius: ${radius}`
    );

    // Explosion graphics
    const explosion = this.scene.add.graphics({ x: x, y: y });
    explosion.fillStyle(0xff4500);
    explosion.fillCircle(0, 0, radius);

    this.scene.tweens.add({
      targets: explosion,
      scaleX: 0,
      scaleY: 0,
      duration: 300,
      onComplete: () => explosion.destroy(),
    });

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

    // Screen shake
    this.scene.cameras.main.shake(200, 0.02);

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
    // Simple terrain blocking check - check if there's a platform between explosion and player

    console.log(
      `Checking terrain blocking: explosion(${explosionX.toFixed(
        0
      )}, ${explosionY.toFixed(0)}) to player(${playerX.toFixed(
        0
      )}, ${playerY.toFixed(0)})`
    );

    // Platform positions from TerrainManager (hardcoded for now)
    const platforms = [
      { x: 400, y: 575, width: 200, height: 50, name: "Left Platform" },
      { x: 700, y: 525, width: 150, height: 50, name: "Middle Platform" },
      { x: 950, y: 475, width: 100, height: 50, name: "Right Platform" },
    ];

    // Check each platform
    for (const platform of platforms) {
      const blocked = ExplosionManager.platformBlocksPath(
        platform,
        explosionX,
        explosionY,
        playerX,
        playerY
      );

      if (blocked) {
        console.log(
          `❌ BLOCKED by ${platform.name} at (${platform.x}, ${platform.y})`
        );
        return true;
      } else {
        console.log(
          `✅ ${platform.name} at (${platform.x}, ${platform.y}) does NOT block`
        );
      }
    }

    console.log("✅ No terrain blocking found");
    return false;
  }

  /**
   * Check if a specific platform blocks the line of sight
   */
  static platformBlocksPath(
    platform,
    explosionX,
    explosionY,
    playerX,
    playerY
  ) {
    const { x: platX, y: platY, width: platW, height: platH } = platform;

    console.log(
      `Checking platform ${platform.name}: explosion(${explosionX.toFixed(
        0
      )}, ${explosionY.toFixed(0)}) vs player(${playerX.toFixed(
        0
      )}, ${playerY.toFixed(0)})`
    );

    // Platform bounds
    const platLeft = platX - platW / 2;
    const platRight = platX + platW / 2;
    const platTop = platY - platH / 2;
    const platBottom = platY + platH / 2;

    // Calculate if platform is BETWEEN explosion and player (line-of-sight blocking)
    // This is geometric line segment intersection, but simplified:

    // Check if the platform blocks the direct path from explosion to player
    const explosionSide =
      explosionY <= platTop
        ? "above"
        : explosionY >= platBottom
        ? "below"
        : "beside";
    const playerSide =
      playerY <= platTop ? "above" : playerY >= platBottom ? "below" : "beside";

    console.log(
      `Explosion position: ${explosionSide} platform, Player position: ${playerSide} platform`
    );

    // PROTECTION LOGIC: Shield only when platform physically blocks blast path

    // ✅ PROTECT: Platform BETWEEN explosion and player
    if (explosionSide === "above" && playerSide === "below") {
      console.log(
        `🎯 PROTECTION: Platform above blocks explosion from reaching below`
      );
      return true;
    }

    // ✅ PROTECT: Platform beside blocks horizontal blast
    if (explosionSide === "beside" && playerSide === "below") {
      console.log(
        `🎯 PROTECTION: Platform beside blocks explosion from reaching below`
      );
      return true;
    }

    // ❌ NO PROTECTION: Explosion and player on same "vertical side"
    // Special case: Player shooting upward at platform above them
    if (explosionSide === "below" && playerSide === "below") {
      console.log(
        `❌ NO PROTECTION: Explosion below platform, player below - no shield`
      );
      return false;
    }

    // Side-by-side or above-together scenarios
    if (explosionSide === playerSide) {
      console.log(
        `❌ NO PROTECTION: Explosion (${explosionSide}) same side as player (${playerSide})`
      );
      return false;
    }

    // Add protection for traditional horizontal scenarios
    const explosionLeftOfPlatform = explosionX < platLeft;
    const playerRightOfPlatform = playerX > platRight;
    if (explosionLeftOfPlatform && playerRightOfPlatform) {
      console.log(
        `🛡️ HORIZONTAL PROTECTION: Right side shielded from explosion`
      );
      return true;
    }

    const explosionRightOfPlatform = explosionX > platRight;
    const playerLeftOfPlatform = playerX < platLeft;
    if (explosionRightOfPlatform && playerLeftOfPlatform) {
      console.log(
        `🛡️ HORIZONTAL PROTECTION: Left side shielded from explosion`
      );
      return true;
    }

    console.log(`❌ No line-of-sight protection from ${platform.name}`);
    return false;
  }
}

window.ExplosionManager = ExplosionManager;
