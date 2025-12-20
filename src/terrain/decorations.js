import { Config } from "@config";
import { PhysicsManager } from "@utils";
import TerrainManager from "./terrain-manager.js";

class DecorationsManager {
  static createDecorations = (scene, mapConfig) =>
    (mapConfig.terrain?.decorations ?? []).flatMap(decor => {
      const yPos = TerrainManager.resolveY(decor);
      if (!this.#ensureTexture(scene, decor.sprite, "Missing texture")) return [];

      const baseSprite = decor.physicsJson
        ? this.#createPhysicsSprite(scene, decor, yPos)
        : this.#createImageSprite(scene, decor, yPos);

      if (!baseSprite) return [];

      const children = (decor.children ?? [])
        .map(c => this.#createChild(scene, baseSprite, decor, c, yPos))
        .filter(Boolean);
      return [baseSprite, ...children];
    });

  static #ensureTexture(scene, key, label = "Missing") {
    if (scene.textures.exists(key)) return true;
    console.warn(`${label}: ${key}`);
    return false;
  }

  static #calculateScale = (decor, sprite) =>
    decor.relativeWidth ? (Config.GAME_WIDTH * decor.relativeWidth) / sprite.width : decor.scale ?? 1;

  static #addPlatform = (scene, x, y, width, height, name) => {
    const platform = { x: x - width / 2, y: y - height / 2, width, height, name };
    scene.currentMapPlatforms.push(platform);
    return platform;
  };

  static #tagTerrainBody = (body, name) => {
    if (!body) return;
    body.isTerrain = true;
    body.terrainName = name;
    body.parts?.forEach(part => Object.assign(part, { isTerrain: true, terrainName: name }));
  };

  static #positionSprite = (sprite, decor, yPos, scale) =>
    sprite
      .setScale(scale)
      .setPosition(
        decor.x + sprite.displayWidth * (0.5 - (decor.originX ?? 0.5)),
        yPos + sprite.displayHeight * (0.5 - (decor.originY ?? 1)),
      )
      .setDepth(decor.depth ?? -3);

  static #createPhysicsSprite(scene, decor, yPos) {
    const shapes = scene.cache.json.get(decor.physicsJson);
    const key = decor.shapeKey ?? decor.sprite;
    if (!shapes?.[key]) {
      console.warn(`PhysicsEditor shape "${key}" missing`);
      return null;
    }

    const sprite = scene.matter.add.sprite(0, 0, decor.sprite, null, {
      shape: shapes[key],
      isStatic: !decor.rotating,
      friction: 1.0,
      frictionStatic: 1.0,
      collisionFilter: { category: PhysicsManager.CATEGORIES.TERRAIN },
    });

    if (decor.rotating) {
      const rotSpeed = decor.rotationSpeed ?? 0.2;
      if (sprite.body) {
        Phaser.Physics.Matter.Matter.Body.setInertia(sprite.body, Infinity);
        Object.assign(sprite.body, { isKinematicSpinner: true, spinnerAngularVelocity: rotSpeed });
      } else {
        scene.tweens.add({
          targets: sprite,
          angle: 360,
          duration: (Math.PI * 2 * 1000) / rotSpeed,
          repeat: -1,
        });
      }
    }

    this.#tagTerrainBody(sprite.body, `PhysicsEditor (${decor.sprite})`);
    this.#positionSprite(sprite, decor, yPos, this.#calculateScale(decor, sprite));
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
    const sprite = scene.add.image(0, 0, decor.sprite);
    return this.#positionSprite(sprite, decor, yPos, this.#calculateScale(decor, sprite));
  }

  static #resolveChildScale(scene, parent, child) {
    const pScale = parent.scaleX || 1;
    const texture = scene.textures.get(child.sprite).source[0];

    if (child.displayWidth) return (child.displayWidth * pScale) / texture.width;
    if (child.displayHeight) return (child.displayHeight * pScale) / texture.height;
    return (child.scale ?? 1) * pScale;
  }

  static #attachChildPhysics(scene, sprite, x, y, child, pScale) {
    const [w, h] = [sprite.displayWidth, sprite.displayHeight];
    const body = PhysicsManager.createTerrainBody(scene, x, y, w, h);
    const platform = this.#addPlatform(scene, x, y, w, h, `Child (${child.sprite})`);
    const syncPlatform = () => Object.assign(platform, { x: x - w / 2, y: sprite.y - h / 2 });

    if (child.animate?.axis === "y") {
      scene.tweens.add({
        targets: sprite,
        y: y + (child.animate.toOffset ?? child.y ?? 0) * pScale,
        duration: child.animate.durationMs ?? 4000,
        yoyo: child.animate.yoyo ?? true,
        repeat: child.animate.repeat ?? -1,
        onUpdate: () => (scene.matter.body.setPosition(body, { x, y: sprite.y }), syncPlatform()),
      });
    } else syncPlatform();
  }

  static #createChild(scene, parent, decor, child, yPos) {
    if (!this.#ensureTexture(scene, child.sprite)) return null;

    const pScale = parent.scaleX || 1;
    const [x, y] = [decor.x + (child.x ?? 0) * pScale, yPos + (child.y ?? 0) * pScale];
    const sprite = scene.add
      .image(x, y, child.sprite)
      .setOrigin(child.originX ?? 0.5, child.originY ?? 0.5)
      .setDepth((decor.depth ?? -3) + 1)
      .setScale(this.#resolveChildScale(scene, parent, child));

    if (child.hasPhysics) this.#attachChildPhysics(scene, sprite, x, y, child, pScale);
    return sprite;
  }
}

export default DecorationsManager;
