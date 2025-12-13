import { Config } from "@config";
import {
  TurnManager,
  TerrainManager,
  PlayerManager,
  PhysicsManager,
  InputManager,
  StateManager,
  LastStandManager,
  Maps as MapManager,
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
    this.load.image("health-pack", "src/assets/health-pack.png");
    this.load.image("generic-map", "src/assets/backgrounds/generic-map.png");
    this.load.image("terrain", "src/assets/terrain.png");
    this.load.image("brick", "src/assets/brick.png");
    this.load.image("hotel-horror", "src/assets/maps/hotel-of-horror/hotel.png");
    this.load.image("elevator-horror", "src/assets/maps/hotel-of-horror/elevator.png");
    this.load.image("heavy-metal-coaster-bg", "src/assets/rides/heavy-metal-coaster/background.png");
    this.load.image("metal-coaster", "src/assets/rides/heavy-metal-coaster/metal-coaster.png");
    this.load.image("donut-coaster", "src/assets/rides/heavy-metal-coaster/donut.png");
    this.load.image("palm-tree-coaster", "src/assets/rides/heavy-metal-coaster/palm-tree.png");
  }

  create() {
    const selectedMapId = window.CombatCrocs?.gameState?.game?.selectedMap || MapManager.getCurrentMap().id;
    console.log("[GameScene] Using map for background:", selectedMapId);
    const bgKey = selectedMapId === "heavyMetalCoaster" ? "heavy-metal-coaster-bg" : "generic-map";
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

  update(delta) {
    UIManager.checkAndHandleGameEnd(this);

    const timer = this.turnManager.currentTurnTimer;
    if (timer) UIManager.updateTimer(this, (timer.delay - timer.elapsed) / 1000);

    const weaponConfig = Config.WEAPON_CONFIGS[this.turnManager.getCurrentWeapon()];
    this.players.forEach(player => {
      PlayerManager.updatePlayerPhysics(this, player);
      // Safety net: if any texture-based terrain has been registered (e.g. metal-coaster),
      // nudge the player out if they end up inside the solid area.
      if (this._textureCollision?.["metal-coaster"]) {
        TerrainManager.nudgePlayerOutOfTexture(this, player, "metal-coaster");
      }
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

    if (this.healthCrates?.length) {
      this.healthCrates = this.healthCrates.filter(crate => {
        let pickedUp = false;
        this.players.forEach((p, idx) => {
          if (pickedUp || !PlayerManager.isPlayerAlive(this, idx)) return;
          const dx = p.x - crate.x;
          const dy = p.y - crate.y;
          if (Math.hypot(dx, dy) < 25) {
            const heal = crate.healAmount || Config.HEALTH_CRATE_AMOUNT;
            p.maxHealth = (p.maxHealth || 100) + heal;
            p.health = (p.health || 0) + heal;
            crate.destroy();
            pickedUp = true;
          }
        });
        return !pickedUp;
      });
    }
  }

  spawnHealthCrate(amount = Config.HEALTH_CRATE_AMOUNT) {
    const x = Phaser.Math.Between(50, Config.GAME_WIDTH - 50);

    // Find the top-most terrain under this x (platforms + ground)
    let targetTop = Config.GAME_HEIGHT - 100;
    (this.currentMapPlatforms || []).forEach(p => {
      const top = p.y;
      if (x >= p.x && x <= p.x + p.width && top < targetTop) targetTop = top;
    });

    const crate = this.add.image(x, -40, "health-pack").setDepth(900);
    const maxWidth = 32;
    if (crate.width > maxWidth) crate.setScale(maxWidth / crate.width);
    crate.healAmount = amount;
    this.tweens.add({ targets: crate, y: targetTop - 20, duration: 800, ease: "Bounce.Out" });
    this.healthCrates.push(crate);
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
