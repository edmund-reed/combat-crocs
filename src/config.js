// Combat Crocs Game Configuration

const Config = {
  // Game settings
  GAME_WIDTH: 1200,
  GAME_HEIGHT: 700,
  BACKGROUND_COLOR: 0x4a56a8, // Bright blue

  // Physics settings
  GRAVITY: 1.5, // Final gravity value used by Phaser (was 300/200)
  BOUNCE: 0.2,

  // Player settings
  PLAYER_SPEED: 10,
  PLAYER_JUMP_FORCE: 15, // Even higher for very noticeable jumping

  // Behavior-driven weapon configurations - eliminates weapon name references
  WEAPON_CONFIGS: {
    BAZOOKA: {
      damage: 50,
      radius: 140,
      shotsPerTurn: 1,
      behaviorFlags: ["projectile", "explodesOnImpact"],
      renderType: "graphics",
      hasPhysicsRotation: false,
      hasHeldSprite: false,
      upgrades: {
        maxLevel: 3,
        xpThresholds: [30, 80],
        damagePerLevel: [50, 65, 80],
        radiusPerLevel: [140, 165, 190],
      },
    },
    GRENADE: {
      damage: 50,
      radius: 140,
      shotsPerTurn: 1,
      behaviorFlags: ["projectile", "timerExplosion", "bounces"],
      renderType: "sprite",
      spriteKey: "grenade-l1",
      spriteScale: 0.05,
      hasPhysicsRotation: true,
      hasHeldSprite: true,
      upgrades: {
        maxLevel: 3,
        xpThresholds: [30, 80],
        damagePerLevel: [50, 65, 80],
        radiusPerLevel: [140, 165, 190],
      },
    },
    SHOTGUN: {
      damage: 12,
      radius: 35,
      shotsPerTurn: 2,
      behaviorFlags: ["hitscan", "multiShot"],
      renderType: "none",
      hasPhysicsRotation: false,
      hasHeldSprite: false,
      upgrades: {
        maxLevel: 3,
        xpThresholds: [30, 80],
        damagePerLevel: [12, 16, 20],
      },
    },
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
        y: Config.GRAVITY, // Direct use of final gravity value
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

// Logging Utility (merged from logger.js)
const Logger = {
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  info: (msg, ...args) => console.info(`[INFO] ${msg}`, ...args),
  debug: (msg, ...args) => console.debug(`[DEBUG] ${msg}`, ...args),
  gameEvent: (msg, ...args) => console.info(`🎮 ${msg}`, ...args),
  playerAction: (msg, ...args) => console.debug(`🐊 ${msg}`, ...args),
  weaponEvent: (msg, ...args) => console.debug(`💥 ${msg}`, ...args),
  physicsEvent: (msg, ...args) => console.debug(`⚛️ ${msg}`, ...args),
  uiEvent: (msg, ...args) => console.debug(`🖥️ ${msg}`, ...args),
  memoryEvent: (msg, ...args) => console.debug(`🧠 ${msg}`, ...args),
};

export { Config, PhaserConfig, Logger };
