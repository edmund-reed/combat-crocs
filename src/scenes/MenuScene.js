import { Config } from "@config";
import { UITextHelpers, UIButtonHelpers } from "@ui";

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  preload() {
    this.load.image("map-bg", "src/assets/map-bg.png");
    this.load.image("logo", "src/assets/logo.png");
    this.load.audio("introMusic", "src/assets/intro.mp3");
  }

  create() {
    const { GAME_WIDTH, GAME_HEIGHT } = Config;
    const centerX = GAME_WIDTH / 2;

    const bgImage = this.add.image(centerX, GAME_HEIGHT, "map-bg");
    bgImage.setScale(Math.max(GAME_WIDTH / bgImage.width, GAME_HEIGHT / bgImage.height)).setOrigin(0.5, 1);

    if (this.cache.audio?.get("introMusic")) {
      this.introMusic = this.sound.add("introMusic", { loop: true, volume: 0.3 });
      this.introMusic.play();
    }

    const centerY = GAME_HEIGHT / 2;

    // Add logo image - 70% bigger
    const logo = this.add.image(centerX, centerY - 180, "logo");
    const maxLogoWidth = 680; // 400 * 1.7
    if (logo.width > maxLogoWidth) {
      logo.setScale(maxLogoWidth / logo.width);
    }

    // Subtitle with white text and black stroke
    const subtitle = this.add
      .text(centerX, centerY - 92, "Orlando vs. Crocodiles!", {
        font: "bold 24px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Start button with white text and black stroke - vertically centered
    const startButton = this.add
      .text(centerX, centerY, "START GAME", {
        font: "bold 32px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setInteractive();

    // Hover effect: yellow text with darker orange stroke and scale up
    startButton.on("pointerover", () => {
      startButton.setStyle({
        font: "bold 36px Arial", // Bigger on hover
        fill: "#FFED4E", // Lighter yellow
        stroke: "#804000", // Darker orange
        strokeThickness: 6,
      });
    });
    startButton.on("pointerout", () => {
      startButton.setStyle({
        font: "bold 32px Arial", // Back to normal size
        fill: "#FFFFFF", // White
        stroke: "#000000", // Black
        strokeThickness: 5,
      });
    });
    startButton.on(
      "pointerdown",
      () => (this.introMusic?.stop(), this.introMusic?.destroy(), this.scene.start("ThemeParkSelectScene")),
    );
  }

  showTutorial() {
    // Simple tutorial overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT);

    const tutorialText = UITextHelpers.secondaryText(
      this,
      Config.GAME_WIDTH / 2,
      Config.GAME_HEIGHT / 2,
      "HOW TO PLAY:\n\n• Use ARROW KEYS to move and aim\n• SPACE to jump\n• CLICK to shoot weapons\n• Destroy enemies to win!\n\nPress any key to continue...",
      20,
    );

    const closeGame = event => {
      this.input.keyboard.off("keydown", closeGame);
      this.input.on("pointerdown", () => {}, this);
      tutorialText.destroy();
      overlay.destroy();
      this.scene.resume();
    };

    this.input.keyboard.on("keydown", closeGame);
    this.input.on("pointerdown", closeGame, this);
  }
}

export default MenuScene;
