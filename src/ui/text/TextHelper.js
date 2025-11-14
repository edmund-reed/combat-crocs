/**
 * TextHelper.js - Centralized text creation utilities
 * Eliminates repetitive text creation code, ensures consistent styling
 */

class TextHelper {
  // 🎨 Predefined text style presets
  static get STYLE_PRESETS() {
    return {
      TURN_INDICATOR: {
        font: "20px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 3,
      },
      TIMER: {
        font: "16px Arial",
        fill: "#FFFFFF",
      },
      WEAPON_DISPLAY: {
        font: "16px Arial",
        fill: "#FFD23F",
      },
      HEALTH_BAR_LABEL: {
        font: "12px Arial",
        fill: "#FFFFFF",
      },
      INSTRUCTIONS: {
        font: "14px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 2,
      },
      GAME_OVER: {
        font: "bold 32px Arial",
        fill: "#FFD23F",
        align: "center",
      },
    };
  }

  // 🏹 Create text with preset styles
  static createWithPreset(
    scene,
    x,
    y,
    text,
    presetName,
    originX = 0,
    originY = 0
  ) {
    const style = TextHelper.STYLE_PRESETS[presetName];
    if (!style) {
      console.warn(`TextHelper: Unknown preset '${presetName}'`);
      return null;
    }

    return scene.add.text(x, y, text, style).setOrigin(originX, originY);
  }

  // 📍 Centered text (common pattern)
  static createCenteredText(scene, x, y, text, presetName) {
    return TextHelper.createWithPreset(scene, x, y, text, presetName, 0.5, 0.5);
  }

  // 🎯 Left-aligned text (common pattern)
  static createLeftAlignedText(scene, x, y, text, presetName) {
    return TextHelper.createWithPreset(scene, x, y, text, presetName, 0, 0);
  }

  // 🎮 Turn indicator text
  static createTurnIndicator(scene, x, y, currentPlayer) {
    const playerNum = currentPlayer + 1; // currentPlayer is 0-indexed
    const text = `Player ${playerNum}'s Turn`;
    const style = { ...TextHelper.STYLE_PRESETS.TURN_INDICATOR };

    // Color based on player
    style.fill = playerNum === 1 ? "#00FF00" : "#FFD23F";

    return scene.add.text(x, y, text, style).setOrigin(0.5);
  }

  // ⏱️ Timer display text
  static createTimerDisplay(scene, x, y) {
    return TextHelper.createLeftAlignedText(
      scene,
      x,
      y,
      "Time: 30",
      "TIMER"
    ).setOrigin(1, 0); // Right-aligned actually
  }

  // 🔫 Weapon display text
  static createWeaponDisplay(scene, x, y, weaponName) {
    return TextHelper.createLeftAlignedText(
      scene,
      x,
      y,
      `Weapon: ${weaponName}`,
      "WEAPON_DISPLAY"
    ).setOrigin(1, 0);
  }

  // ❤️ Health bar player label
  static createHealthLabel(scene, x, y, playerId) {
    return TextHelper.createLeftAlignedText(
      scene,
      x,
      y,
      `Player ${playerId}`,
      "HEALTH_BAR_LABEL"
    );
  }

  // 📋 Instructions text
  static createInstructions(scene, x, y) {
    const instructionText =
      "Move: Arrow Keys | Aim: Mouse | Shoot: Click | Jump: Spacebar";
    return TextHelper.createCenteredText(
      scene,
      x,
      y,
      instructionText,
      "INSTRUCTIONS"
    );
  }

  // 🏆 Game over text
  static createGameOverText(scene, x, y, winner) {
    const gameOverText = `Player ${winner} Wins!\n\nClick to return to menu`;
    const textObj = TextHelper.createCenteredText(
      scene,
      x,
      y,
      gameOverText,
      "GAME_OVER"
    );

    // Make interactive
    textObj.setInteractive();
    return textObj;
  }

  // 🎨 Custom styled text (fallback for unique cases)
  static createCustom(
    scene,
    x,
    y,
    text,
    fontSize = "16px",
    fill = "#FFFFFF",
    stroke = undefined,
    strokeThickness = undefined
  ) {
    const style = { font: `${fontSize} Arial`, fill };

    if (stroke) {
      style.stroke = stroke;
      style.strokeThickness = strokeThickness || 2;
    }

    return scene.add.text(x, y, text, style);
  }
}

window.TextHelper = TextHelper;
