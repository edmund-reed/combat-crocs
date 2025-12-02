// Main Combat Crocs Game Entry Point
// Initializes the Phaser game with all scenes and configuration

import { Config, PhaserConfig } from "./config.js";
import Logger from "./utils/logger.js";

// Import scene classes
import MenuScene from "./scenes/MenuScene.js";
import MapSelectScene from "./scenes/MapSelectScene.js";
import PlayerSelectScene from "./scenes/PlayerSelectScene.js";
import GameScene from "./scenes/GameScene.js";

class CombatCrocsGame {
  constructor() {
    // Initialize the Phaser game instance with scenes now that they're loaded
    const PhaserConfigWithScenes = {
      ...PhaserConfig,
      scene: [MenuScene, MapSelectScene, PlayerSelectScene, GameScene],
    };

    this.game = new Phaser.Game(PhaserConfigWithScenes);

    // Game state management
    this.initializeGameState();

    Logger.gameEvent("Combat Crocs Game Initialized!");
    Logger.gameEvent("Controls: Arrow keys to move/jump, SPACE to jump, Mouse click to shoot");
  }

  initializeGameState() {
    // Set up any global game state or managers here
    this.globalState = {
      game: {
        teamACount: 1,
        teamBCount: 1,
      },
      musicOn: true,
      soundOn: true,
      difficulty: "normal",
      lastScore: 0,
    };

    // Make configuration globally accessible
    window.CombatCrocs = {
      config: Config,
      gameState: this.globalState,
      game: this.game,
    };
  }

  // Method to get current game instance
  getGame() {
    return this.game;
  }

  // Method to restart game
  restart() {
    this.game.destroy(true);
    this.game = new Phaser.Game(PhaserConfig);
  }
}

// Create the game instance when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Create the main game instance
  window.CombatCrocsInstance = new CombatCrocsGame();

  // Add some debugging info for development
  Logger.debug("Phaser version:", Phaser.VERSION);
  Logger.debug("Game configuration loaded:", Config);

  // Add keyboard shortcuts for development
  document.addEventListener("keydown", event => {
    // Press 'R' to restart the current scene
    if (event.key.toLowerCase() === "r" && event.ctrlKey) {
      event.preventDefault();
      const currentScene = window.CombatCrocsInstance.getGame().scene.getScenes(true)[0];
      if (currentScene) {
        currentScene.scene.restart();
      }
    }

    // Press 'M' to return to menu
    if (event.key.toLowerCase() === "m" && event.ctrlKey) {
      event.preventDefault();
      window.CombatCrocsInstance.getGame().scene.start("MenuScene");
    }

    // Press 'P' to pause/unpause
    if (event.key.toLowerCase() === "p" && event.ctrlKey) {
      event.preventDefault();
      const currentScene = window.CombatCrocsInstance.getGame().scene.getScenes(true)[0];
      if (currentScene) {
        if (currentScene.scene.isPaused()) {
          currentScene.scene.resume();
          Logger.gameEvent("Game resumed");
        } else {
          currentScene.scene.pause();
          Logger.gameEvent("Game paused");
        }
      }
    }
  });
});

// Simple error handling for game initialization
window.addEventListener("error", event => {
  Logger.error("Game initialization error:", event.error);
});
