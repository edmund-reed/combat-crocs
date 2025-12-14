import PhysicsManager from "../utils/physics-manager.js";

class TextureCollisionManager {
  static createTerrainFromTexture(scene, sprite, textureKey) {
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

  static nudgePlayerOutOfTexture(scene, player, textureKey = "metal-coaster") {
    const data = scene._textureCollision?.[textureKey];
    if (!data) return;

    const { solid, cols, rows, texW, texH, worldLeft, worldTop, displayWidth, displayHeight } = data;

    let iterations = 0;
    const maxIterations = 10;
    const stepY = 4;

    while (iterations < maxIterations) {
      const localX = player.x - worldLeft;
      const localY = player.y - worldTop;

      if (localX < 0 || localX >= displayWidth || localY < 0 || localY >= displayHeight) break;

      const texX = (localX / displayWidth) * texW;
      const texY = (localY / displayHeight) * texH;
      const cx = Math.floor(texX / (texW / cols));
      const cy = Math.floor(texY / (texH / rows));

      if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) break;
      if (!solid[cy][cx]) break;

      const newY = player.y - stepY;
      scene.matter.body.setPosition(player.body, { x: player.body.position.x, y: newY });
      Object.assign(player, { y: newY });
      player.graphics.setPosition(player.x, newY);

      iterations += 1;
    }
  }
}

export default TextureCollisionManager;
