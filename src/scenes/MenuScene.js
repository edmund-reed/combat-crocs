import { Config } from "@config";
import { UITextHelpers, UIButtonHelpers, UISceneHelpers } from "@ui";

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  preload() {
    this.load.image("map-bg", "./src/assets/map-bg.png");
    this.load.image("logo", "./src/assets/logo.png");
    this.load.audio("introMusic", "src/assets/intro.mp3");
  }

  create() {
    const layout = UISceneHelpers.getSceneLayout(Config);

    const bgImage = this.add.image(layout.centerX, layout.height, "map-bg");
    bgImage
      .setScale(Math.max(layout.width / bgImage.width, layout.height / bgImage.height))
      .setOrigin(0.5, 1);

    if (this.cache.audio?.get("introMusic")) {
      this.introMusic = this.sound.add("introMusic", { loop: true, volume: 0.3 });
      this.introMusic.play();
    }

    // Logo - 70% bigger
    const logo = this.add.image(layout.centerX, layout.centerY - 180, "logo");
    if (logo.width > 680) logo.setScale(680 / logo.width);

    // Subtitle
    UISceneHelpers.createStyledText(
      this,
      layout.centerX,
      layout.centerY - 92,
      "Orlando vs. Crocodiles!",
      24,
      4,
    );

    // Start button
    UIButtonHelpers.createStyledButton(
      this,
      layout.centerX,
      layout.centerY,
      "START GAME",
      { default: 32, hover: 36 },
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
