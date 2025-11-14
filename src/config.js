// Combat Crocs Game Configuration

const Config = {
  // Game settings
  GAME_WIDTH: 1200,
  GAME_HEIGHT: 700,
  BACKGROUND_COLOR: 0x4a56a8, // Bright blue

  // Physics settings
  GRAVITY: 300,
  BOUNCE: 0.2,

  // Player settings
  PLAYER_SPEED: 10,
  PLAYER_JUMP_FORCE: 15, // Even higher for very noticeable jumping

  // Weapon settings (significantly increased for development testing)
  WEAPON_TYPES: {
    BAZOOKA: { name: "Bazooka", damage: 100, radius: 200 },
    GRENADE: { name: "Grenade", damage: 15, radius: 80 },
    HOMING_MISSILE: { name: "Homing Missile", damage: 35, radius: 40 },
    SHOTGUN: { name: "Shotgun", damage: 12, radius: 35 },
    UZI: { name: "UZI", damage: 8, radius: 25 },
    PINEAPPLE_BOMB: { name: "Pineapple Bomb", damage: 20, radius: 70 },
    MANGO_BOMB: { name: "Mango Bomb", damage: 18, radius: 75 },
  },

  // AI settings
  AI_ACCURACY_LEVELS: {
    LOW: 0.3, // 30% accuracy
    MEDIUM: 0.6, // 60% accuracy
    HIGH: 1.0, // 100% accuracy
  },

  // Turn settings
  TURN_TIME_LIMIT: 30000, // 30 seconds in milliseconds

  // Orlando theme colors
  COLORS: {
    ORANGE: 0xff6b35,
    BRIGHT_ORANGE: 0xf7931e,
    YELLOW: 0xffd23f,
    BLUE: 0x4a56a8,
    CROCODILE_GREEN: 0x2d5a3d,
    WATER_BLUE: 0x7cb9e8,
  },
};

// Phaser Game Configuration
const PhaserConfig = {
  type: Phaser.AUTO,
  width: Config.GAME_WIDTH,
  height: Config.GAME_HEIGHT,
  backgroundColor: Config.BACKGROUND_COLOR,
  parent: "game-container",
  canvas: document.getElementById("game-canvas"),

  physics: {
    default: "matter",
    matter: {
      gravity: {
        y: Config.GRAVITY / 200, // Phaser uses different gravity scale
      },
      debug: false, // Disable physics debug - we'll add manual debug for projectiles
      enableSleeping: false,
    },
  },

  // Scale settings for responsive design
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 800,
      height: 600,
    },
    max: {
      width: 1400,
      height: 800,
    },
  },

  // FPS and rendering settings
  fps: {
    target: 60,
    forceSetTimeOut: true,
  },
};

window.Config = Config;
