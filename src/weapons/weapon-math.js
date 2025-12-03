class WeaponMath {
  static lineSegmentIntersection = (line, edge) => {
    const { x1, y1, x2, y2 } = line;
    const { x1: e1x, y1: e1y, x2: e2x, y2: e2y } = edge;

    const denom = (x1 - x2) * (e1y - e2y) - (y1 - y2) * (e1x - e2x);
    if (Math.abs(denom) < 1e-6) return null;

    const t = ((x1 - e1x) * (e1y - e2y) - (y1 - e1y) * (e1x - e2x)) / denom;
    const u = -((x1 - x2) * (y1 - e1y) - (y1 - y2) * (x1 - e1x)) / denom;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) } : null;
  };

  static lineRectIntersection(line, rect) {
    const { startX, startY, endX, endY } = line;
    const { x, y, width, height } = rect;
    const lineSeg = { x1: startX, y1: startY, x2: endX, y2: endY };
    const left = x,
      right = x + width,
      top = y,
      bottom = y + height;

    const edges = [
      [left, top, left, bottom],
      [right, top, right, bottom],
      [left, top, right, top],
      [left, bottom, right, bottom],
    ];

    for (const [e1x, e1y, e2x, e2y] of edges) {
      const intersection = this.lineSegmentIntersection(lineSeg, { x1: e1x, y1: e1y, x2: e2x, y2: e2y });
      if (intersection) return intersection;
    }
    return null;
  }

  static terrainBlocksPath(scene, startX, startY, endX, endY) {
    for (const platform of scene.currentMapPlatforms ?? []) {
      const intersection = this.lineRectIntersection({ startX, startY, endX, endY }, platform);
      if (intersection) return intersection;
    }
    return null;
  }

  // Generic hitscan along line - finds first player hit
  static hitscanAlongLine = (players, startX, startY, endX, endY, hitRadius = 25, maxRange = 1000) => {
    const shotX = endX - startX,
      shotY = endY - startY;
    const shotLength = Math.sqrt(shotX ** 2 + shotY ** 2);
    if (shotLength === 0) return null;

    const normShotX = shotX / shotLength,
      normShotY = shotY / shotLength;

    return (
      players
        .filter(p => p.id !== "N/A" && p.health > 0)
        .map(p => {
          const dx = p.x - startX,
            dy = p.y - startY;
          const projection = dx * normShotX + dy * normShotY;
          if (projection < 0 || projection > maxRange) return null;

          const perpX = startX + projection * normShotX;
          const perpY = startY + projection * normShotY;
          const distanceToLine = Math.sqrt((p.x - perpX) ** 2 + (p.y - perpY) ** 2);

          return distanceToLine <= hitRadius ? { player: p, distance: projection } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance)
        .at(0) ?? null
    );
  };
}

export default WeaponMath;
