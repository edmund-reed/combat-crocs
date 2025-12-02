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
    const centerX = GAME_WIDTH / 2;

    const bgImage = this.add.image(centerX, GAME_HEIGHT, "map-bg");
    bgImage.setScale(Math.max(GAME_WIDTH / bgImage.width, GAME_HEIGHT / bgImage.height)).setOrigin(0.5, 1);

    if (this.cache.audio?.get("introMusic")) {
      this.introMusic = this.sound.add("introMusic", { loop: true, volume: 0.3 });
      this.introMusic.play();
    }

    UITextHelpers.createTitleText(this, centerX, 100, "COMBAT CROCS");
    UITextHelpers.primaryText(this, centerX, 160, "Orlando vs. Crocodiles!", 24);

    const startButton = UIButtonHelpers.addHoverEffect(
      UITextHelpers.primaryText(this, centerX, 250, "START GAME", 32).setInteractive(),
    );
    startButton.on(
      "pointerdown",
      () => (this.introMusic?.stop(), this.introMusic?.destroy(), this.scene.start("MapSelectScene")),
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
