// Terrain utilities for Combat Crocs

class TerrainManager {
  // Create simple flat ground
  static createGround(scene) {
    const groundY = Config.GAME_HEIGHT - 100;

    // Draw ground
    scene.terrain = scene.add.graphics();
    scene.terrain.fillStyle(Config.COLORS.ORANGE);
    scene.terrain.fillRect(0, groundY, Config.GAME_WIDTH, 100);

    // Create physics body
    const groundBody = scene.matter.add.rectangle(
      Config.GAME_WIDTH / 2,
      Config.GAME_HEIGHT - 50,
      Config.GAME_WIDTH,
      100,
      {
        isStatic: true,
        friction: 1.0,
        frictionStatic: 1.0,
        // Terrain collides with players (category 2)
        collisionFilter: {
          category: 1, // Terrain is in category 1
        },
      }
    );

    return { y: groundY, body: groundBody };
  }

  // Create raised platforms
  static createPlatforms(scene) {
    const platforms = [
      { x: 400, y: Config.GAME_HEIGHT - 125, width: 200, height: 50 }, // Ground-touching hill
      { x: 700, y: Config.GAME_HEIGHT - 175, width: 150, height: 50 }, // Medium hill
      { x: 950, y: Config.GAME_HEIGHT - 225, width: 100, height: 50 }, // High hill
    ];

    platforms.forEach((platform) => {
      // Draw platform terrain
      scene.terrain.fillStyle(Config.COLORS.BRIGHT_ORANGE);
      scene.terrain.fillRect(
        platform.x - platform.width / 2,
        platform.y - platform.height / 2,
        platform.width,
        platform.height
      );

      // Create physics body
      scene.matter.add.rectangle(
        platform.x,
        platform.y,
        platform.width,
        platform.height,
        {
          isStatic: true,
          friction: 1.0,
          frictionStatic: 1.0,
          // Terrain collides with players (category 2)
          collisionFilter: {
            category: 1, // Terrain is in category 1
          },
        }
      );
    });
  }

  // Get safe spawn positions (clear of platforms)
  static getSafeSpawnPositions() {
    // Avoid collision with platforms at x=400, x=700, x=950
    return {
      player1: { x: 150 }, // Left side, clear of left platform
      player2: { x: 1000 }, // Right side, clear of right platform
    };
  }
}

window.TerrainManager = TerrainManager;
