class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  init() {
    // Initialize game state
    this.currentPlayer = 0;
    this.players = [];
    this.turnTimer = 0;
    this.gameStarted = false;
    this.terrain = null;
    this.currentWeapon = "BAZOOKA";
    this.aiming = false;
    this.aimDirection = 0;
    this.aimLine = null; // Yellow direction arrow
    this.turnInProgress = false; // Prevents next player from moving
  }

  preload() {
    // Load crocodile character sprites
    this.load.image("croc1", "src/assets/croc1.png");
    this.load.image("croc2", "src/assets/croc2.png");
    console.log("🔄 Loading crocodile sprites...");
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
    this.startTurn();

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

  startTurn() {
    // Log position before starting turn
    this.players.forEach((player) => {
      console.log(
        `Player ${player.id} position before turn: (${player.x}, ${player.y})`
      );
    });

    this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
    this.turnTimer = Config.TURN_TIME_LIMIT / 1000;

    const currentPlayerObj = this.players[this.currentPlayer];
    currentPlayerObj.canMove = true;
    currentPlayerObj.canShoot = true;

    this.playerIndicator.setText(`Player ${currentPlayerObj.id}'s Turn`);
    this.playerIndicator.setFill(
      currentPlayerObj.id === 1 ? "#00FF00" : "#FFD23F"
    );

    // Highlight current player
    currentPlayerObj.graphics.setAlpha(1.0);
    this.players[
      (this.currentPlayer + 1) % this.players.length
    ].graphics.setAlpha(0.5);

    // Clear aim line at start of turn
    this.clearAimLine();

    // Log position after starting turn
    console.log(
      `Starting turn for Player ${currentPlayerObj.id} at position: (${currentPlayerObj.x}, ${currentPlayerObj.y})`
    );
  }

  handleAiming(pointer) {
    if (!this.gameStarted || !this.players[this.currentPlayer].canShoot) return;

    const player = this.players[this.currentPlayer];
    const angle = Phaser.Math.Angle.Between(
      player.x,
      player.y,
      pointer.worldX,
      pointer.worldY
    );
    player.aimAngle = angle;

    // Update aim line when mouse moves
    this.updateAimLine();
  }

  handleShooting(pointer) {
    const player = this.players[this.currentPlayer];
    if (!player.canShoot || this.turnInProgress) return;

    console.log(
      `Player ${player.id} shooting at (${pointer.worldX}, ${pointer.worldY})`
    );

    // Player physics continues normally while projectile flies
    // They just lose movement control during projectile flight

    // Prevent shooting while turn is in progress
    this.turnInProgress = true;
    WeaponManager.createProjectile(
      this,
      player,
      pointer.worldX,
      pointer.worldY
    );
    player.canShoot = false;
    player.canMove = false; // Lock movement during projectile flight

    // Clear aim line
    this.clearAimLine();
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

    console.log(`🏆 Game Over - Team ${winningTeam} victorious!`);
  }

  update(time, delta) {
    if (!this.gameStarted) {
      this.gameStarted = true;
    }

    // Update turn timer
    this.turnTimer = Math.max(0, this.turnTimer - delta / 1000);
    this.timerText.setText(`Time: ${Math.ceil(this.turnTimer)}`);

    // End turn if timer runs out and player hasn't started shooting yet
    if (this.turnTimer <= 0 && !this.turnInProgress) {
      console.log("Turn timer expired, starting next turn");
      this.startTurn();
    }

    // PHYSICS: Update ALL players (gravity, position sync) - runs even during projectile flight
    this.players.forEach((player) => {
      PlayerManager.updatePlayerPhysics(this, player);
    });

    // CONTROLS: Only current player gets movement controls when they can move
    if (this.players[this.currentPlayer].canMove) {
      const currentPlayer = this.players[this.currentPlayer];
      PlayerManager.handleMovement(
        this,
        currentPlayer,
        this.cursors,
        this.spaceKey
      );
    }

    // Clean physics flow: Players continue their jump/fall during projectile flight
    // Movement controls are restored only when their turn begins

    // Update aim line continuously when player can shoot (follows player movement)
    if (this.players[this.currentPlayer].canShoot) {
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
    if (!this.players[this.currentPlayer].canShoot) return;

    const player = this.players[this.currentPlayer];
    const mouse = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(
      player.x,
      player.y,
      mouse.worldX,
      mouse.worldY
    );

    // Create yellow direction arrow
    this.aimLine = this.add.graphics();
    this.aimLine.lineStyle(4, 0xffd23f); // Thick yellow line
    this.aimLine.moveTo(player.x, player.y);

    // Show direction with arrowhead (extended line for better visibility)
    const lineLength = Math.max(
      150,
      300 - Math.abs(player.body.velocity.y) * 5
    );
    const endX = player.x + Math.cos(angle) * lineLength;
    const endY = player.y + Math.sin(angle) * lineLength;

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
    const player = this.players[this.currentPlayer];
    if (!player.canShoot || this.turnInProgress) return;

    console.log(
      `Player ${player.id} shooting at (${pointer.worldX}, ${pointer.worldY})`
    );
    // Prevent shooting while turn is in progress
    this.turnInProgress = true;
    WeaponManager.createProjectile(
      this,
      player,
      pointer.worldX,
      pointer.worldY
    );
    player.canShoot = false;
    player.canMove = false; // Lock movement during projectile flight

    // Clear aim line
    this.clearAimLine();
  }

  endProjectileTurn() {
    // Reset turn state and start next player's turn
    console.log("Projectile turn ended, resetting turnInProgress to false");
    this.turnInProgress = false;

    // Small delay before starting next turn
    this.time.addEvent({
      delay: 500, // 0.5 seconds delay for explosion effect
      callback: () => {
        console.log("Starting next turn from endProjectileTurn");
        this.startTurn();
      },
    });
  }
}
