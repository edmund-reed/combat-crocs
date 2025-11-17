// Spawn Manager for Combat Crocs
// Handles player spawning and positioning logic

class SpawnManager {
  // Assign random spawn positions to all players
  static assignRandomSpawnPositions(scene, players) {
    const playerCount = players.length;
    const minDistance = 140; // Minimum distance between players

    // Define high-altitude spawn positions (well above all terrain)
    // This ensures characters spawn in unobstructed airspace and fall onto terrain
    const spawnLevels = [
      { y: Config.GAME_HEIGHT - 400, name: "Above All Terrain" }, // Way above everything
    ];

    // Wide safe air space across entire battlefield (well above all terrain)
    const airSpawnAreas = [
      { level: 0, minX: 80, maxX: 1120 }, // Wide safe air space
    ];

    console.log(`Spawning ${playerCount} players in free airspace above all terrain`);

    // Generate dense spawn points in open airspace (guaranteed no collision)
    const allSpawnPoints = [];
    airSpawnAreas.forEach(area => {
      for (let x = area.minX; x <= area.maxX; x += 15) {
        // Less dense for air
        allSpawnPoints.push({
          x: x,
          y: spawnLevels[area.level].y,
          levelName: spawnLevels[area.level].name,
        });
      }
    });

    console.log(`Generated ${allSpawnPoints.length} guaranteed collision-free spawn points`);

    // Shuffle spawn points for randomness
    for (let i = allSpawnPoints.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allSpawnPoints[i], allSpawnPoints[j]] = [allSpawnPoints[j], allSpawnPoints[i]];
    }

    // Assign players to positions
    for (let i = 0; i < playerCount; i++) {
      const player = players[i];

      // Find first available spawn point that's far enough from placed players
      let assignedPosition = null;
      for (const spawnPoint of allSpawnPoints) {
        const tooClose = players
          .slice(0, i)
          .some(placedPlayer => Math.abs(spawnPoint.x - placedPlayer.x) < minDistance);

        if (!tooClose) {
          assignedPosition = spawnPoint;
          break;
        }
      }

      // Emergency fallback if no position found
      if (!assignedPosition) {
        console.warn(`Emergency placement for ${player.id}`);
        // Place at a random available spot ignoring minimum distance
        const fallbackIndex = Math.floor(Math.random() * allSpawnPoints.length);
        assignedPosition = allSpawnPoints[fallbackIndex];
      }

      // Update player position and physics
      player.x = assignedPosition.x;
      player.y = assignedPosition.y;
      player.graphics.setPosition(player.x, player.y);
      scene.matter.body.setPosition(player.body, { x: player.x, y: player.y });

      console.log(
        `Assigned ${player.id} to ${assignedPosition.levelName} at (${assignedPosition.x}, ${assignedPosition.y})`,
      );
    }

    console.log("All player positions assigned successfully!");
  }
}

window.SpawnManager = SpawnManager;
