/**
 * TerrainCollisionChecker.js - Handles terrain collision detection for explosions and projectiles
 * Responsible for: Line-of-sight calculations, terrain blocking logic
 */

class TerrainCollisionChecker {
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
      const blocked = TerrainCollisionChecker.platformBlocksPath(
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

  /**
   * Check if a projectile path is blocked by terrain
   */
  static isProjectilePathBlocked(scene, projectile, targetPlayer) {
    // Check if terrain blocks the projectile's path to target
    // This is a simplified version - could be enhanced with ray casting

    // For now, just use basic platform intersection
    const platforms = [
      { x: 400, y: 575, width: 200, height: 50, name: "Left Platform" },
      { x: 700, y: 525, width: 150, height: 50, name: "Middle Platform" },
      { x: 950, y: 475, width: 100, height: 50, name: "Right Platform" },
    ];

    for (const platform of platforms) {
      // Simple bounding box intersection
      const projectileRect = {
        left: projectile.x - 5,
        right: projectile.x + 5,
        top: projectile.y - 5,
        bottom: projectile.y + 5,
      };

      const platformRect = {
        left: platform.x - platform.width / 2,
        right: platform.x + platform.width / 2,
        top: platform.y - platform.height / 2,
        bottom: platform.y + platform.height / 2,
      };

      if (
        TerrainCollisionChecker.rectsIntersect(projectileRect, platformRect)
      ) {
        console.log(`🎯 Terrain hit! Projectile hit ${platform.name}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Helper: Check if two rectangles intersect
   */
  static rectsIntersect(rect1, rect2) {
    return !(
      rect1.right < rect2.left ||
      rect1.left > rect2.right ||
      rect1.bottom < rect2.top ||
      rect1.top > rect2.bottom
    );
  }

  /**
   * Get the closest platform to a given position
   */
  static getClosestPlatform(positionX, positionY) {
    const platforms = [
      { x: 400, y: 575, width: 200, height: 50, name: "Left Platform" },
      { x: 700, y: 525, width: 150, height: 50, name: "Middle Platform" },
      { x: 950, y: 475, width: 100, height: 50, name: "Right Platform" },
    ];

    let closestPlatform = null;
    let closestDistance = Infinity;

    platforms.forEach((platform) => {
      const distance = Phaser.Math.Distance.Between(
        positionX,
        positionY,
        platform.x,
        platform.y
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestPlatform = platform;
      }
    });

    return closestPlatform;
  }
}

window.TerrainCollisionChecker = TerrainCollisionChecker;
