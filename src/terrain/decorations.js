import { Config } from "@config";
import { PhysicsManager } from "@utils";
import TerrainManager from "./terrain-manager.js";
import TextureCollisionManager from "./texture-collision.js";

class DecorationsManager {
  static _addRotation(scene, sprite, body, speed) {
    const duration = (Math.PI * 2 * 1000) / (speed ?? 0.2);
    scene.tweens.add({
      targets: sprite,
      angle: 360,
      duration,
      repeat: -1,
      ...(body && { onUpdate: () => scene.matter.body.setAngle(body, Phaser.Math.DegToRad(sprite.angle)) }),
    });
  }

  static _createPhysicsForDecoration(scene, sprite, decor) {
    if (decor.relativeWidth) sprite.setScale((Config.GAME_WIDTH * decor.relativeWidth) / sprite.width);
    else if (decor.scale) sprite.setScale(decor.scale);

    if (decor.useCircleCollision) {
      const radius = Math.min(sprite.displayWidth, sprite.displayHeight) / 2.2;
      const body = PhysicsManager.createTerrainCircle(scene, sprite.x, sprite.y, radius);
      sprite.physicsBody = body;
      scene.currentMapPlatforms.push({
        x: sprite.x - radius,
        y: sprite.y - radius,
        width: radius * 2,
        height: radius * 2,
        name: `Rotating Platform (${decor.sprite})`,
      });
      if (decor.rotating) this._addRotation(scene, sprite, body, decor.rotationSpeed);
    } else if (decor.collisionFromTexture) {
      TextureCollisionManager.createTerrainFromTexture(scene, sprite, decor.sprite);
      if (decor.rotating) this._addRotation(scene, sprite, null, decor.rotationSpeed);
    }
  }

  static _createChildDecorations(scene, decor, parentSprite, yPos) {
    const parentScale = parentSprite.scaleX || 1;

    return decor.children.flatMap(child => {
      if (!scene.textures.exists(child.sprite))
        return console.warn(`Child decoration texture "${child.sprite}" not found`) || [];

      const offsetY = child.y ?? 0;
      const childX = decor.x + (child.x ?? 0) * parentScale;
      const childY = yPos + offsetY * parentScale;

      const childSprite = scene.add
        .image(childX, childY, child.sprite)
        .setOrigin(child.originX ?? 0.5, child.originY ?? 0.5)
        .setDepth((decor.depth ?? -3) + 1);

      // Size child
      const scale = child.displayWidth
        ? (child.displayWidth * parentScale) / childSprite.width
        : child.displayHeight
        ? (child.displayHeight * parentScale) / childSprite.height
        : child.scale * parentScale;
      if (scale) childSprite.setScale(scale);

      // Optional physics & animation
      if (child.hasPhysics) {
        const [w, h] = [childSprite.displayWidth, childSprite.displayHeight];
        const body = PhysicsManager.createTerrainBody(scene, childX, childY, w, h);

        scene.currentMapPlatforms.push({
          x: childX - w / 2,
          y: childY - h / 2,
          width: w,
          height: h,
          name: `Decoration Platform (${child.sprite})`,
        });

        if (child.animate?.axis === "y") {
          const endY = yPos + (child.animate.toOffset ?? offsetY) * parentScale;
          scene.tweens.add({
            targets: childSprite,
            y: endY,
            duration: child.animate.durationMs ?? 4000,
            yoyo: child.animate.yoyo ?? true,
            repeat: child.animate.repeat ?? -1,
            onUpdate: () => scene.matter.body.setPosition(body, { x: body.position.x, y: childSprite.y }),
          });
        }
      }

      return [childSprite];
    });
  }

  static createDecorations(scene, mapConfig) {
    return (mapConfig.terrain?.decorations || []).flatMap(decor => {
      const yPos = TerrainManager.parseYPosition(decor.y);
      if (!scene.textures.exists(decor.sprite))
        return console.warn(`Decoration texture "${decor.sprite}" not found`) || [];

      const sprite = scene.add
        .image(decor.x, yPos, decor.sprite)
        .setOrigin(decor.originX ?? 0.5, decor.originY ?? 1)
        .setDepth(decor.depth ?? -3);

      this._createPhysicsForDecoration(scene, sprite, decor);

      return [
        sprite,
        ...(decor.children?.length ? this._createChildDecorations(scene, decor, sprite, yPos) : []),
      ];
    });
  }
}

export default DecorationsManager;
