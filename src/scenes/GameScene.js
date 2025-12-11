import { Config } from "@config";
import {
  TurnManager,
  TerrainManager,
  PlayerManager,
  PhysicsManager,
  InputManager,
  StateManager,
  LastStandManager,
} from "@utils";
import { UIManager, HealthBarManager } from "@ui";
import { MovementManager } from "@player";
import { WeaponSpriteManager } from "@weapons";

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  init() {
    Object.assign(this, {
      players: [],
      terrain: null,
      aimLine: null,
      currentMapPlatforms: [],
      turnManager: new TurnManager(this),
      hasAttackedThisTurn: false,
      canReviveThisTurn: true,
    });
  }

  preload() {
    this.load.image("croc-1", "src/assets/players/croc-1.png");
    this.load.image("croc-2", "src/assets/players/croc-2.png");
    this.load.image("chameleon-1", "src/assets/players/chameleon-1.png");
    this.load.image("gecko-1", "src/assets/players/gecko-1.png");
    this.load.image("grenade-l1", "src/assets/weapons/orange-grenade/orange-grenade-level-1.png");
    this.load.image("bazooka-l1", "src/assets/weapons/bazooka/bazooka-level-1.png");
    this.load.image("shotgun-l1", "src/assets/weapons/shotgun/shotgun-level-1.png");
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

    StateManager.initialize(this);
    console.log("🎮 GameScene initialization complete");
  }

  update(delta) {
    UIManager.checkAndHandleGameEnd(this);

    const timer = this.turnManager.currentTurnTimer;
    if (timer) UIManager.updateTimer(this, (timer.delay - timer.elapsed) / 1000);

    const weaponConfig = Config.WEAPON_CONFIGS[this.turnManager.getCurrentWeapon()];
    this.players.forEach(player => {
      PlayerManager.updatePlayerPhysics(this, player);
      PlayerManager.updateHitAreaMarker(player);
      WeaponSpriteManager.updateWeaponSprite(player, weaponConfig, player.aimAngle);
    });

    LastStandManager.updateLastStandPlayers(this);

    const currentPlayer = this.players[this.turnManager.getCurrentPlayerIndex()];
    const cursors = InputManager.getCursors(this);

    if (currentPlayer?.canMove) {
      MovementManager.handleMovement(this, currentPlayer, cursors, InputManager.getSpaceKey(this));

      const rKey = this.input.keyboard.addKey("R");
      if (LastStandManager.handleRevivalInput(this, currentPlayer, Phaser.Input.Keyboard.JustDown(rKey))) {
        this.turnManager.turnInProgress = false;
        this.turnManager.startTurn();
      }
    }

    const isMoving = cursors.left.isDown || cursors.right.isDown;
    InputManager.handleAimingInput(this, currentPlayer, cursors, isMoving);

    PhysicsManager.updateProjectiles(this);
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
