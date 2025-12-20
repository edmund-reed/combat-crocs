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
  GameplayRecorder,
} from "@utils";
import { UIManager, HealthBarManager } from "@ui";
import { MovementManager } from "@player";
import { WeaponSpriteManager } from "@weapons";
import { TerrainManager } from "@terrain";

// Asset manifest for data-driven loading
const ASSETS = {
  images: {
    "grenade-l1": "weapons/orange-grenade/orange-grenade-level-1.png",
    "bazooka-l1": "weapons/bazooka/bazooka-level-1.png",
    "shotgun-l1": "weapons/shotgun/shotgun-level-1.png",
    "health-pack": "health-pack.png",
    rip: "rip.png",
    crosshair: "crosshair.png",
    "generic-map": "backgrounds/generic-map.png",
    terrain: "textures/ground-terrain.png",
    "terrain-2": "textures/ground-terrain-2.png",
    brick: "textures/brick.png",
    "hotel-horror": "rides/hotel-of-horror/hotel.png",
    "elevator-horror": "rides/hotel-of-horror/elevator.png",
    "metal-coaster": "rides/heavy-metal-coaster/metal-coaster.png",
    "donut-coaster": "rides/heavy-metal-coaster/donut.png",
    "palm-tree-coaster": "rides/heavy-metal-coaster/palm-tree.png",
  },
  json: {
    "metal-coaster-physics": "rides/heavy-metal-coaster/metal-coaster.json",
    "donut-coaster-physics": "rides/heavy-metal-coaster/donut.json",
    "palm-tree-coaster-physics": "rides/heavy-metal-coaster/palm-tree.json",
  },
};

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  init() {
    Object.assign(this, {
      players: [],
      terrain: null,
      aimIndicator: null,
      currentMapPlatforms: [],
      turnManager: new TurnManager(this),
      hasAttackedThisTurn: false,
      canReviveThisTurn: true,
      recorder: new GameplayRecorder(),
    });
  }

  preload() {
    Object.entries(ASSETS.images).forEach(([k, v]) => this.load.image(k, `src/assets/${v}`));
    Object.entries(ASSETS.json).forEach(([k, v]) => this.load.json(k, `src/assets/${v}`));
    Object.values(MapManager.maps).forEach(map => {
      if (map?.id && map?.rideFolder) {
        this.load.image(`${map.id}-bg`, `src/assets/rides/${map.rideFolder}/background.png`);
      }
    });
  }

  create() {
    const mapId = window.CombatCrocs?.gameState?.game?.selectedMap || MapManager.getCurrentMap().id;
    const bgKey = this.textures.exists(`${mapId}-bg`) ? `${mapId}-bg` : "generic-map";
    const bg = this.add.image(Config.GAME_WIDTH / 2, Config.GAME_HEIGHT, bgKey);
    bg.setOrigin(0.5, 1)
      .setScale(Math.max(Config.GAME_WIDTH / bg.width, Config.GAME_HEIGHT / bg.height))
      .setDepth(-100);

    // Initialize game systems
    TerrainManager.createGameTerrain(this);
    PlayerManager.createGamePlayers(this);
    PhysicsManager.initializePhysics(this);
    UIManager.createGameUI(this);
    InputManager.setupInput(this);

    this.healthCrates = [];
    this.rKey = this.input.keyboard.addKey("R");

    // Setup recording toggle (K key)
    this.kKey = this.input.keyboard.addKey("K");
    this.input.keyboard.on("keydown-K", () => {
      if (!this.recorder.isRecording) {
        this.recorder.startRecording(this);
        UIManager.showNotification?.(this, "🔴 Recording gameplay for AI training...");
      } else {
        this.recorder.stopRecording();
        this.recorder.exportRecording();
        UIManager.showNotification?.(this, "✅ Recording saved!");
      }
    });

    this.turnManager.initializeTeams();
    this.turnManager.startTurn();

    StateManager.initialize(this);
  }

  update() {
    UIManager.checkAndHandleGameEnd(this);

    const timer = this.turnManager.currentTurnTimer;
    if (timer) UIManager.updateTimer(this, (timer.delay - timer.elapsed) / 1000);

    const weaponConfig = Config.WEAPON_CONFIGS[this.turnManager.getCurrentWeapon()];
    this.players.forEach(p => {
      PlayerManager.updatePlayerPhysics(this, p);
      PlayerManager.updateHitAreaMarker(p);
      WeaponSpriteManager.updateWeaponSprite(p, weaponConfig, p.aimAngle);
    });

    LastStandManager.updateLastStandPlayers(this);

    const currentPlayer = this.players[this.turnManager.getCurrentPlayerIndex()];
    if (currentPlayer?.canMove) {
      MovementManager.handleMovement(this, currentPlayer, this.cursors, this.spaceKey);
      if (
        LastStandManager.handleRevivalInput(this, currentPlayer, Phaser.Input.Keyboard.JustDown(this.rKey))
      ) {
        this.turnManager.turnInProgress = false;
        this.turnManager.startTurn();
      }
    }
    const isMoving = this.cursors.left.isDown || this.cursors.right.isDown;
    InputManager.handleAimingInput(this, currentPlayer, this.cursors, isMoving);
    PhysicsManager.updatePhysicsBodies(this);
    HealthBarManager.updateHealthBarPositions(this);
    HealthBarManager.updateHealthBars(this);
    HealthPackManager.update(this);
  }

  spawnHealthCrate = () => HealthPackManager.spawn(this);
  endProjectileTurn = () => this.time.delayedCall(500, () => this.turnManager.startTurn());
}

export default GameScene;
