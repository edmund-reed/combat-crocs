class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  preload() {
    // Load background image
    this.load.image("map-bg", "src/assets/map-bg.png");

    // Load audio files
    this.load.audio("introMusic", "src/assets/intro.mp3");
  }

  create() {
    // Create image background with bottom aligned (crops from top only, fills width)
    const bgImage = this.add.image(Config.GAME_WIDTH / 2, Config.GAME_HEIGHT, "map-bg");

    // Scale to cover entire screen area (background-size: cover)
    const scaleX = Config.GAME_WIDTH / bgImage.width;
    const scaleY = Config.GAME_HEIGHT / bgImage.height;
    const scale = Math.max(scaleX, scaleY); // Cover behavior - fills all available space

    bgImage.setScale(scale);

    // Anchor to bottom center so bottom stays visible and only top crops
    bgImage.setOrigin(0.5, 1);

    // Start the intro music if loaded
    try {
      if (this.cache.audio && this.cache.audio.get("introMusic")) {
        this.introMusic = this.sound.add("introMusic");
        this.introMusic.setLoop(true);
        this.introMusic.setVolume(0.3); // Start with 30% volume
        this.introMusic.play();
      }
    } catch (error) {
      console.log("Audio loading error:", error.message);
    }

    // Title text
    this.add
      .text(Config.GAME_WIDTH / 2, 100, "COMBAT CROCS", {
        font: "bold 48px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(Config.GAME_WIDTH / 2, 160, "Orlando vs. Crocodiles!", {
        font: "24px Arial",
        fill: "#FFFFFF",
        stroke: "#FF6B35",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Menu options
    const startButton = this.add
      .text(Config.GAME_WIDTH / 2, 250, "START GAME", {
        font: "32px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setInteractive();

    const tutorialButton = this.add
      .text(Config.GAME_WIDTH / 2, 320, "HOW TO PLAY", {
        font: "24px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setInteractive();

    // Add hover effects
    [startButton, tutorialButton].forEach(button => {
      button.on("pointerover", () => {
        button.setScale(1.1);
        button.setFill("#FFFFFF");
      });
      button.on("pointerout", () => {
        button.setScale(1.0);
        button.setFill("#FFD23F");
      });
    });

    // Start game on click
    startButton.on("pointerdown", () => {
      // Stop intro music before transitioning
      if (this.introMusic && this.introMusic.isPlaying) {
        this.introMusic.stop();
        this.introMusic.destroy();
      }
      this.scene.start("MapSelectScene");
    });

    tutorialButton.on("pointerdown", () => {
      this.scene.pause();
      this.showTutorial();
    });

    // Camera shake temporarily disabled for cleaner experience
  }

  showTutorial() {
    // Simple tutorial overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT);

    const tutorialText = this.add
      .text(
        Config.GAME_WIDTH / 2,
        Config.GAME_HEIGHT / 2,
        "HOW TO PLAY:\n\n• Use ARROW KEYS to move and aim\n• SPACE to jump\n• CLICK to shoot weapons\n• Destroy enemies to win!\n\nPress any key to continue...",
        {
          font: "20px Arial",
          fill: "#FFFFFF",
          align: "center",
        },
      )
      .setOrigin(0.5);

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
