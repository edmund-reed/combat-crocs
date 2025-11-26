// Weapon collision math utilities for Combat Crocs
// Shared utilities for terrain collision detection and line intersection

class WeaponMath {
  // Simple line-rectangle intersection (returns intersection point)
  static lineRectIntersection(lineStartX, lineStartY, lineEndX, lineEndY, rectX, rectY, rectWidth, rectHeight) {
    const rectLeft = rectX;
    const rectRight = rectX + rectWidth;
    const rectTop = rectY;
    const rectBottom = rectY + rectHeight;

    // Function to get intersection with a line segment
    const getIntersection = (p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) => {
      const denom = (p1x - p2x) * (p3y - p4y) - (p1y - p2y) * (p3x - p4x);
      if (denom === 0) return null; // Parallel lines

      const t = ((p1x - p3x) * (p3y - p4y) - (p1y - p3y) * (p3x - p4x)) / denom;
      const u = -((p1x - p2x) * (p1y - p3y) - (p1y - p2y) * (p1x - p3x)) / denom;

      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
          x: p1x + t * (p2x - p1x),
          y: p1y + t * (p2y - p1y),
        };
      }
      return null;
    };

    // Check all four rectangle edges
    const lineX1 = lineStartX,
      lineY1 = lineStartY,
      lineX2 = lineEndX,
      lineY2 = lineEndY;

    // Left edge
    const hitLeft = getIntersection(lineX1, lineY1, lineX2, lineY2, rectLeft, rectTop, rectLeft, rectBottom);
    if (hitLeft) return hitLeft;

    // Right edge
    const hitRight = getIntersection(lineX1, lineY1, lineX2, lineY2, rectRight, rectTop, rectRight, rectBottom);
    if (hitRight) return hitRight;

    // Top edge
    const hitTop = getIntersection(lineX1, lineY1, lineX2, lineY2, rectLeft, rectTop, rectRight, rectTop);
    if (hitTop) return hitTop;

    // Bottom edge
    const hitBottom = getIntersection(lineX1, lineY1, lineX2, lineY2, rectLeft, rectBottom, rectRight, rectBottom);
    if (hitBottom) return hitBottom;

    return null; // No intersection
  }

  // Check if terrain blocks the direct path between two points (bulletproof terrain)
  static terrainBlocksPath(scene, startX, startY, endX, endY) {
    const platforms = scene.currentMapPlatforms || [];

    // Check if the line segment intersects ANY platform rectangle
    for (const platform of platforms) {
      const intersection = this.lineRectIntersection(
        startX,
        startY,
        endX,
        endY,
        platform.x,
        platform.y,
        platform.width,
        platform.height,
      );

      if (intersection) {
        return intersection; // Terrain intersection found - blocks the shot
      }
    }

    return null; // Clear path - no terrain intersections
  }
}

window.WeaponMath = WeaponMath;
