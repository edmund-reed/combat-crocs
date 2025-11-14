class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  init() {
    // Initialize game state - now delegates to managers
    this.players = [];
    this.terrain = null;
    this.currentWeapon = "BAZOOKA";
    this.aimLine = null; // Yellow direction arrow

    // Initialize system managers
    this.turnManager = TurnManager.getInstance(this);
    this.healthBarManager = HealthBarManager.getInstance();
  }

  preload() {
    // Load crocodile character sprites
    this.load.image("croc1", "src/assets/croc1.png");
    this.load.image("croc2", "src/assets/croc2.png");
  }

  create() {
    // Make GameScene accessible globally for HealthBarManager
    window.currentGameScene = this;

    // Create the basic terrain
    this.createTerrain();

    // Create players
    this.createPlayers();

    // Set up physics world bounds
    this.matter.world.setBounds(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT);

    // Initialize scalable health system (before UI)
    this.initializeHealthSystem();

    // Create UI elements
    this.createUI();

    // Set up input handling
    this.setupInput();

    // Initialize turn system
    this.turnManager.startTurn();

    // Add slight camera shake effect occasionally
    this.time.addEvent({
      delay: 8000,
      callback: () => {
        if (!this.scene.isPaused) {
          this.cameras.main.shake(300, 0.01);
        }
      },
      loop: true,
    });
  }

  createTerrain() {
    TerrainManager.createGround(this);
    TerrainManager.createPlatforms(this);
  }

  createPlayers() {
    this.players = [];
    const spawnPositions = TerrainManager.getSafeSpawnPositions();

    // Create players at safe spawn positions - directly on ground
    const groundY = Config.GAME_HEIGHT - 100;
    // Player body is 20 units tall, so place bottom at ground level
    const spawnY = groundY - 10; // Small offset so they sit properly on ground

    this.players.push(
      PlayerManager.createPlayer(
        this,
        1,
        spawnPositions.player1.x,
        spawnY,
        Config.COLORS.CROCODILE_GREEN
      )
    );
    this.players.push(
      PlayerManager.createPlayer(
        this,
        2,
        spawnPositions.player2.x,
        spawnY,
        Config.COLORS.ORANGE
      )
    );
  }

  getActualTerrainHeightAtX(x) {
    // Better terrain height calculation
    // Since terrain is generated procedurally, we need a more accurate method
    const baseHeight = Config.GAME_HEIGHT - 200;
    const heightVariation =
      Math.sin(x * 0.01) * 60 +
      Math.sin(x * 0.02) * 30 +
      Math.sin(x * 0.005) * 100;

    return baseHeight + heightVariation;
  }

  createPlayer(id, x, y, color) {
    const playerGraphics = this.add.graphics({ x: x, y: y });

    // Draw crocodile as geometric shapes
    playerGraphics.fillStyle(color);

    // Body
    playerGraphics.fillRect(-15, -10, 30, 20);

    // Head
    playerGraphics.fillRect(15, -8, 12, 16);

    // Legs (simple rectangles)
    playerGraphics.fillRect(-12, 10, 8, 12);
    playerGraphics.fillRect(4, 10, 8, 12);

    // Tail
    playerGraphics.fillRect(-20, -5, 8, 10);

    // Eye and teeth (bright colors)
    playerGraphics.fillStyle(0xffd23f);
    playerGraphics.fillRect(18, -4, 4, 4);

    playerGraphics.fillStyle(0xffffff);
    playerGraphics.fillRect(21, -3, 6, 3);
    playerGraphics.fillRect(27, -3, 6, 3);

    // Create physics body
    const body = this.matter.add.rectangle(x, y, 30, 20, {
      friction: 0.1,
      restitution: 0.1,
      density: 0.01,
    });

    const player = {
      id: id,
      graphics: playerGraphics,
      body: body,
      x: x,
      y: y,
      health: 100,
      color: color,
      aimAngle: 0,
      canMove: false,
      canShoot: false,
    };

    // Don't set gameObject to avoid Phaser emit expectations
    // We'll track physics manually

    return player;
  }

  updatePlayerPhysics(player) {
    // Cancel any existing velocity and position on ground
    this.matter.body.setVelocity(player.body, { x: 0, y: 0 });
    this.matter.body.setPosition(player.body, { x: player.x, y: player.y });
  }

  createUI() {
    // 🎨 Single UI initialization call - delegates to UIManager comprehensive setup
    UIManager.initializeGameUI(this);
  }

  setupInput() {
    // Keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // Mouse aiming
    this.input.on("pointermove", this.handleAiming, this);
    this.input.on("pointerdown", this.handleShooting, this);

    // Clear aim line on turn change
    this.events.on("turnChange", () => {
      this.clearAimLine();
    });
  }

  handleAiming(pointer) {
    const currentPlayer = this.turnManager.getCurrentPlayer();
    if (!currentPlayer.canShoot) return;

    const angle = Phaser.Math.Angle.Between(
      currentPlayer.x,
      currentPlayer.y,
      pointer.worldX,
      pointer.worldY
    );
    currentPlayer.aimAngle = angle;

    // Update aim line when mouse moves
    this.updateAimLine();
  }

  // Initialize the scalable health system for all players
  initializeHealthSystem() {
    const healthBarManager = HealthBarManager.getInstance();
    healthBarManager.initializeHealthForPlayers(this.players);
  }

  updateHealthDisplay() {
    UIManager.updateHealthBars(this);
  }

  endGame(winningTeam) {
    // Don't pause the scene - keep input working
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT);

    // Use TextHelper for game over text (pass team winner)
    const gameOverText = TextHelper.createCustom(
      this,
      Config.GAME_WIDTH / 2,
      Config.GAME_HEIGHT / 2,
      `Team ${winningTeam} Wins!\n\nClick to return to menu`,
      32,
      "#FFD23F",
      "#000000",
      2
    );
    gameOverText.setOrigin(0.5);
    gameOverText.setAlign("center");

    // Make interactive and handle the click to return to menu
    gameOverText.setInteractive();
    gameOverText.on("pointerdown", () => {
      this.scene.stop();
      this.scene.start("MenuScene");
    });

    // Also allow clicking anywhere on the overlay
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );
    overlay.on("pointerdown", () => {
      this.scene.stop();
      this.scene.start("MenuScene");
    });
  }

  update(time, delta) {
    // Delegate timer and turn management to TurnManager
    this.turnManager.updateTimer(delta);

    // PHYSICS: Update ALL players (gravity, position sync) - runs even during projectile flight
    this.players.forEach((player) => {
      PlayerManager.updatePlayerPhysics(this, player);
    });

    // CONTROLS: Only current player gets movement controls when they can move
    const currentPlayerIndex = this.turnManager.getCurrentPlayerIndex();
    if (this.players[currentPlayerIndex].canMove) {
      const currentPlayer = this.players[currentPlayerIndex];
      PlayerManager.handleMovement(
        this,
        currentPlayer,
        this.cursors,
        this.spaceKey
      );
    }

    // Update aim line continuously when player can shoot (follows player movement)
    const currentPlayer = this.turnManager.getCurrentPlayer();
    if (currentPlayer.canShoot) {
      this.updateAimLine();
    } else {
      this.clearAimLine();
    }

    // Update projectile positions and debug outlines
    this.matter.world.getAllBodies().forEach((body) => {
      if (body.projectileGraphics && !body.destroyed) {
        // Sync projectile graphics with physics body
        body.projectileGraphics.setPosition(body.position.x, body.position.y);

        // Sync debug outline with physics body
        if (body.debugOutline) {
          body.debugOutline.setPosition(body.position.x, body.position.y);
        }
      }
    });
  }

  updateAimLine() {
    this.clearAimLine();

    // Only show aiming when player can shoot
    const currentPlayer = this.turnManager.getCurrentPlayer();
    if (!currentPlayer.canShoot) return;

    const mouse = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(
      currentPlayer.x,
      currentPlayer.y,
      mouse.worldX,
      mouse.worldY
    );

    // Create yellow direction arrow
    this.aimLine = this.add.graphics();
    this.aimLine.lineStyle(4, 0xffd23f); // Thick yellow line
    this.aimLine.moveTo(currentPlayer.x, currentPlayer.y);

    // Show direction with arrowhead (extended line for better visibility)
    const lineLength = Math.max(
      150,
      300 - Math.abs(currentPlayer.body.velocity.y) * 5
    );
    const endX = currentPlayer.x + Math.cos(angle) * lineLength;
    const endY = currentPlayer.y + Math.sin(angle) * lineLength;

    this.aimLine.lineTo(endX, endY);
    this.aimLine.strokePath();

    // Add arrowhead
    const arrowSize = 12;
    this.aimLine.moveTo(endX, endY);
    this.aimLine.lineTo(
      endX - Math.cos(angle - Math.PI / 6) * arrowSize,
      endY - Math.sin(angle - Math.PI / 6) * arrowSize
    );
    this.aimLine.moveTo(endX, endY);
    this.aimLine.lineTo(
      endX - Math.cos(angle + Math.PI / 6) * arrowSize,
      endY - Math.sin(angle + Math.PI / 6) * arrowSize
    );
    this.aimLine.strokePath();
  }

  clearAimLine() {
    if (this.aimLine) {
      this.aimLine.destroy();
      this.aimLine = null;
    }
  }

  handleShooting(pointer) {
    const player = this.turnManager.getCurrentPlayer();
    if (!player.canShoot || this.turnManager.isTurnInProgress()) return;

    // Lock player and launch projectile
    this.turnManager.lockPlayerForProjectile();
    WeaponManager.createProjectile(
      this,
      player,
      pointer.worldX,
      pointer.worldY
    );
  }

  endProjectileTurn() {
    // Delegate to TurnManager for proper turn transitions
    this.turnManager.endProjectileTurn();
  }
}
