import { Config } from "@config";
import PhysicsManager from "./physics-manager.js";
import MapManager from "./maps.js";

class TerrainManager {
  static createGround(scene) {
    const groundY = Config.GAME_HEIGHT - 100;

    // Base graphics layer for terrain (used by platforms and as a fallback)
    const terrainGfx = scene.add.graphics();

    // Visual ground texture using repeat-x if available
    if (scene.textures.exists("terrain")) {
      const texture = scene.textures.get("terrain");
      const texHeight = texture.source[0].height;
      const scale = 100 / texHeight; // Scale proportionally to fit 100px height
      const groundTile = scene.add
        .tileSprite(0, groundY, Config.GAME_WIDTH, 100, "terrain")
        .setOrigin(0, 0)
        .setDepth(-5);
      // Scale both X and Y proportionally so texture repeats at correct aspect ratio
      groundTile.tileScaleX = scale;
      groundTile.tileScaleY = scale;
      scene.groundTile = groundTile;
    } else {
      // Fallback: solid colour ground if texture missing
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

      // Use brick texture if available, otherwise fallback to solid color
      if (scene.textures.exists("brick")) {
        const texture = scene.textures.get("brick");
        const texSize = texture.source[0].height; // Brick is 626x626
        const targetBrickSize = 50; // Fixed display size for consistent appearance
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

  static getSafeSpawnPositions = () => ({ player1: { x: 150 }, player2: { x: 1000 } });

  static createGameTerrain(scene) {
    this.createGround(scene);
    const selectedMap = MapManager.getCurrentMap();
    scene.currentMapPlatforms = this.createPlatforms(scene, selectedMap);
    console.log(`🎮 Loaded ${scene.currentMapPlatforms.length} platforms for map: ${selectedMap.name}`);
  }
}

export default TerrainManager;
