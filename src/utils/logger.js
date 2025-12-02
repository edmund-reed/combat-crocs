// Combat Crocs Logging Utility
// Centralized logging system with configurable levels

class Logger {
  static LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
  };

  static currentLevel = Logger.LEVELS.INFO; // Default to INFO level

  static setLevel(level) {
    if (typeof level === "number" && level >= 0 && level <= 3) {
      this.currentLevel = level;
    }
  }

  static error(message, ...args) {
    if (this.currentLevel >= this.LEVELS.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  static warn(message, ...args) {
    if (this.currentLevel >= this.LEVELS.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  static info(message, ...args) {
    if (this.currentLevel >= this.LEVELS.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  static debug(message, ...args) {
    if (this.currentLevel >= this.LEVELS.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  // Game-specific logging methods
  static gameEvent(message, ...args) {
    this.info(`🎮 ${message}`, ...args);
  }

  static playerAction(message, ...args) {
    this.debug(`🐊 ${message}`, ...args);
  }

  static weaponEvent(message, ...args) {
    this.debug(`💥 ${message}`, ...args);
  }

  static physicsEvent(message, ...args) {
    this.debug(`⚛️ ${message}`, ...args);
  }

  static uiEvent(message, ...args) {
    this.debug(`🖥️ ${message}`, ...args);
  }

  static memoryEvent(message, ...args) {
    this.debug(`🧠 ${message}`, ...args);
  }
}

export default Logger;
