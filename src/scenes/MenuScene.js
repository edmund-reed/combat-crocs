class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  preload() {
    // Load audio files
    this.load.audio("introMusic", "src/assets/intro.mp3");

    // Create basic graphics for the menu
    this.createMenuGraphics();
  }

  createMenuGraphics() {
    // Create a simple gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xff6b35, 0xf7931e, 0xffd23f, 0xffd23f, 1);
    bg.fillRect(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT);

    // Create crocodile logo (simple geometric shape)
    const croc = this.add.graphics({
      x: Config.GAME_WIDTH / 2,
      y: Config.GAME_HEIGHT / 2 - 100,
    });
    croc.fillStyle(0x2d5a3d);
    croc.fillRect(-80, -30, 160, 60); // Body
    croc.fillRect(-100, -20, 20, 40); // Tail
    croc.fillRect(80, -20, 20, 40); // Head
    croc.fillStyle(0xffd23f);
    croc.fillRect(85, -15, 10, 10); // Eye
    croc.fillStyle(0xffff00);
    croc.fillRect(90, -10, 15, 5); // Teeth
    croc.fillRect(75, -10, 15, 5);

    // Add some Orlando-themed elements
    // Rollercoaster track
    const track = this.add.graphics({ x: 100, y: Config.GAME_HEIGHT - 150 });
    track.lineStyle(8, 0xffffff);
    track.beginPath();
    track.moveTo(0, 0);
    track.lineTo(200, -50);
    track.lineTo(400, 20);
    track.lineTo(600, -60);
    track.strokePath();

    // Support pillars
    for (let i = 0; i < 5; i++) {
      track.fillStyle(0x8b4513);
      track.fillRect(100 + i * 100, 0, 20, 50);
    }

    // Water bodies (like Everglades/Lake)
    const water = this.add.graphics({
      x: Config.GAME_WIDTH - 300,
      y: Config.GAME_HEIGHT - 100,
    });
    water.fillStyle(0x7cb9e8);
    water.fillRect(0, 0, 250, 80);
    // Add some wave effects
    water.lineStyle(3, 0x87ceeb);
    water.beginPath();
    water.moveTo(0, 20);
    water.lineTo(40, 15);
    water.lineTo(80, 25);
    water.lineTo(120, 20);
    water.lineTo(160, 30);
    water.lineTo(200, 25);
    water.lineTo(240, 35);
    water.strokePath();
  }

  create() {
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
    [startButton, tutorialButton].forEach((button) => {
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
        }
      )
      .setOrigin(0.5);

    const closeGame = (event) => {
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
