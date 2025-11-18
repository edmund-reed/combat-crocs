// Global UI Helper Functions for Combat Crocs
// Reusable patterns across all UI components

class UITextHelpers {
  static _getPrimaryTextStyle(fontSize, strokeThickness = 2, addStroke = true) {
    return {
      font: `${addStroke ? "bold " : ""}${fontSize}px Arial`,
      fill: "#FFD23F",
      ...(addStroke && { stroke: "#FF6B35", strokeThickness }),
    };
  }

  static createInteractiveText(scene, x, y, text, styles, origin = 0.5) {
    const txt = scene.add.text(x, y, text, styles).setOrigin(origin).setInteractive();
    return txt;
  }
}

class UIButtonHelpers {
  static addHoverEffect(btn, originalColor = "#FFD23F") {
    btn.on("pointerover", () => btn.setScale(1.2).setFill("#FFFFFF"));
    btn.on("pointerout", () => btn.setScale(1.0).setFill(originalColor));
    return btn;
  }
}

window.UITextHelpers = UITextHelpers;
window.UIButtonHelpers = UIButtonHelpers;
