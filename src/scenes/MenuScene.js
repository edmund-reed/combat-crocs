import { Config } from "@config";
import { UITextHelpers, UIButtonHelpers } from "@ui";

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  preload() {
    this.load.image("map-bg", "src/assets/map-bg.png");
    this.load.audio("introMusic", "src/assets/intro.mp3");
  }

  create() {
    const { GAME_WIDTH, GAME_HEIGHT } = Config;

    // Background image - cover style, anchored to bottom
    const bgImage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT, "map-bg");
    const scale = Math.max(GAME_WIDTH / bgImage.width, GAME_HEIGHT / bgImage.height);
    bgImage.setScale(scale).setOrigin(0.5, 1);

    // Intro music
    if (this.cache.audio?.get("introMusic")) {
      this.introMusic = this.sound.add("introMusic", { loop: true, volume: 0.3 });
      this.introMusic.play();
    }

    // UI
    UITextHelpers.createTitleText(this, GAME_WIDTH / 2, 100, "COMBAT CROCS");
    UITextHelpers.primaryText(this, GAME_WIDTH / 2, 160, "Orlando vs. Crocodiles!", 24);

    const startButton = UITextHelpers.primaryText(this, GAME_WIDTH / 2, 250, "START GAME", 32).setInteractive();
    UIButtonHelpers.addHoverEffect(startButton);

    startButton.on("pointerdown", () => {
      this.introMusic?.stop();
      this.introMusic?.destroy();
      this.scene.start("MapSelectScene");
    });
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
