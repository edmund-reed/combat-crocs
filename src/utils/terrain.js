import { Config } from "@config";
import PhysicsManager from "./physics-manager.js";
import MapManager from "./maps.js";

class TerrainManager {
  static createGround(scene) {
    const groundY = Config.GAME_HEIGHT - 100;

    // Base graphics layer for terrain (used by platforms and as a fallback)
    const terrainGfx = scene.add.graphics();

    // Choose ground texture per map (terrain-2 for Heavy Metal Coaster, terrain for others)
    const selectedMapId = window.CombatCrocs?.gameState?.game?.selectedMap || MapManager.getCurrentMap().id;
    const groundTextureKey = selectedMapId === "heavyMetalCoaster" ? "terrain-2" : "terrain";

    // Visual ground texture using repeat-x if available
    if (scene.textures.exists(groundTextureKey)) {
      const texture = scene.textures.get(groundTextureKey);
      const texHeight = texture.source[0].height;
      const scale = 100 / texHeight; // Scale proportionally to fit 100px height
      const groundTile = scene.add
        .tileSprite(0, groundY, Config.GAME_WIDTH, 100, groundTextureKey)
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

  static parseYPosition(y) {
    if (typeof y === "string" && y.includes("GAME_HEIGHT")) {
      const match = y.replace(/GAME_HEIGHT/g, Config.GAME_HEIGHT.toString()).match(/(\d+)\s*-\s*(\d+)/);
      return match ? parseInt(match[1]) - parseInt(match[2]) : Config.GAME_HEIGHT;
    }
    return typeof y === "string" ? parseFloat(y) : y;
  }

  static _createTerrainFromTexture(scene, sprite, textureKey) {
    const texture = scene.textures.get(textureKey);
    if (!texture) {
      console.warn(`collisionFromTexture: texture "${textureKey}" not found`);
      return;
    }

    const frame = texture.get();
    const texW = frame.width;
    const texH = frame.height;
    if (!texW || !texH) return;

    const displayWidth = sprite.displayWidth;
    const displayHeight = sprite.displayHeight;
    const originX = sprite.originX;
    const originY = sprite.originY;

    const worldLeft = sprite.x - displayWidth * originX;
    const worldTop = sprite.y - displayHeight * originY;

    const alphaThreshold = 10;
    const cellSizeTexX = 4;
    const cellSizeTexY = 4;

    const cols = Math.ceil(texW / cellSizeTexX);
    const rows = Math.ceil(texH / cellSizeTexY);
    const solid = Array.from({ length: rows }, () => Array(cols).fill(false));

    // Build occupancy grid: a cell is solid if any pixel in it is opaque
    for (let cy = 0; cy < rows; cy++) {
      const tyStart = cy * cellSizeTexY;
      const tyEnd = Math.min(tyStart + cellSizeTexY, texH);
      for (let cx = 0; cx < cols; cx++) {
        const txStart = cx * cellSizeTexX;
        const txEnd = Math.min(txStart + cellSizeTexX, texW);

        let cellSolid = false;
        for (let ty = tyStart; ty < tyEnd && !cellSolid; ty++) {
          for (let tx = txStart; tx < txEnd; tx++) {
            const alpha = scene.textures.getPixelAlpha(tx, ty, textureKey);
            if (alpha > alphaThreshold) {
              cellSolid = true;
              break;
            }
          }
        }
        solid[cy][cx] = cellSolid;
      }
    }

    // Store collision grid for optional runtime penetration fixes
    scene._textureCollision = scene._textureCollision || {};
    scene._textureCollision[textureKey] = {
      solid,
      cols,
      rows,
      cellSizeTexX,
      cellSizeTexY,
      texW,
      texH,
      worldLeft,
      worldTop,
      displayWidth,
      displayHeight,
    };

    // Convert solid cells into rectangles row by row (merge horizontal runs)
    for (let cy = 0; cy < rows; cy++) {
      let runStart = -1;
      for (let cx = 0; cx <= cols; cx++) {
        const isSolid = cx < cols ? solid[cy][cx] : false;

        if (isSolid && runStart === -1) {
          runStart = cx;
        } else if (!isSolid && runStart !== -1) {
          const runEnd = cx - 1;

          const minTx = runStart * cellSizeTexX;
          const maxTx = Math.min((runEnd + 1) * cellSizeTexX, texW) - 1;
          const minTy = cy * cellSizeTexY;
          const maxTy = Math.min((cy + 1) * cellSizeTexY, texH) - 1;

          const uCenter = (minTx + maxTx) / 2 / texW;
          const vCenter = (minTy + maxTy) / 2 / texH;
          const uWidth = (maxTx - minTx + 1) / texW;
          const vHeight = (maxTy - minTy + 1) / texH;

          const worldX = worldLeft + uCenter * displayWidth;
          const worldY = worldTop + vCenter * displayHeight;
          const worldW = displayWidth * uWidth;
          const worldH = displayHeight * vHeight;

          PhysicsManager.createTerrainBody(scene, worldX, worldY, worldW, worldH);

          scene.currentMapPlatforms.push({
            x: worldX - worldW / 2,
            y: worldY - worldH / 2,
            width: worldW,
            height: worldH,
            name: `Texture Terrain (${textureKey})`,
          });

          runStart = -1;
        }
      }
    }
  }

  static createDecorations(scene, mapConfig) {
    const decorations = mapConfig.terrain?.decorations || [];
    const results = [];

    decorations.forEach(decor => {
      const yPos = this.parseYPosition(decor.y);

      // Check if texture exists before creating decoration
      if (!scene.textures.exists(decor.sprite)) {
        console.warn(`Decoration texture "${decor.sprite}" not found`);
        return;
      }

      const sprite = scene.add
        .image(decor.x, yPos, decor.sprite)
        .setOrigin(decor.originX ?? 0.5, decor.originY ?? 1)
        .setDepth(decor.depth ?? -3);

      // Size parent decoration by relativeWidth (fraction of game width) or explicit scale
      if (decor.relativeWidth !== undefined) {
        const targetWidth = Config.GAME_WIDTH * decor.relativeWidth;
        const scaleFromWidth = targetWidth / sprite.width;
        sprite.setScale(scaleFromWidth);
      } else if (decor.scale !== undefined) {
        sprite.setScale(decor.scale);
      }

      results.push(sprite);

      // Optional: generate terrain from texture alpha for parent decoration
      if (decor.collisionFromTexture) {
        this._createTerrainFromTexture(scene, sprite, decor.sprite);
      }

      // Optional: rotating decoration (e.g. donut) - visual only for now
      if (decor.rotating) {
        const speed = decor.rotationSpeed ?? 0.2; // radians per second
        const duration = (Math.PI * 2 * 1000) / speed; // time for full rotation
        scene.tweens.add({
          targets: sprite,
          angle: 360,
          duration,
          repeat: -1,
        });
      }

      // Process children (relative to parent position)
      if (decor.children?.length) {
        const parentScale = sprite.scaleX || 1;

        decor.children.forEach(child => {
          if (!scene.textures.exists(child.sprite)) {
            console.warn(`Child decoration texture "${child.sprite}" not found`);
            return;
          }

          // Calculate absolute position from relative offset
          const offsetY = child.y ?? 0;
          const childX = decor.x + (child.x ?? 0) * parentScale;
          const childY = yPos + offsetY * parentScale;

          const childSprite = scene.add
            .image(childX, childY, child.sprite)
            .setOrigin(child.originX ?? 0.5, child.originY ?? 0.5)
            .setDepth((decor.depth ?? -3) + 1); // Children render on top of parent

          // Size by display dimensions (viewport-based) rather than source-relative scale
          if (child.displayWidth !== undefined) {
            const targetWidth = child.displayWidth * parentScale;
            const scaleFromWidth = targetWidth / childSprite.width;
            childSprite.setScale(scaleFromWidth);
          } else if (child.displayHeight !== undefined) {
            const targetHeight = child.displayHeight * parentScale;
            const scaleFromHeight = targetHeight / childSprite.height;
            childSprite.setScale(scaleFromHeight);
          } else if (child.scale !== undefined) {
            childSprite.setScale(child.scale * parentScale);
          }

          results.push(childSprite);

          // Create physics body matching sprite display size
          let body = null;
          if (child.hasPhysics) {
            const physW = childSprite.displayWidth;
            const physH = childSprite.displayHeight;
            body = PhysicsManager.createTerrainBody(scene, childX, childY, physW, physH);

            // Track as platform for health crate landing
            scene.currentMapPlatforms.push({
              x: childX - physW / 2,
              y: childY - physH / 2,
              width: physW,
              height: physH,
              name: `Decoration Platform (${child.sprite})`,
            });
          }

          // Optional explicit animation config per child
          if (body && child.animate && child.animate.axis === "y") {
            const endOffset = child.animate.toOffset ?? offsetY;
            const startY = childY;
            const endY = yPos + endOffset * parentScale;
            const duration = child.animate.durationMs ?? 4000;
            const yoyo = child.animate.yoyo ?? true;
            const repeat = child.animate.repeat ?? -1;

            scene.tweens.add({
              targets: childSprite,
              y: endY,
              duration,
              yoyo,
              repeat,
              onUpdate: () => {
                scene.matter.body.setPosition(body, { x: body.position.x, y: childSprite.y });
              },
            });
          }
        });
      }
    });

    return results;
  }

  // Nudge a player out of a texture-based collision area if they end up inside it.
  // This is a safety net on top of Matter's collision resolution.
  static nudgePlayerOutOfTexture(scene, player, textureKey = "metal-coaster") {
    const data = scene._textureCollision?.[textureKey];
    if (!data) return;

    const { solid, cols, rows, texW, texH, worldLeft, worldTop, displayWidth, displayHeight } = data;

    let iterations = 0;
    const maxIterations = 10;
    const stepY = 4; // pixels to move up per correction step

    while (iterations < maxIterations) {
      const localX = player.x - worldLeft;
      const localY = player.y - worldTop;

      if (localX < 0 || localX >= displayWidth || localY < 0 || localY >= displayHeight) break;

      const texX = (localX / displayWidth) * texW;
      const texY = (localY / displayHeight) * texH;
      const cx = Math.floor(texX / (texW / cols));
      const cy = Math.floor(texY / (texH / rows));

      if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) break;
      if (!solid[cy][cx]) break; // not inside solid

      const newY = player.y - stepY;
      scene.matter.body.setPosition(player.body, { x: player.body.position.x, y: newY });
      Object.assign(player, { y: newY });
      player.graphics.setPosition(player.x, newY);

      iterations += 1;
    }
  }

  static createGameTerrain(scene) {
    this.createGround(scene);
    const selectedMap = MapManager.getCurrentMap();
    scene.currentMapPlatforms = this.createPlatforms(scene, selectedMap);
    scene.decorations = this.createDecorations(scene, selectedMap);
    console.log(`🎮 Loaded ${scene.currentMapPlatforms.length} platforms for map: ${selectedMap.name}`);
  }
}

export default TerrainManager;
