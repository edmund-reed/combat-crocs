import { Config, PhaserConfig, Logger } from "./config.js";
import MenuScene from "./scenes/MenuScene.js";
import ThemeParkSelectScene from "./scenes/ThemeParkSelectScene.js";
import MapSelectScene from "./scenes/MapSelectScene.js";
import PlayerSelectScene from "./scenes/PlayerSelectScene.js";
import GameScene from "./scenes/GameScene.js";
import { Maps as MapManager, WeaponManager } from "@utils";
import StateManager from "./utils/state-manager.js";

class CombatCrocsGame {
  constructor() {
    this.game = new Phaser.Game({
      ...PhaserConfig,
      scene: [MenuScene, ThemeParkSelectScene, MapSelectScene, PlayerSelectScene, GameScene],
    });

    window.CombatCrocs = {
      config: Config,
      gameState: {
        game: { teams: [] },
        musicOn: false, // Muted for AI training
        soundOn: false, // Muted for AI training
        difficulty: "normal",
        lastScore: 0,
      },
      game: this.game,
    };

    // Mute all audio globally for AI training
    this.game.sound.mute = true;
    this.game.sound.volume = 0;

    // Expose managers globally for AI/Puppeteer access
    window.MapManager = MapManager;
    window.StateManager = StateManager;
    window.WeaponManager = WeaponManager;

    Logger.gameEvent("Combat Crocs Game Initialized!");
    Logger.gameEvent("Controls: Arrow keys to move/jump, SPACE to jump, Mouse click to shoot");
  }

  getGame = () => this.game;
  restart = () => (this.game.destroy(true), (this.game = new Phaser.Game(PhaserConfig)));
}

document.addEventListener("DOMContentLoaded", () => {
  window.CombatCrocsInstance = new CombatCrocsGame();
  Logger.debug("Phaser version:", Phaser.VERSION);
  Logger.debug("Game configuration loaded:", Config);

  const shortcuts = {
    r: scene => scene?.scene.restart(),
    m: () => window.CombatCrocsInstance.getGame().scene.start("MenuScene"),
    p: scene => {
      if (scene) {
        if (scene.scene.isPaused()) {
          scene.scene.resume();
          Logger.gameEvent("Game resumed");
        } else {
          scene.scene.pause();
          Logger.gameEvent("Game paused");
        }
      }
    },
  };

  document.addEventListener("keydown", event => {
    if (event.ctrlKey && shortcuts[event.key.toLowerCase()]) {
      event.preventDefault();
      const currentScene = window.CombatCrocsInstance.getGame().scene.getScenes(true)[0];
      shortcuts[event.key.toLowerCase()](currentScene);
    }
  });
});

window.addEventListener("error", event => Logger.error("Game initialization error:", event.error));
