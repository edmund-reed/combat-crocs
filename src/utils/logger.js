// Combat Crocs Logging Utility
// Simple console wrapper with semantic methods

const Logger = {
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  info: (msg, ...args) => console.info(`[INFO] ${msg}`, ...args),
  debug: (msg, ...args) => console.debug(`[DEBUG] ${msg}`, ...args),

  // Game-specific logging shortcuts
  gameEvent: (msg, ...args) => console.info(`🎮 ${msg}`, ...args),
  playerAction: (msg, ...args) => console.debug(`🐊 ${msg}`, ...args),
  weaponEvent: (msg, ...args) => console.debug(`💥 ${msg}`, ...args),
  physicsEvent: (msg, ...args) => console.debug(`⚛️ ${msg}`, ...args),
  uiEvent: (msg, ...args) => console.debug(`🖥️ ${msg}`, ...args),
  memoryEvent: (msg, ...args) => console.debug(`🧠 ${msg}`, ...args),
};

export default Logger;
