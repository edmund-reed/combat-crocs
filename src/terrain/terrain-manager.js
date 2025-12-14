import { Config } from "@config";
import { Maps as MapManager, PhysicsManager } from "@utils";
import DecorationsManager from "./decorations.js";

class TerrainManager {
  static createGameTerrain(scene) {
    this.createGround(scene);
    const selectedMap = MapManager.getCurrentMap();
    scene.currentMapPlatforms = this.createPlatforms(scene, selectedMap);
    scene.decorations = DecorationsManager.createDecorations(scene, selectedMap);
    console.log(`🎮 Loaded ${scene.currentMapPlatforms.length} platforms for map: ${selectedMap.name}`);
  }

  static createGround(scene) {
    const groundY = Config.GAME_HEIGHT - 100;
    const selectedMap = MapManager.getCurrentMap();
    const textureKey = selectedMap.terrain?.groundTexture || "terrain";

    if (scene.textures.exists(textureKey)) {
      const scale = 100 / scene.textures.get(textureKey).source[0].height;
      scene.groundTile = scene.add
        .tileSprite(0, groundY, Config.GAME_WIDTH, 100, textureKey)
        .setOrigin(0, 0)
        .setDepth(-5);
      scene.groundTile.tileScaleX = scene.groundTile.tileScaleY = scale;
    } else {
      scene.add.graphics().fillStyle(Config.COLORS.ORANGE).fillRect(0, groundY, Config.GAME_WIDTH, 100);
    }

    scene.terrain = scene.add.graphics();
    PhysicsManager.createTerrainBody(
      scene,
      Config.GAME_WIDTH / 2,
      Config.GAME_HEIGHT - 50,
      Config.GAME_WIDTH,
      100,
    );
  }

  static createPlatforms(scene, mapConfig) {
    return (mapConfig.terrain.platforms || []).map((platformData, index) => {
      const yPos = this.parseYPosition(platformData.y);
      const platX = platformData.x - platformData.width / 2;
      const platY = yPos - platformData.height / 2;

      if (scene.textures.exists("brick")) {
        const scale = 50 / scene.textures.get("brick").source[0].height;
        const platTile = scene.add
          .tileSprite(platX, platY, platformData.width, platformData.height, "brick")
          .setOrigin(0, 0)
          .setDepth(-4);
        platTile.tileScaleX = platTile.tileScaleY = scale;
      } else {
        scene.terrain
          .fillStyle(Config.COLORS.BRIGHT_ORANGE)
          .fillRect(platX, platY, platformData.width, platformData.height);
      }

      PhysicsManager.createTerrainBody(scene, platformData.x, yPos, platformData.width, platformData.height);
      return {
        x: platX,
        y: platY,
        width: platformData.width,
        height: platformData.height,
        name: `Platform ${index + 1}`,
      };
    });
  }

  static parseYPosition(y) {
    if (typeof y === "string" && y.includes("GAME_HEIGHT")) {
      const match = y.replace(/GAME_HEIGHT/g, String(Config.GAME_HEIGHT)).match(/(\d+)\s*-\s*(\d+)/);
      return match ? Number(match[1]) - Number(match[2]) : Config.GAME_HEIGHT;
    }
    return typeof y === "string" ? Number(y) : y;
  }

  static getSafeSpawnPositions = () => ({ player1: { x: 150 }, player2: { x: 1000 } });
}

export default TerrainManager;
