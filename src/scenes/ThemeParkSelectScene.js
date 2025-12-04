import { Config } from "@config";
import { UITextHelpers, UIButtonHelpers } from "@ui";
import { Maps as MapManager } from "@utils";

class ThemeParkSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "ThemeParkSelectScene" });
  }

  preload() {
    // Load Florida map background
    this.load.image("floridaMap", "src/assets/backgrounds/florida.png");
    // Load theme park images
    this.load.image("movieStudios", "src/assets/theme-parks/movie-studios.png");
    this.load.image("magicalLand", "src/assets/theme-parks/magical-land.png");
  }

  create() {
    const { GAME_WIDTH, GAME_HEIGHT } = Config;
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Adjustable background properties
    this.bgScale = 1.5; // Zoom level (increase to zoom in)
    this.bgOffsetX = -325; // Pan left/right (negative = left, positive = right)
    this.bgOffsetY = 0; // Pan up/down

    // Add Florida map background
    this.floridaBg = this.add.image(centerX + this.bgOffsetX, centerY + this.bgOffsetY, "floridaMap");
    this.floridaBg.setOrigin(0.5, 0.5);
    this.floridaBg.setScale(this.bgScale);

    // Title with white text and black stroke
    const titleText = this.add
      .text(centerX, 80, "CHOOSE YOUR THEME PARK", {
        font: "bold 36px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    // Subtitle with white text and black stroke
    const subtitleText = this.add
      .text(centerX, 130, "Select a theme park to explore", {
        font: "bold 18px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Individual theme park positions (adjusted for Orlando area on Florida map)
    const themeParkPositions = {
      movieStudios: { x: 600, y: 275 }, // Movie Studios Adventure (285 - 10)
      magicalLand: { x: 750, y: 475 }, // Magical Land (485 - 10)
    };

    // Create theme park options at individual positions
    const themeParkIds = MapManager.getThemeParkIds();
    themeParkIds.forEach(themeParkId => {
      const themePark = MapManager.getThemePark(themeParkId);
      const pos = themeParkPositions[themeParkId];
      this.createThemeParkOption(themePark, pos.x, pos.y, themeParkId);
    });

    // Back button with white text and black stroke
    const backBtn = this.add
      .text(centerX, GAME_HEIGHT - 80, "BACK TO MENU", {
        font: "bold 20px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setInteractive();

    // Custom hover effect: lighter yellow text with darker orange stroke and scale up
    backBtn.on("pointerover", () => {
      backBtn.setStyle({
        font: "bold 22px Arial", // Slightly bigger
        fill: "#FFED4E", // Lighter yellow
        stroke: "#804000", // Darker orange
        strokeThickness: 5,
      });
    });
    backBtn.on("pointerout", () => {
      backBtn.setStyle({
        font: "bold 20px Arial", // Back to normal size
        fill: "#FFFFFF", // White
        stroke: "#000000", // Black
        strokeThickness: 4,
      });
    });
    backBtn.on("pointerdown", () => this.scene.start("MenuScene"));
  }

  createThemeParkOption(themePark, x, y, themeParkId) {
    // Theme park image - sized appropriately for grid layout
    const themeParkImage = this.add.image(x, y, themeParkId).setInteractive();
    const imageSize = 250;
    if (themeParkImage.width > imageSize || themeParkImage.height > imageSize) {
      const scale = imageSize / Math.max(themeParkImage.width, themeParkImage.height);
      themeParkImage.setScale(scale);
    }

    // Start ever so slightly darker
    themeParkImage.setTint(0xcccccc);

    // Hover effects: brighten and scale up
    themeParkImage.on("pointerover", () => {
      themeParkImage.setScale(themeParkImage.scaleX * 1.05);
      themeParkImage.clearTint(); // Fully lit
    });
    themeParkImage.on("pointerout", () => {
      themeParkImage.setScale(themeParkImage.scaleX / 1.05);
      themeParkImage.setTint(0xcccccc); // Back to slightly darker
    });
    themeParkImage.on("pointerdown", () => {
      MapManager.setSelectedThemePark(themePark.id);
      console.log(`Selected theme park: ${themePark.name} (${themePark.id})`);
      this.scene.start("MapSelectScene");
    });
  }
}

export default ThemeParkSelectScene;
