import { Config } from "@config";
import PhysicsManager from "./physics-manager.js";
import MapManager from "./maps.js";

class TerrainManager {
  static createGround(scene) {
    const groundY = Config.GAME_HEIGHT - 100;
    scene.terrain = scene.add.graphics().fillStyle(Config.COLORS.ORANGE).fillRect(0, groundY, Config.GAME_WIDTH, 100);
    return {
      y: groundY,
      body: PhysicsManager.createTerrainBody(
        scene,
        Config.GAME_WIDTH / 2,
        Config.GAME_HEIGHT - 50,
        Config.GAME_WIDTH,
        100,
      ),
    };
  }

  static createPlatforms(scene, mapConfig) {
    return (mapConfig.terrain.platforms || []).map((platformData, index) => {
      let yPos = platformData.y;
      if (typeof platformData.y === "string" && platformData.y.includes("GAME_HEIGHT")) {
        const match = platformData.y.replace(/GAME_HEIGHT/g, Config.GAME_HEIGHT.toString()).match(/(\d+)\s*-\s*(\d+)/);
        yPos = match
          ? parseInt(match[1]) - parseInt(match[2])
          : (console.warn(`Could not parse: ${platformData.y}`), 0);
      } else if (typeof platformData.y === "string") {
        yPos = parseFloat(platformData.y);
      }

      scene.terrain
        .fillStyle(Config.COLORS.BRIGHT_ORANGE)
        .fillRect(
          platformData.x - platformData.width / 2,
          yPos - platformData.height / 2,
          platformData.width,
          platformData.height,
        );
      PhysicsManager.createTerrainBody(scene, platformData.x, yPos, platformData.width, platformData.height);

      return {
        x: platformData.x - platformData.width / 2,
        y: yPos - platformData.height / 2,
        width: platformData.width,
        height: platformData.height,
        name: `Platform ${index + 1}`,
      };
    });
  }

  static getSafeSpawnPositions = () => ({ player1: { x: 150 }, player2: { x: 1000 } });

  static createGameTerrain(scene) {
    this.createGround(scene);
    const selectedMap = MapManager.getCurrentMap();
    scene.currentMapPlatforms = this.createPlatforms(scene, selectedMap);
    console.log(`🎮 Loaded ${scene.currentMapPlatforms.length} platforms for map: ${selectedMap.name}`);
  }
}

export default TerrainManager;
