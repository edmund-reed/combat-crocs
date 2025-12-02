// Global UI Helper Functions for Combat Crocs
// Reusable patterns across all UI components

class UITextHelpers {
  // Style constants for consistent theming
  static PRIMARY_COLOR = "#FFD23F";
  static SECONDARY_COLOR = "#FFFFFF";
  static ACCENT_COLOR = "#FF6B35";
  static MUTED_COLOR = "#DDDDDD";
  static FONT_FAMILY = "Arial";

  // Base text creation method (private)
  static _createText = (scene, x, y, text, styleObject, origin = 0.5) =>
    scene.add.text(x, y, text, styleObject).setOrigin(origin);

  // Style factories for different text types
  static _getPrimaryStyle = size => ({
    font: `bold ${size}px ${this.FONT_FAMILY}`,
    fill: this.PRIMARY_COLOR,
    stroke: this.ACCENT_COLOR,
    strokeThickness: Math.max(1, Math.floor(size / 8)),
  });

  static _getSecondaryStyle = size => ({
    font: `${size}px ${this.FONT_FAMILY}`,
    fill: this.SECONDARY_COLOR,
  });

  static _getTitleStyle = size => ({
    font: `bold ${size}px ${this.FONT_FAMILY}`,
    fill: this.PRIMARY_COLOR,
    stroke: this.ACCENT_COLOR,
    strokeThickness: Math.floor(size / 12),
  });

  static _getMutedStyle = size => ({
    font: `${size}px ${this.FONT_FAMILY}`,
    fill: this.MUTED_COLOR,
  });

  // Legacy method for backward compatibility
  static _getPrimaryTextStyle = (fontSize, strokeThickness = 2, addStroke = true) => ({
    font: `${addStroke ? "bold " : ""}${fontSize}px ${this.FONT_FAMILY}`,
    fill: this.PRIMARY_COLOR,
    ...(addStroke && { stroke: this.ACCENT_COLOR, strokeThickness }),
  });

  // Primary text - titles, buttons, important labels (orange/yellow with red stroke)
  static primaryText = (scene, x, y, text, size = 16, origin = 0.5) =>
    this._createText(scene, x, y, text, this._getPrimaryStyle(size), origin);

  // Secondary text - instructions, details, secondary labels (white/plain)
  static secondaryText = (scene, x, y, text, size = 14, origin = 0.5) =>
    this._createText(scene, x, y, text, this._getSecondaryStyle(size), origin);

  // Interactive text - buttons, clickable elements with hover effects
  static createInteractiveText = (scene, x, y, text, style = "primary", size = 16, origin = 0.5) => {
    const styles = style === "primary" ? this._getPrimaryStyle(size) : this._getSecondaryStyle(size);
    return this._createText(scene, x, y, text, styles, origin).setInteractive();
  };

  // Status text - timers, counters, indicators (customizable color)
  static createStatusText = (scene, x, y, text, color = this.SECONDARY_COLOR, size = 16, origin = 0.5) =>
    this._createText(scene, x, y, text, { font: `${size}px ${this.FONT_FAMILY}`, fill: color }, origin);

  // Title text - main headings, decorative titles (large, bold, eye-catching)
  static createTitleText = (scene, x, y, text, size = 48, origin = 0.5) =>
    this._createText(scene, x, y, text, this._getTitleStyle(size), origin);

  // Muted text - secondary information, disabled states
  static createMutedText = (scene, x, y, text, size = 12, origin = 0.5) =>
    this._createText(scene, x, y, text, this._getMutedStyle(size), origin);
}

class UIButtonHelpers {
  static addHoverEffect(btn, originalColor = "#FFD23F", scale = 1.2) {
    btn.on("pointerover", () => btn.setScale(scale).setFill("#FFFFFF"));
    btn.on("pointerout", () => btn.setScale(1.0).setFill(originalColor));
    return btn;
  }
}

export { UITextHelpers, UIButtonHelpers };
