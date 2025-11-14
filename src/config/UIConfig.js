/**
 * UIConfig.js - User Interface configuration and styling
 * Fonts, colors, positions, and layout settings
 */

const UI_CONFIG = {
  // Health bar settings
  HEALTH_BAR: {
    width: 200,
    height: 20,
    marginX: 20,
    marginY: 20,
    spacing: 40,
    backgroundColor: 0xff0000, // Red background
    foregroundColor: 0x00ff00, // Green health
  },

  // Text styling
  TEXT: {
    fontFamily: "Arial",
    playerHealth: {
      size: "12px",
      color: "#FFFFFF",
    },
    weaponDisplay: {
      size: "16px",
      color: "#FFD23F",
    },
    timerDisplay: {
      size: "16px",
      color: "#FFFFFF",
    },
    turnIndicator: {
      size: "20px",
      fill: "#FFD23F",
      stroke: "#FF6B35",
      strokeThickness: 3,
    },
    instructions: {
      size: "14px",
      fill: "#FFFFFF",
      stroke: "#000000",
      strokeThickness: 2,
    },
  },

  // Position settings
  POSITIONS: {
    healthBars: { x: 20, y: 20 },
    weaponDisplay: { x: "GAME_WIDTH - 200", y: 20 },
    timerDisplay: { x: "GAME_WIDTH - 200", y: 50 },
    turnIndicator: { x: "GAME_WIDTH / 2", y: 20 },
    instructions: { x: "GAME_WIDTH / 2", y: 50 },
  },

  // Orlando theme colors (UI-specific usage)
  COLORS: {
    orange: 0xff6b35,
    brightOrange: 0xf7931e,
    yellow: 0xffd23f,
    blue: 0x4a56a8,
    crocodileGreen: 0x2d5a3d,
    waterBlue: 0x7cb9e8,
  },

  // Text origins for centering
  ORIGINS: {
    centered: 0.5,
    topLeft: 0,
  },
};

window.UI_CONFIG = UI_CONFIG;
