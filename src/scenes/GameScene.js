class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  init() {
    // Initialize game state
    this.players = [];
    this.gameStarted = false;
    this.terrain = null;
    this.aimLine = null; // Yellow direction arrow
    this.currentMapPlatforms = []; // Store current map's platform data

    // Initialize turn manager
    this.turnManager = new TurnManager(this);
  }

  preload() {
    // Load all character sprites
    this.load.image("croc1", "src/assets/croc1.png");
    this.load.image("croc2", "src/assets/croc2.png");
    this.load.image("chameleon1", "src/assets/chameleon1.png");
    this.load.image("gecko1", "src/assets/gecko1.png");
  }

  create() {
    // Create the basic terrain
    TerrainManager.createGameTerrain(this);

    // Create players
    PlayerManager.createGamePlayers(this);

    // Set up physics world bounds
    this.matter.world.setBounds(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT);

    // Create UI elements
    UIManager.createGameUI(this);

    // Set up input handling
    InputManager.setupInput(this);

    // Initialize turn system
    this.turnManager.initializeTeams();
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

  update(time, delta) {
    if (!this.gameStarted) {
      this.gameStarted = true;
    }

    // Check for game end conditions at the start of each update
    UIManager.checkAndHandleGameEnd(this);

    // Update turn timer
    const currentTurnTime = this.turnManager.updateTurnTimer(delta / 1000);
    this.timerText.setText(`Time: ${currentTurnTime}`);

    // End turn if timer runs out and player hasn't started shooting yet
    if (this.turnManager.shouldEndTurn()) {
      console.log("Turn timer expired, starting next turn");
      this.turnManager.startTurn();
    }

    // PHYSICS: Update ALL players (gravity, position sync) - runs even during projectile flight
    this.players.forEach(player => {
      PlayerManager.updatePlayerPhysics(this, player);
    });

    // CONTROLS: Only current player gets movement controls when they can move
    const currentPlayerIndex = this.turnManager.getCurrentPlayerIndex();
    if (this.players[currentPlayerIndex].canMove) {
      const currentPlayer = this.players[currentPlayerIndex];
      MovementManager.handleMovement(
        this,
        currentPlayer,
        InputManager.getCursors(this),
        InputManager.getSpaceKey(this),
      );
    }

    // Clean physics flow: Players continue their jump/fall during projectile flight
    // Movement controls are restored only when their turn begins

    // Update aim line continuously when player can shoot (follows player movement)
    if (this.players[currentPlayerIndex].canShoot) {
      UIManager.updateAimLine(this);
    } else {
      UIManager.clearAimLine(this);
    }

    // Update projectile positions and debug outlines
    this.matter.world.getAllBodies().forEach(body => {
      if (body.projectileGraphics && !body.destroyed) {
        // Sync projectile graphics with physics body
        body.projectileGraphics.setPosition(body.position.x, body.position.y);

        // Sync debug outline with physics body
        if (body.debugOutline) {
          body.debugOutline.setPosition(body.position.x, body.position.y);
        }
      }
    });

    // Update health bar positions and graphics(colors/fill) above players
    UIManager.updateHealthBarPositions(this);
    UIManager.updateHealthBars(this);
  }

  endProjectileTurn() {
    // Reset turn state and start next player's turn with explosion effect delay
    console.log("Projectile turn ended, starting next turn after explosion delay");

    // Small delay before starting next turn (for explosion effect)
    this.time.addEvent({
      delay: 500, // 0.5 seconds delay for explosion effect
      callback: () => {
        console.log("Starting next turn from endProjectileTurn");
        this.turnManager.startTurn();
      },
    });
  }
}
