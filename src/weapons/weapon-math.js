// Weapon collision math utilities for Combat Crocs
// Shared utilities for terrain collision detection and line intersection

class WeaponMath {
  // Line-line segment intersection helper
  static lineSegmentIntersection = (line, edge) => {
    const { x1, y1, x2, y2 } = line;
    const { x1: e1x, y1: e1y, x2: e2x, y2: e2y } = edge;

    const denom = (x1 - x2) * (e1y - e2y) - (y1 - y2) * (e1x - e2x);
    if (Math.abs(denom) < 1e-6) return null; // Near-parallel lines

    const t = ((x1 - e1x) * (e1y - e2y) - (y1 - e1y) * (e1x - e2x)) / denom;
    const u = -((x1 - x2) * (y1 - e1y) - (y1 - y2) * (x1 - e1x)) / denom;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) } : null;
  };

  // Line-rectangle intersection with modern syntax
  static lineRectIntersection(line, rect) {
    const { startX, startY, endX, endY } = line;
    const { x, y, width, height } = rect;
    const bounds = { left: x, right: x + width, top: y, bottom: y + height };

    const lineSeg = { x1: startX, y1: startY, x2: endX, y2: endY };
    const { left, right, top, bottom } = bounds;

    // Four rectangle edges: [e1x, e1y, e2x, e2y]
    const edges = [
      [left, top, left, bottom], // Left vertical
      [right, top, right, bottom], // Right vertical
      [left, top, right, top], // Top horizontal
      [left, bottom, right, bottom], // Bottom horizontal
    ];

    for (const [e1x, e1y, e2x, e2y] of edges) {
      const intersection = this.lineSegmentIntersection(lineSeg, { x1: e1x, y1: e1y, x2: e2x, y2: e2y });
      if (intersection) return intersection;
    }

    return null;
  }

  // Check if terrain blocks path between points
  static terrainBlocksPath(scene, startX, startY, endX, endY) {
    const platforms = scene.currentMapPlatforms ?? [];

    for (const platform of platforms) {
      const intersection = this.lineRectIntersection(
        { startX, startY, endX, endY },
        { x: platform.x, y: platform.y, width: platform.width, height: platform.height },
      );
      if (intersection) return intersection; // Terrain blocks path
    }

    return null; // Clear shot
  }
}

window.WeaponMath = WeaponMath;
