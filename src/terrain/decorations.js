import { Config } from "@config";
import { PhysicsManager } from "@utils";
import TerrainManager from "./terrain-manager.js";

class DecorationsManager {
  static createDecorations = (scene, mapConfig) =>
    (mapConfig.terrain?.decorations ?? []).flatMap(decor => {
      const yPos = TerrainManager.resolveY(decor);
      if (!scene.textures.exists(decor.sprite)) return console.warn(`Missing texture: ${decor.sprite}`) || [];

      const baseSprite = decor.physicsJson
        ? this.#createPhysicsSprite(scene, decor, yPos)
        : this.#createImageSprite(scene, decor, yPos);

      return baseSprite
        ? [
            baseSprite,
            ...(decor.children ?? [])
              .map(c => this.#createChild(scene, baseSprite, decor, c, yPos))
              .filter(Boolean),
          ]
        : [];
    });

  static #calculateScale = (decor, sprite) =>
    decor.relativeWidth ? (Config.GAME_WIDTH * decor.relativeWidth) / sprite.width : decor.scale ?? 1;

  static #addPlatform = (scene, x, y, width, height, name) => {
    const platform = { x: x - width / 2, y: y - height / 2, width, height, name };
    scene.currentMapPlatforms.push(platform);
    return platform;
  };

  static #tagTerrainBody = (body, name) => {
    body.isTerrain = true;
    body.terrainName = name;
    body.parts?.forEach(part => {
      part.isTerrain = true;
      part.terrainName = name;
    });
  };

  static #positionSprite = (sprite, decor, yPos, scale) => {
    sprite.setScale(scale);
    const dx = sprite.displayWidth * (0.5 - (decor.originX ?? 0.5));
    const dy = sprite.displayHeight * (0.5 - (decor.originY ?? 1));
    sprite.setPosition(decor.x + dx, yPos + dy).setDepth(decor.depth ?? -3);
    return sprite;
  };

  static #createPhysicsSprite(scene, decor, yPos) {
    const shapes = scene.cache.json.get(decor.physicsJson);
    const key = decor.shapeKey ?? decor.sprite;
    if (!shapes?.[key]) return console.warn(`PhysicsEditor shape "${key}" missing`) || null;

    const sprite = scene.matter.add.sprite(0, 0, decor.sprite, null, {
      shape: shapes[key],
      isStatic: !decor.rotating,
      friction: 1.0,
      frictionStatic: 1.0,
      collisionFilter: { category: PhysicsManager.CATEGORIES.TERRAIN },
    });

    if (decor.rotating && sprite.body) {
      Phaser.Physics.Matter.Matter.Body.setInertia(sprite.body, Infinity);
      Object.assign(sprite.body, {
        isKinematicSpinner: true,
        spinnerAngularVelocity: decor.rotationSpeed ?? 0.2,
      });
    }

    sprite.body && this.#tagTerrainBody(sprite.body, `PhysicsEditor (${decor.sprite})`);
    this.#positionSprite(sprite, decor, yPos, this.#calculateScale(decor, sprite));

    decor.rotating &&
      !sprite.body &&
      scene.tweens.add({
        targets: sprite,
        angle: 360,
        duration: (Math.PI * 2 * 1000) / (decor.rotationSpeed ?? 0.2),
        repeat: -1,
      });

    this.#addPlatform(
      scene,
      sprite.x,
      sprite.y,
      sprite.displayWidth,
      sprite.displayHeight,
      `PhysicsEditor (${decor.sprite})`,
    );
    return sprite;
  }

  static #createImageSprite(scene, decor, yPos) {
    const sprite = scene.add
      .image(decor.x, yPos, decor.sprite)
      .setOrigin(decor.originX ?? 0.5, decor.originY ?? 1)
      .setDepth(decor.depth ?? -3);
    sprite.setScale(this.#calculateScale(decor, sprite));
    return sprite;
  }

  static #createChild(scene, parent, decor, child, yPos) {
    if (!scene.textures.exists(child.sprite)) return console.warn(`Missing: ${child.sprite}`) || null;

    const pScale = parent.scaleX || 1;
    const texture = scene.textures.get(child.sprite).source[0];
    const cScale = child.displayWidth
      ? (child.displayWidth * pScale) / texture.width
      : child.displayHeight
      ? (child.displayHeight * pScale) / texture.height
      : (child.scale ?? 1) * pScale;

    const [x, y] = [decor.x + (child.x ?? 0) * pScale, yPos + (child.y ?? 0) * pScale];
    const sprite = scene.add
      .image(x, y, child.sprite)
      .setOrigin(child.originX ?? 0.5, child.originY ?? 0.5)
      .setDepth((decor.depth ?? -3) + 1)
      .setScale(cScale);

    if (child.hasPhysics) {
      const [w, h] = [sprite.displayWidth, sprite.displayHeight];
      const body = PhysicsManager.createTerrainBody(scene, x, y, w, h);
      const platform = this.#addPlatform(scene, x, y, w, h, `Child (${child.sprite})`);

      const syncPlatform = () => Object.assign(platform, { x: x - w / 2, y: sprite.y - h / 2 });

      child.animate?.axis === "y"
        ? scene.tweens.add({
            targets: sprite,
            y: yPos + (child.animate.toOffset ?? child.y ?? 0) * pScale,
            duration: child.animate.durationMs ?? 4000,
            yoyo: child.animate.yoyo ?? true,
            repeat: child.animate.repeat ?? -1,
            onUpdate: () => {
              scene.matter.body.setPosition(body, { x, y: sprite.y });
              syncPlatform();
            },
          })
        : syncPlatform();
    }

    return sprite;
  }
}

export default DecorationsManager;
