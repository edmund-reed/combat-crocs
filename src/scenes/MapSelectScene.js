// Map Selection Scene for Combat Crocs
// Allows players to choose which map/arena to play on

import { Config } from "@config";
import { UITextHelpers, UIButtonHelpers } from "@ui";
import { Maps as MapManager } from "@utils";

class MapSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "MapSelectScene" });
  }

  create() {
    // Background
    this.add
      .graphics()
      .fillGradientStyle(0xff6b35, 0xf7931e, 0xffd23f, 0xffd23f, 1)
      .fillRect(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT);

    // Title
    this.add
      .text(Config.GAME_WIDTH / 2, 80, "CHOOSE YOUR BATTLEFIELD", UITextHelpers._getPrimaryTextStyle(36, 4))
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(Config.GAME_WIDTH / 2, 130, "Select a map to fight on", UITextHelpers._getPrimaryTextStyle(18, 2))
      .setOrigin(0.5);

    // Create map selection options
    this.createMapSelection();

    // Action buttons
    this.createActionButtons();
  }

  createMapSelection() {
    const mapIds = MapManager.getMapIds();
    const startY = 200; // Add gap between subtitle and map list
    const mapSpacing = 120;

    // Display each available map
    mapIds.forEach((mapId, index) => {
      const mapInfo = MapManager.getMapDisplayInfo(mapId);
      const y = startY + index * mapSpacing;
      this.createMapOption(mapId, mapInfo, y, index);
    });
  }

  createMapOption(mapId, mapInfo, y, index) {
    const centerX = Config.GAME_WIDTH / 2;

    // Map button background (visual preview)
    const mapBg = this.add
      .graphics()
      .fillStyle(mapInfo.backgroundColor, 1)
      .fillRect(centerX - 250, y - 40, 500, 80);

    // Difficulty indicator
    const difficultyColor = mapInfo.difficulty === 1 ? "#00FF00" : "#FFFF88"; // Brighter yellow
    UITextHelpers.createStatusText(this, centerX - 230, y - 25, "★".repeat(mapInfo.difficulty), difficultyColor, 16);

    // Map name
    UITextHelpers.secondaryText(this, centerX, y - 25, mapInfo.name, 20);

    // Map description
    UITextHelpers.secondaryText(this, centerX, y + 5, mapInfo.description, 14);

    // Platform count indicator
    UITextHelpers.createMutedText(this, centerX + 200, y + 8, `${mapInfo.platformCount} platforms`, 12);

    // Make entire map option clickable
    const mapButton = this.add.zone(centerX, y, 500, 80).setInteractive();

    // Hover effect
    mapBg.setAlpha(0.8);
    mapButton.on("pointerover", () => {
      mapBg.setAlpha(1.0);
    });
    mapButton.on("pointerout", () => {
      mapBg.setAlpha(0.8);
    });

    // Selection handling
    mapButton.on("pointerdown", () => {
      // Store selected map in global state
      MapManager.setCurrentMap(mapId);
      window.CombatCrocs.gameState.game.selectedMap = mapId;

      console.log(`Selected map: ${mapInfo.name} (${mapId})`);

      // Transition to player selection
      this.scene.start("PlayerSelectScene");
    });
  }

  createActionButtons() {
    const buttonY = Config.GAME_HEIGHT - 120;

    // Back to Menu button
    const backBtn = this.add
      .text(Config.GAME_WIDTH / 2, buttonY, "BACK TO MENU", {
        font: "20px Arial",
        fill: "#0000FF", // Blue text for better contrast
        stroke: "#FFFFFF",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setInteractive();

    // Custom hover effect for blue button
    backBtn.on("pointerover", () => backBtn.setScale(1.1).setFill("#FFFFFF"));
    backBtn.on("pointerout", () => backBtn.setScale(1.0).setFill("#0000FF"));

    // Back to menu
    backBtn.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });
  }
}

export default MapSelectScene;
