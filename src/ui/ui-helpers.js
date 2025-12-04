// Global UI Helper Functions for Combat Crocs
// Reusable patterns across all UI components

class UITextHelpers {
  static PRIMARY_COLOR = "#FFD23F";
  static SECONDARY_COLOR = "#FFFFFF";
  static ACCENT_COLOR = "#FF6B35";
  static FONT_FAMILY = "Arial";

  static _createText = (scene, x, y, text, styleObject, origin = 0.5) =>
    scene.add.text(x, y, text, styleObject).setOrigin(origin);

  static _getPrimaryStyle = size => ({
    font: `bold ${size}px ${this.FONT_FAMILY}`,
    fill: this.PRIMARY_COLOR,
    stroke: this.ACCENT_COLOR,
    strokeThickness: Math.max(1, Math.floor(size / 8)),
  });

  static _getSecondaryStyle = size => ({ font: `${size}px ${this.FONT_FAMILY}`, fill: this.SECONDARY_COLOR });

  static _getPrimaryTextStyle = (fontSize, strokeThickness = 2, addStroke = true) => ({
    font: `${addStroke ? "bold " : ""}${fontSize}px ${this.FONT_FAMILY}`,
    fill: this.PRIMARY_COLOR,
    ...(addStroke && { stroke: this.ACCENT_COLOR, strokeThickness }),
  });

  static primaryText = (scene, x, y, text, size = 16, origin = 0.5) =>
    this._createText(scene, x, y, text, this._getPrimaryStyle(size), origin);

  static secondaryText = (scene, x, y, text, size = 14, origin = 0.5) =>
    this._createText(scene, x, y, text, this._getSecondaryStyle(size), origin);

  static createInteractiveText = (scene, x, y, text, style = "primary", size = 16, origin = 0.5) => {
    const styles = style === "primary" ? this._getPrimaryStyle(size) : this._getSecondaryStyle(size);
    return this._createText(scene, x, y, text, styles, origin).setInteractive();
  };

  static createStatusText = (scene, x, y, text, color = this.SECONDARY_COLOR, size = 16, origin = 0.5) =>
    this._createText(scene, x, y, text, { font: `${size}px ${this.FONT_FAMILY}`, fill: color }, origin);

  static createMutedText = (scene, x, y, text, size = 12, origin = 0.5) =>
    this._createText(scene, x, y, text, this._getMutedStyle(size), origin);

  static _getMutedStyle = size => ({ font: `${size}px ${this.FONT_FAMILY}`, fill: this.MUTED_COLOR });

  static MUTED_COLOR = "#DDDDDD";
}

class UIButtonHelpers {
  static STYLES = {
    button: { fill: "#FFFFFF", stroke: "#000000" },
    buttonHover: { fill: "#FFED4E", stroke: "#804000" },
  };

  static addHoverEffect(btn, originalColor = "#FFD23F", scale = 1.2) {
    btn.on("pointerover", () => btn.setScale(scale).setFill("#FFFFFF"));
    btn.on("pointerout", () => btn.setScale(1.0).setFill(originalColor));
    return btn;
  }

  static _applyHoverEvents(btn, sizes) {
    btn.on("pointerover", () =>
      btn.setStyle({ font: `bold ${sizes.hover}px Arial`, ...this.STYLES.buttonHover, strokeThickness: 5 }),
    );
    btn.on("pointerout", () =>
      btn.setStyle({ font: `bold ${sizes.default}px Arial`, ...this.STYLES.button, strokeThickness: 4 }),
    );
  }

  static createStyledButton(scene, x, y, text, sizes = { default: 20, hover: 22 }, callback) {
    const btn = scene.add
      .text(x, y, text, { font: `bold ${sizes.default}px Arial`, ...this.STYLES.button, strokeThickness: 4 })
      .setOrigin(0.5)
      .setInteractive();
    this._applyHoverEvents(btn, sizes);
    if (callback) btn.on("pointerdown", callback);
    return btn;
  }

  static createInteractiveImage(scene, x, y, key, maxSize = 250, config = {}) {
    const image = scene.add.image(x, y, key).setInteractive();
    const scale = maxSize / Math.max(image.width, image.height);
    if (scale < 1) image.setScale(scale);

    const tint = config.initialTint || 0xcccccc;
    const hoverScale = config.hoverScale || 1.05;
    image.setTint(tint);

    image.on("pointerover", () => {
      image.setScale(image.scaleX * hoverScale);
      image.clearTint();
    });
    image.on("pointerout", () => {
      image.setScale(image.scaleX / hoverScale);
      image.setTint(tint);
    });

    if (config.onClick) image.on("pointerdown", config.onClick);
    return image;
  }

  static createBackButton(scene, targetScene, x, y, text = "BACK TO MENU") {
    return this.createStyledButton(scene, x, y, text, { default: 20, hover: 22 }, () => scene.scene.start(targetScene));
  }
}

class UISceneHelpers {
  static getSceneLayout(config) {
    return {
      width: config.GAME_WIDTH,
      height: config.GAME_HEIGHT,
      centerX: config.GAME_WIDTH / 2,
      centerY: config.GAME_HEIGHT / 2,
    };
  }

  static createBackground(scene, config, layout) {
    if (config.type === "image") {
      const bg = scene.add.image(
        layout.centerX + (config.offsetX || 0),
        layout.centerY + (config.offsetY || 0),
        config.key,
      );
      bg.setOrigin(0.5, 0.5);
      if (config.scale) bg.setScale(config.scale);
      return bg;
    }
    if (config.type === "gradient") {
      const gfx = scene.add.graphics();
      gfx.fillGradientStyle(...config.colors, 1);
      gfx.fillRect(0, 0, layout.width, layout.height);
      return gfx;
    }
  }

  static createStyledText(scene, x, y, text, fontSize = 18, strokeThickness = 4) {
    return scene.add
      .text(x, y, text, { font: `bold ${fontSize}px Arial`, fill: "#FFFFFF", stroke: "#000000", strokeThickness })
      .setOrigin(0.5);
  }
}

export { UITextHelpers, UIButtonHelpers, UISceneHelpers };
