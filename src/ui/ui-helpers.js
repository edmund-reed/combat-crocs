import { Config } from "@config";

const COLORS = { PRIMARY: "#FFD23F", WHITE: "#FFFFFF", ACCENT: "#FF6B35", MUTED: "#DDDDDD" };

class UITextHelpers {
  static _text = (scene, x, y, txt, font, fill, stroke = null, strokeW = 0, origin = 0.5) => {
    const style = { font, fill };
    if (stroke) Object.assign(style, { stroke, strokeThickness: strokeW });
    return scene.add.text(x, y, txt, style).setOrigin(origin);
  };

  static primaryText = (scene, x, y, txt, size = 16, origin = 0.5) =>
    this._text(
      scene,
      x,
      y,
      txt,
      `bold ${size}px Arial`,
      COLORS.PRIMARY,
      COLORS.ACCENT,
      Math.floor(size / 8),
      origin,
    );

  static secondaryText = (scene, x, y, txt, size = 14, origin = 0.5) =>
    this._text(scene, x, y, txt, `${size}px Arial`, COLORS.WHITE, null, 0, origin);

  static createMutedText = (scene, x, y, txt, size = 12, origin = 0.5) =>
    this._text(scene, x, y, txt, `${size}px Arial`, COLORS.MUTED, null, 0, origin);

  static createStatusText = (scene, x, y, txt, color = COLORS.WHITE, size = 16, origin = 0.5) =>
    this._text(scene, x, y, txt, `${size}px Arial`, color, null, 0, origin);
}

class UIButtonHelpers {
  static addHoverEffect(btn, scale = 1.2) {
    btn.on("pointerover", () => btn.setScale(scale));
    btn.on("pointerout", () => btn.setScale(1.0));
    return btn;
  }

  static createStyledButton(scene, x, y, text, sizes = { default: 20, hover: 22 }, callback) {
    const btn = scene.add
      .text(x, y, text, {
        font: `bold ${sizes.default}px Arial`,
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setInteractive();
    btn.setData("originalText", text);
    btn.setData("hoverText", text === "START GAME" ? "▶ START GAME ◀" : text);
    btn.on("pointerover", () => {
      btn.setStyle({ font: `bold ${sizes.hover}px Arial` });
      btn.setText(btn.getData("hoverText"));
    });
    btn.on("pointerout", () => {
      btn.setStyle({ font: `bold ${sizes.default}px Arial` });
      btn.setText(btn.getData("originalText"));
    });
    if (callback) btn.on("pointerdown", callback);
    return btn;
  }

  static createInteractiveImage(scene, x, y, key, maxSize = 250, config = {}) {
    const image = scene.add.image(x, y, key).setInteractive();
    const scale = maxSize / Math.max(image.width, image.height);
    if (scale < 1) image.setScale(scale);
    const hs = config.hoverScale || 1.05;
    image.on("pointerover", () => image.setScale(image.scaleX * hs));
    image.on("pointerout", () => image.setScale(image.scaleX / hs));
    if (config.onClick) image.on("pointerdown", config.onClick);
    return image;
  }

  static createBackButton(scene, targetScene, x, y, text = "BACK TO MENU") {
    return this.createStyledButton(scene, x, y, text, { default: 20, hover: 22 }, () =>
      scene.scene.start(targetScene),
    );
  }
}

class UISceneHelpers {
  static getSceneLayout = config => ({
    width: config.GAME_WIDTH,
    height: config.GAME_HEIGHT,
    centerX: config.GAME_WIDTH / 2,
    centerY: config.GAME_HEIGHT / 2,
  });

  static createBackground(scene, config, layout) {
    const bg = scene.add.image(
      layout.centerX + (config.offsetX || 0),
      layout.centerY + (config.offsetY || 0),
      config.key,
    );
    bg.setOrigin(0.5);
    if (config.scale) bg.setScale(config.scale);
    return bg;
  }

  static createStyledText = (scene, x, y, text, fontSize = 18, strokeW = 4) =>
    scene.add
      .text(x, y, text, {
        font: `bold ${fontSize}px Arial`,
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: strokeW,
      })
      .setOrigin(0.5);
}

export { UITextHelpers, UIButtonHelpers, UISceneHelpers };
