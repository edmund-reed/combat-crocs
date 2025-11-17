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
    // Load crocodile character sprites
    this.load.image("croc1", "src/assets/croc1.png");
    this.load.image("croc2", "src/assets/croc2.png");
    console.log("🔄 Loading crocodile sprites...");
  }

  create() {
    // Create the basic terrain
    this.createTerrain();

    // Create players
    this.createPlayers();

    // Set up physics world bounds
    this.matter.world.setBounds(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT);

    // Create UI elements
    this.createUI();

    // Set up input handling
    InputManager.setupInput(this);

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

    // Get selected map and create platforms based on its configuration
    const selectedMap = window.MapManager.getCurrentMap();
    this.currentMapPlatforms = TerrainManager.createPlatforms(this, selectedMap);
    console.log(`🎮 Loaded ${this.currentMapPlatforms.length} platforms for map: ${selectedMap.name}`);
  }

  createPlayers() {
    // Get team counts from global game state
    const teamACount = window.CombatCrocs.gameState.game.teamACount || 1;
    const teamBCount = window.CombatCrocs.gameState.game.teamBCount || 1;

    this.players = [];
    this.playerSprites = {};
    this.playerBodies = {};

    // Calculate spawn positions for multiple players per team
    const groundY = Config.GAME_HEIGHT - 100;
    const spawnY = groundY - 10; // Small offset so they sit properly on ground

    // Create ALL players first with temporary positions
    for (let i = 0; i < teamACount; i++) {
      const playerId = `A${i + 1}`;
      const player = PlayerManager.createPlayer(
        this,
        playerId,
        100 + i * 50, // Temporary positions
        spawnY,
        Config.COLORS.CROCODILE_GREEN,
      );
      this.players.push(player);
    }

    for (let i = 0; i < teamBCount; i++) {
      const playerId = `B${i + 1}`;
      const player = PlayerManager.createPlayer(
        this,
        playerId,
        200 + i * 50 + teamACount * 50, // Temporary positions
        spawnY,
        Config.COLORS.ORANGE,
      );
      this.players.push(player);
    }

    // Now assign random positions to ALL players
    PlayerManager.assignRandomSpawnPositions(this, this.players);

    // Update sprite and body references
    this.players.forEach(player => {
      this.playerSprites[player.id] = player.graphics;
      this.playerBodies[player.id] = player.body;
    });

    console.log(`Created ${this.players.length} players: Team A (${teamACount}), Team B (${teamBCount})`);
  }

  createUI() {
    UIManager.createHealthBars(this);
    UIManager.createWeaponDisplay(this);
    UIManager.createTimerDisplay(this);
    UIManager.createTurnIndicator(this);
    UIManager.createInstructions(this);
    UIManager.createWeaponSelectIcon(this);
  }

  checkGameEnd() {
    // Check if all players on one team are dead
    const teamAPlayers = this.players.filter(p => typeof p.id === "string" && p.id.startsWith("A"));
    const teamBPlayers = this.players.filter(p => typeof p.id === "string" && p.id.startsWith("B"));

    const teamAAlive = teamAPlayers.some(p => p.health > 0);
    const teamBAlive = teamBPlayers.some(p => p.health > 0);

    if (!teamAAlive && teamBAlive) {
      // Team B wins
      UIManager.showGameEndScreen(this, "Team B");
      return true;
    } else if (teamAAlive && !teamBAlive) {
      // Team A wins
      UIManager.showGameEndScreen(this, "Team A");
      return true;
    }

    return false; // Game continues
  }

  update(time, delta) {
    if (!this.gameStarted) {
      this.gameStarted = true;
    }

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
      PlayerManager.handleMovement(this, currentPlayer, InputManager.getCursors(this), InputManager.getSpaceKey(this));
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

    // Update health bar positions above players
    UIManager.updateHealthBarPositions(this);
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
