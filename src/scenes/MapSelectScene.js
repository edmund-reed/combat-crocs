// Map Selection Scene for Combat Crocs
// Allows players to choose which map/arena to play on

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
    const mapIds = window.MapManager.getMapIds();
    const startY = 180;
    const mapSpacing = 120;

    // Display each available map
    mapIds.forEach((mapId, index) => {
      const mapInfo = window.MapManager.getMapDisplayInfo(mapId);
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
    const difficultyColor = mapInfo.difficulty === 1 ? "#00FF00" : "#FFFF00";
    this.add.text(centerX - 230, y - 25, "★".repeat(mapInfo.difficulty), {
      font: "16px Arial",
      fill: difficultyColor,
    });

    // Map name
    this.add
      .text(centerX, y - 25, mapInfo.name, {
        font: "bold 20px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 1,
      })
      .setOrigin(0.5);

    // Map description
    this.add
      .text(centerX, y + 5, mapInfo.description, {
        font: "14px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 1,
      })
      .setOrigin(0.5);

    // Platform count indicator
    this.add.text(centerX + 200, y + 8, `${mapInfo.platformCount} platforms`, {
      font: "12px Arial",
      fill: "#DDDDDD",
    });

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
      window.MapManager.setCurrentMap(mapId);
      window.CombatCrocs.gameState.game.selectedMap = mapId;

      console.log(`Selected map: ${mapInfo.name} (${mapId})`);

      // Transition to player selection
      this.scene.start("PlayerSelectScene");
    });
  }

  createActionButtons() {
    const buttonY = Config.GAME_HEIGHT - 120;

    // Back to Menu button
    const backBtn = UIButtonHelpers.addHoverEffect(
      this.add
        .text(Config.GAME_WIDTH / 2, buttonY, "BACK TO MENU", UITextHelpers._getPrimaryTextStyle(20, 2))
        .setOrigin(0.5)
        .setInteractive(),
    );

    // Back to menu
    backBtn.on("pointerdown", () => {
      this.scene.start("MenuScene");
    });
  }
}

window.MapSelectScene = MapSelectScene;
