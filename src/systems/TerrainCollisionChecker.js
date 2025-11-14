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
    // Platform positions from TerrainManager (hardcoded for now)
    const platforms = [
      { x: 400, y: 575, width: 200, height: 50, name: "Left Platform" },
      { x: 700, y: 525, width: 150, height: 50, name: "Middle Platform" },
      { x: 950, y: 475, width: 100, height: 50, name: "Right Platform" },
    ];

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

    // PROTECTION LOGIC: Shield only when platform physically blocks blast path

    // ✅ PROTECT: Platform BETWEEN explosion and player
    if (explosionSide === "above" && playerSide === "below") {
      return true;
    }

    // ✅ PROTECT: Platform beside blocks horizontal blast
    if (explosionSide === "beside" && playerSide === "below") {
      return true;
    }

    // ❌ NO PROTECTION: Explosion and player on same "vertical side"
    // Special case: Player shooting upward at platform above them
    if (explosionSide === "below" && playerSide === "below") {
      return false;
    }

    // Side-by-side or above-together scenarios
    if (explosionSide === playerSide) {
      return false;
    }

    // Add protection for traditional horizontal scenarios
    const explosionLeftOfPlatform = explosionX < platLeft;
    const playerRightOfPlatform = playerX > platRight;
    if (explosionLeftOfPlatform && playerRightOfPlatform) {
      return true;
    }

    const explosionRightOfPlatform = explosionX > platRight;
    const playerLeftOfPlatform = playerX < platLeft;
    if (explosionRightOfPlatform && playerLeftOfPlatform) {
      return true;
    }

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
