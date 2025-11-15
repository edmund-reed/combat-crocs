// Main Combat Crocs Game Entry Point
// Initializes the Phaser game with all scenes and configuration

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

    console.log("Combat Crocs Game Initialized!");
    console.log(
      "Controls: Arrow keys to move/jump, SPACE to jump, Mouse click to shoot"
    );
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
  console.log("Phaser version:", Phaser.VERSION);
  console.log("Game configuration loaded:", Config);

  // Add keyboard shortcuts for development
  document.addEventListener("keydown", (event) => {
    // Press 'R' to restart the current scene
    if (event.key.toLowerCase() === "r" && event.ctrlKey) {
      event.preventDefault();
      const currentScene =
        window.CombatCrocsInstance.getGame().scene.getScenes(true)[0];
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
      const currentScene =
        window.CombatCrocsInstance.getGame().scene.getScenes(true)[0];
      if (currentScene) {
        if (currentScene.scene.isPaused()) {
          currentScene.scene.resume();
          console.log("Game resumed");
        } else {
          currentScene.scene.pause();
          console.log("Game paused");
        }
      }
    }
  });
});

// Add some visual feedback when the game loads
const gameContainer = document.getElementById("game-container");
const gameCanvas = document.createElement("div");
gameCanvas.id = "game-loading-placeholder";
gameCanvas.style.cssText = `
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ffd23f 100%);
  font-family: Arial, sans-serif;
`;

gameCanvas.innerHTML = `
  <div style="text-align: center; color: white; font-size: 24px; margin-bottom: 20px;">
    🐊 Loading Combat Crocs...
  </div>
  <div style="width: 300px; height: 20px; background: rgba(255,255,255,0.3); border-radius: 10px; overflow: hidden;">
    <div id="loading-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #ff6b35, #ffd23f); border-radius: 10px; transition: width 0.3s;"></div>
  </div>
  <div style="margin-top: 20px; color: rgba(255,255,255,0.8); font-size: 14px;">
    Orlando-themed physics battles await!
  </div>
`;

// Replace loading text after game initializes
setTimeout(() => {
  const loadingPlaceholder = document.getElementById(
    "game-loading-placeholder"
  );
  if (loadingPlaceholder) {
    loadingPlaceholder.remove();
  }

  // Update the UI indicator
  const uiIndicator = document.querySelector(".turn-indicator");
  if (uiIndicator) {
    uiIndicator.textContent = "Combat Crocs Ready!";
    setTimeout(() => {
      uiIndicator.textContent = 'Click "START GAME" to begin';
    }, 2000);
  }

  // Animate loading bar
  const loadingBar = document.getElementById("loading-bar");
  if (loadingBar) {
    loadingBar.style.width = "100%";
    setTimeout(() => {
      const placeholder = document.getElementById("game-loading-placeholder");
      if (placeholder) {
        placeholder.style.opacity = "0";
        setTimeout(() => placeholder.remove(), 500);
      }
    }, 1500);
  }
}, 100);

// Error handling for game initialization
window.addEventListener("error", (event) => {
  console.error("Game initialization error:", event.error);
  const uiIndicator = document.querySelector(".turn-indicator");
  if (uiIndicator) {
    uiIndicator.textContent = "Error loading game. Check console for details.";
    uiIndicator.style.color = "#ff0000";
  }
});

// Handle Phaser-specific errors
window.addEventListener("phaserError", (event) => {
  console.error("Phaser error:", event.detail);
});
