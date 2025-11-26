// Explosion physics utilities for Combat Crocs
// Handles terrain blocking and geometric calculations for explosions

class ExplosionPhysics {
  // Check if terrain blocks the explosion path to a player
  static isExplosionBlockedByTerrain(explosionX, explosionY, playerX, playerY, platforms, explosionRadius) {
    console.log(
      `Checking terrain blocking: explosion(${explosionX.toFixed(0)}, ${explosionY.toFixed(
        0,
      )}) to player(${playerX.toFixed(0)}, ${playerY.toFixed(0)}), platforms: ${
        platforms ? platforms.length : "UNDEFINED"
      }`,
    );

    // Fallback if platforms data is not available
    if (!platforms || !Array.isArray(platforms)) {
      console.log("⚠️ No platform data available, allowing damage");
      return false;
    }

    // Check if line of sight is blocked by any platform
    for (const platform of platforms) {
      if (this.platformBlocksPath(platform, explosionX, explosionY, playerX, playerY)) {
        console.log(`❌ BLOCKED by ${platform.name}`);
        return true;
      }
    }

    console.log("✅ No terrain blocking");
    return false;
  }

  // Check if a specific platform blocks damage to a player
  // Simple geometric blocking: if line crosses platform boundary, blocked
  static platformBlocksPath(platform, explosionX, explosionY, playerX, playerY) {
    const { x: platX, y: platY, width: platW, height: platH } = platform;

    // Platform bounds (axis-aligned rectangle)
    const platLeft = platX - platW / 2;
    const platRight = platX + platW / 2;
    const platTop = platY - platH / 2;
    const platBottom = platY + platH / 2;

    console.log(
      `Platform check: explosion(${explosionX.toFixed(0)}, ${explosionY.toFixed(0)}) → ` +
        `player(${playerX.toFixed(0)}, ${playerY.toFixed(0)}) vs platform ${platform.name} ` +
        `(rect: ${platLeft.toFixed(0)}-${platRight.toFixed(0)}, ${platTop.toFixed(0)}-${platBottom.toFixed(0)})`,
    );

    // Simple geometric blocking: if line from explosion to player crosses any platform edge, the platform blocks damage
    const lineSegment = {
      x1: explosionX,
      y1: explosionY,
      x2: playerX,
      y2: playerY,
    };

    // Check if line intersects solid platform rectangle
    if (
      this.lineIntersectsRectangle(explosionX, explosionY, playerX, playerY, platLeft, platTop, platRight, platBottom)
    ) {
      console.log(`🛡️ BLOCKED: Line passes through platform`);
      return true;
    }

    console.log(`❌ Platform not blocking`);
    return false;
  }

  // Check if line segment intersects a vertical line segment
  static lineIntersectsVertical(line, vertX, vertY1, vertY2) {
    const { x1, y1, x2, y2 } = line;

    // Line must cross x = vertX
    if ((x1 <= vertX && x2 <= vertX) || (x1 >= vertX && x2 >= vertX)) {
      return false; // Both points on same side of vertical line
    }

    // Calculate intersection y-value
    const t = (vertX - x1) / (x2 - x1);
    const intersectY = y1 + t * (y2 - y1);

    // Check if intersection point is within vertical line segment
    return intersectY >= Math.min(vertY1, vertY2) && intersectY <= Math.max(vertY1, vertY2);
  }

  // Check if line segment intersects a horizontal line segment
  static lineIntersectsHorizontal(line, horizY, horizX1, horizX2) {
    const { x1, y1, x2, y2 } = line;

    // Line must cross y = horizY
    if ((y1 <= horizY && y2 <= horizY) || (y1 >= horizY && y2 >= horizY)) {
      return false; // Both points on same side of horizontal line
    }

    // Calculate intersection x-value
    const t = (horizY - y1) / (y2 - y1);
    const intersectX = x1 + t * (x2 - x1);

    // Check if intersection point is within horizontal line segment
    return intersectX >= Math.min(horizX1, horizX2) && intersectX <= Math.max(horizX1, horizX2);
  }

  // Check if line segment intersects rectangle (comprehensive solid intersection)
  static lineIntersectsRectangle(x1, y1, x2, y2, rectLeft, rectTop, rectRight, rectBottom) {
    // Helper: point in rectangle
    const pointInRect = (px, py) => px >= rectLeft && px <= rectRight && py >= rectTop && py <= rectBottom;

    // Case 1: Either endpoint inside rectangle
    if (pointInRect(x1, y1) || pointInRect(x2, y2)) {
      return true; // Line touches or passes through rectangle interior
    }

    // Case 2: Line crosses rectangle boundaries (within boundary segments)
    const lineSegment = { x1, y1, x2, y2 };
    return (
      this.lineIntersectsVertical(lineSegment, rectLeft, rectTop, rectBottom) ||
      this.lineIntersectsVertical(lineSegment, rectRight, rectTop, rectBottom) ||
      this.lineIntersectsHorizontal(lineSegment, rectTop, rectLeft, rectRight) ||
      this.lineIntersectsHorizontal(lineSegment, rectBottom, rectLeft, rectRight)
    );
  }
}

window.ExplosionPhysics = ExplosionPhysics;
