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
    const terrainGfx = scene.add.graphics();

    const selectedMapId = window.CombatCrocs?.gameState?.game?.selectedMap || MapManager.getCurrentMap().id;
    const groundTextureKey = selectedMapId === "heavyMetalCoaster" ? "terrain-2" : "terrain";

    if (scene.textures.exists(groundTextureKey)) {
      const texture = scene.textures.get(groundTextureKey);
      const texHeight = texture.source[0].height;
      const scale = 100 / texHeight;
      const groundTile = scene.add
        .tileSprite(0, groundY, Config.GAME_WIDTH, 100, groundTextureKey)
        .setOrigin(0, 0)
        .setDepth(-5);
      groundTile.tileScaleX = scale;
      groundTile.tileScaleY = scale;
      scene.groundTile = groundTile;
    } else {
      terrainGfx.fillStyle(Config.COLORS.ORANGE).fillRect(0, groundY, Config.GAME_WIDTH, 100);
    }

    scene.terrain = terrainGfx;

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
        const match = platformData.y
          .replace(/GAME_HEIGHT/g, Config.GAME_HEIGHT.toString())
          .match(/(\d+)\s*-\s*(\d+)/);
        yPos = match
          ? parseInt(match[1]) - parseInt(match[2])
          : (console.warn(`Could not parse: ${platformData.y}`), 0);
      } else if (typeof platformData.y === "string") {
        yPos = parseFloat(platformData.y);
      }

      const platX = platformData.x - platformData.width / 2;
      const platY = yPos - platformData.height / 2;

      if (scene.textures.exists("brick")) {
        const texture = scene.textures.get("brick");
        const texSize = texture.source[0].height;
        const targetBrickSize = 50;
        const scale = targetBrickSize / texSize;
        const platTile = scene.add
          .tileSprite(platX, platY, platformData.width, platformData.height, "brick")
          .setOrigin(0, 0)
          .setDepth(-4);
        platTile.tileScaleX = scale;
        platTile.tileScaleY = scale;
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
      const match = y.replace(/GAME_HEIGHT/g, Config.GAME_HEIGHT.toString()).match(/(\d+)\s*-\s*(\d+)/);
      return match ? parseInt(match[1]) - parseInt(match[2]) : Config.GAME_HEIGHT;
    }
    return typeof y === "string" ? parseFloat(y) : y;
  }

  static getSafeSpawnPositions = () => ({ player1: { x: 150 }, player2: { x: 1000 } });
}

export default TerrainManager;
