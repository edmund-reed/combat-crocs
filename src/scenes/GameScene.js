import { TurnManager, TerrainManager, PlayerManager, PhysicsManager, InputManager, MemoryManager } from "@utils";
import { UIManager, HealthBarManager } from "@ui";
import { MovementManager } from "@player";

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  init() {
    Object.assign(this, {
      players: [],
      gameStarted: false,
      terrain: null,
      aimLine: null,
      currentMapPlatforms: [],
      turnManager: new TurnManager(this),
    });
  }

  preload() {
    ["croc1", "croc2", "chameleon1", "gecko1"].forEach(sprite => this.load.image(sprite, `src/assets/${sprite}.png`));
  }

  create() {
    TerrainManager.createGameTerrain(this);
    PlayerManager.createGamePlayers(this);
    PhysicsManager.initializePhysics(this);
    UIManager.createGameUI(this);
    InputManager.setupInput(this);

    this.turnManager.initializeTeams();
    this.turnManager.startTurn();

    this.time.addEvent({
      delay: 8000,
      callback: () => !this.scene.isPaused && this.cameras.main.shake(300, 0.01),
      loop: true,
    });

    MemoryManager.initialize(this);
    console.log("🎮 GameScene initialization complete");
  }

  update(delta) {
    if (!this.gameStarted) this.gameStarted = true;

    UIManager.checkAndHandleGameEnd(this);

    if (this.turnManager.currentTurnTimer) {
      const remainingTime = Math.ceil(
        (this.turnManager.currentTurnTimer.delay - this.turnManager.currentTurnTimer.elapsed) / 1000,
      );
      this.timerText.setText(`Time: ${remainingTime}`);
    }

    this.players.forEach(player => {
      PlayerManager.updatePlayerPhysics(this, player);
      PlayerManager.updateHitAreaMarker(player);
    });

    const currentPlayerIndex = this.turnManager.getCurrentPlayerIndex();
    const currentPlayer = this.players[currentPlayerIndex];

    if (currentPlayer.canMove) {
      MovementManager.handleMovement(
        this,
        currentPlayer,
        InputManager.getCursors(this),
        InputManager.getSpaceKey(this),
      );
    }

    if (currentPlayer.canShoot) {
      UIManager.updateAimLine(this);
    } else {
      UIManager.clearAimLine(this);
    }

    this.matter.world.getAllBodies().forEach(body => {
      if (body.projectileGraphics && !body.destroyed) {
        body.projectileGraphics.setPosition(body.position.x, body.position.y);
        body.debugOutline?.setPosition(body.position.x, body.position.y);
      }
    });

    HealthBarManager.updateHealthBarPositions(this);
    HealthBarManager.updateHealthBars(this);
  }

  endProjectileTurn() {
    console.log("Projectile turn ended, starting next turn after explosion delay");
    this.time.addEvent({
      delay: 500,
      callback: () => {
        console.log("Starting next turn from endProjectileTurn");
        this.turnManager.startTurn();
      },
    });
  }
}

export default GameScene;
