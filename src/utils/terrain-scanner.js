// Terrain Scanner Utility for AI Spatial Awareness
// Performs 8-directional raycasts to detect nearby terrain

class TerrainScanner {
  // Scan terrain in 8 cardinal directions from a point
  static scanTerrainDistances(scene, playerX, playerY, maxDistance = 500) {
    if (!scene?.matter?.world?.localWorld?.bodies) {
      return this.getDefaultDistances();
    }

    const angles = [
      0, // RIGHT (0°)
      Math.PI / 4, // DOWN-RIGHT (45°) - Phaser Y-axis points DOWN!
      Math.PI / 2, // DOWN (90°)
      (3 * Math.PI) / 4, // DOWN-LEFT (135°)
      Math.PI, // LEFT (180°)
      (5 * Math.PI) / 4, // UP-LEFT (225°)
      (3 * Math.PI) / 2, // UP (270°)
      (7 * Math.PI) / 4, // UP-RIGHT (315°)
    ];

    const distances = [];
    const bodies = scene.matter.world.localWorld.bodies;
    const Query = Phaser.Physics.Matter.Matter.Query;

    angles.forEach(angle => {
      // FIXED: Use point sampling instead of raycast (more reliable!)
      // Sample points along the ray direction until we hit terrain
      let closestDist = maxDistance;
      const stepSize = 10; // Check every 10 pixels

      for (let dist = stepSize; dist <= maxDistance; dist += stepSize) {
        const testX = playerX + Math.cos(angle) * dist;
        const testY = playerY + Math.sin(angle) * dist;

        // Check if this point collides with any terrain body
        const hitBodies = Query.point(bodies, { x: testX, y: testY });

        const terrainHit = hitBodies.find(body => body.isTerrain);
        if (terrainHit) {
          closestDist = dist;
          break; // Found terrain, stop searching this direction
        }
      }

      distances.push(closestDist);
    });

    const minimum = Math.min(...distances);

    return {
      directions: distances, // [right, upRight, up, upLeft, left, downLeft, down, downRight]
      minimum: minimum,
      safetyMargin: minimum - 140, // 140 = bazooka blast radius
      directionNames: ["right", "upRight", "up", "upLeft", "left", "downLeft", "down", "downRight"],
    };
  }

  // Get terrain distance in a specific direction (angle in radians)
  static getDistanceInDirection(terrainData, angle) {
    // Normalize angle to 0-2π
    const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // Find closest direction (0, 45, 90, 135, 180, 225, 270, 315 degrees)
    const directions = 8;
    const anglePerDirection = (Math.PI * 2) / directions;
    const directionIndex = Math.round(normalizedAngle / anglePerDirection) % directions;

    return terrainData.directions[directionIndex];
  }

  // Check if shooting in a direction is safe
  static isSafeDirection(terrainData, angle, blastRadius = 140, safetyMargin = 50) {
    const distanceInDirection = this.getDistanceInDirection(terrainData, angle);
    return distanceInDirection > blastRadius + safetyMargin;
  }

  // Default distances when scene not ready
  static getDefaultDistances() {
    return {
      directions: [500, 500, 500, 500, 500, 500, 500, 500],
      minimum: 500,
      safetyMargin: 360,
      directionNames: ["right", "upRight", "up", "upLeft", "left", "downLeft", "down", "downRight"],
    };
  }

  // Debug visualization (optional)
  static visualizeRays(scene, playerX, playerY, terrainData, graphics) {
    if (!graphics) return;

    graphics.clear();

    const angles = [
      0,
      Math.PI / 4,
      Math.PI / 2,
      (3 * Math.PI) / 4,
      Math.PI,
      (5 * Math.PI) / 4,
      (3 * Math.PI) / 2,
      (7 * Math.PI) / 4,
    ];

    angles.forEach((angle, index) => {
      const distance = terrainData.directions[index];
      const endX = playerX + Math.cos(angle) * distance;
      const endY = playerY + Math.sin(angle) * distance;

      // Color: green if safe, yellow if marginal, red if dangerous
      const color = distance > 190 ? 0x00ff00 : distance > 140 ? 0xffff00 : 0xff0000;

      graphics.lineStyle(2, color, 0.5);
      graphics.lineBetween(playerX, playerY, endX, endY);
      graphics.fillStyle(color, 0.8);
      graphics.fillCircle(endX, endY, 5);
    });
  }
}

export default TerrainScanner;
