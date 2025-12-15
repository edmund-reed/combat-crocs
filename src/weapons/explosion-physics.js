class ExplosionPhysics {
  // Raycast-based blocker using actual Matter bodies (including PhysicsEditor polygons).
  static isExplosionBlockedByTerrain(explosionX, explosionY, playerX, playerY, scene) {
    if (!scene?.matter?.world?.localWorld?.bodies) return false;

    const bodies = scene.matter.world.localWorld.bodies;
    const start = { x: explosionX, y: explosionY };
    const end = { x: playerX, y: playerY };

    // Query ray against all bodies; filter to terrain-tagged bodies only.
    const hits = Phaser.Physics.Matter.Matter.Query.ray(bodies, start, end);

    return hits.some(hit => hit.body && hit.body.isTerrain);
  }

  // Debug helper (legacy rectangle-based LOS); kept for reference.
  static getBlockingPlatform(explosionX, explosionY, playerX, playerY, platforms) {
    if (!platforms?.length) return null;
    return (
      platforms.find(platform =>
        this.platformBlocksPath(platform, explosionX, explosionY, playerX, playerY),
      ) || null
    );
  }

  static platformBlocksPath(platform, explosionX, explosionY, playerX, playerY) {
    const { x: platX, y: platY, width: platW, height: platH } = platform;
    const platLeft = platX,
      platRight = platX + platW,
      platTop = platY,
      platBottom = platY + platH;

    const lineSegment = { x1: explosionX, y1: explosionY, x2: playerX, y2: playerY };

    return (
      this.lineIntersectsVertical(lineSegment, platLeft, platTop, platBottom) ||
      this.lineIntersectsVertical(lineSegment, platRight, platTop, platBottom) ||
      this.lineIntersectsHorizontal(lineSegment, platTop, platLeft, platRight) ||
      this.lineIntersectsHorizontal(lineSegment, platBottom, platLeft, platRight)
    );
  }

  static lineIntersectsVertical(line, vertX, vertY1, vertY2) {
    const { x1, y1, x2, y2 } = line;
    if ((x1 <= vertX && x2 <= vertX) || (x1 >= vertX && x2 >= vertX)) return false;
    const t = (vertX - x1) / (x2 - x1);
    const intersectY = y1 + t * (y2 - y1);
    return intersectY >= Math.min(vertY1, vertY2) && intersectY <= Math.max(vertY1, vertY2);
  }

  static lineIntersectsHorizontal(line, horizY, horizX1, horizX2) {
    const { x1, y1, x2, y2 } = line;
    if ((y1 <= horizY && y2 <= horizY) || (y1 >= horizY && y2 >= horizY)) return false;
    const t = (horizY - y1) / (y2 - y1);
    const intersectX = x1 + t * (x2 - x1);
    return intersectX >= Math.min(horizX1, horizX2) && intersectX <= Math.max(horizX1, horizX2);
  }
}

export default ExplosionPhysics;
