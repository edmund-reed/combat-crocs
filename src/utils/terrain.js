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
      },
    );

    return { y: groundY, body: groundBody };
  }

  // Create raised platforms based on map configuration
  static createPlatforms(scene, mapConfig) {
    const platforms = mapConfig.terrain.platforms || [];
    const processedPlatforms = []; // Return processed platform data for weapons system

    platforms.forEach((platformData, index) => {
      // Evaluate string Y positions (like "GAME_HEIGHT - 125") with Config context
      let yPos = platformData.y;
      if (typeof platformData.y === "string") {
        // Safely calculate expressions without eval
        if (platformData.y.includes("GAME_HEIGHT")) {
          const expression = platformData.y.replace(/GAME_HEIGHT/g, Config.GAME_HEIGHT.toString());
          // Simple cases: "GAME_HEIGHT - N"
          const match = expression.match(/(\d+)\s*-\s*(\d+)/);
          if (match) {
            yPos = parseInt(match[1]) - parseInt(match[2]);
          } else {
            console.warn(`Could not parse platform Y expression: ${expression}, using 0`);
            yPos = 0;
          }
        } else {
          yPos = parseFloat(platformData.y);
        }
      }

      // Draw platform terrain
      scene.terrain.fillStyle(Config.COLORS.BRIGHT_ORANGE);
      scene.terrain.fillRect(
        platformData.x - platformData.width / 2,
        yPos - platformData.height / 2,
        platformData.width,
        platformData.height,
      );

      // Create physics body
      scene.matter.add.rectangle(platformData.x, yPos, platformData.width, platformData.height, {
        isStatic: true,
        friction: 1.0,
        frictionStatic: 1.0,
        // Terrain collides with players (category 2)
        collisionFilter: {
          category: 1, // Terrain is in category 1
        },
      });

      // Store processed platform data for weapons blocking system
      processedPlatforms.push({
        x: platformData.x,
        y: yPos, // Use processed Y position
        width: platformData.width,
        height: platformData.height,
        name: `Platform ${index + 1}`,
      });
    });

    return processedPlatforms;
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
