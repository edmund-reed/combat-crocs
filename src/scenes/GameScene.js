import { Config } from "@config";
import {
  TurnManager,
  PlayerManager,
  PhysicsManager,
  InputManager,
  StateManager,
  LastStandManager,
  Maps as MapManager,
  HealthPackManager,
} from "@utils";
import { UIManager, HealthBarManager } from "@ui";
import { MovementManager } from "@player";
import { WeaponSpriteManager } from "@weapons";
import { TerrainManager } from "@terrain";

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
    // Weapons
    this.load.image("grenade-l1", "src/assets/weapons/orange-grenade/orange-grenade-level-1.png");
    this.load.image("bazooka-l1", "src/assets/weapons/bazooka/bazooka-level-1.png");
    this.load.image("shotgun-l1", "src/assets/weapons/shotgun/shotgun-level-1.png");

    // UI / environment
    this.load.image("health-pack", "src/assets/health-pack.png");
    this.load.image("generic-map", "src/assets/backgrounds/generic-map.png");
    this.load.image("terrain", "src/assets/textures/ground-terrain.png");
    this.load.image("terrain-2", "src/assets/textures/ground-terrain-2.png");
    this.load.image("brick", "src/assets/textures/brick.png");

    // Ride backgrounds (optional): src/assets/rides/<rideFolder>/background.png
    // We register them as `${mapId}-bg` and fall back to `generic-map` if missing.
    Object.values(MapManager.maps).forEach(map => {
      if (!map?.id || !map?.rideFolder) return;
      this.load.image(`${map.id}-bg`, `src/assets/rides/${map.rideFolder}/background.png`);
    });

    // Ride / map-specific sprites (still explicitly loaded for now)
    this.load.image("hotel-horror", "src/assets/rides/hotel-of-horror/hotel.png");
    this.load.image("elevator-horror", "src/assets/rides/hotel-of-horror/elevator.png");

    this.load.image("metal-coaster", "src/assets/rides/heavy-metal-coaster/metal-coaster.png");
    this.load.json("metal-coaster-physics", "src/assets/rides/heavy-metal-coaster/metal-coaster.json");
    this.load.image("donut-coaster", "src/assets/rides/heavy-metal-coaster/donut.png");
    this.load.json("donut-coaster-physics", "src/assets/rides/heavy-metal-coaster/donut.json");
    this.load.image("palm-tree-coaster", "src/assets/rides/heavy-metal-coaster/palm-tree.png");
    this.load.json("palm-tree-coaster-physics", "src/assets/rides/heavy-metal-coaster/palm-tree.json");
  }

  create() {
    const selectedMapId = window.CombatCrocs?.gameState?.game?.selectedMap || MapManager.getCurrentMap().id;
    console.log("[GameScene] Using map for background:", selectedMapId);
    const preferredBgKey = `${selectedMapId}-bg`;
    const bgKey = this.textures.exists(preferredBgKey) ? preferredBgKey : "generic-map";
    const bg = this.add.image(Config.GAME_WIDTH / 2, Config.GAME_HEIGHT, bgKey);
    const bgScale = Math.max(Config.GAME_WIDTH / bg.width, Config.GAME_HEIGHT / bg.height);
    bg.setOrigin(0.5, 1).setScale(bgScale).setDepth(-100);

    TerrainManager.createGameTerrain(this);
    PlayerManager.createGamePlayers(this);
    PhysicsManager.initializePhysics(this);
    UIManager.createGameUI(this);
    InputManager.setupInput(this);

    this.healthCrates = [];

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

  update() {
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

    PhysicsManager.updatePhysicsBodies(this);
    HealthBarManager.updateHealthBarPositions(this);
    HealthBarManager.updateHealthBars(this);
    HealthPackManager.update(this);
  }

  spawnHealthCrate(amount = Config.HEALTH_CRATE_AMOUNT) {
    HealthPackManager.spawn(this);
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
