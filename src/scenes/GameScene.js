import { Config } from "@config";
import { TurnManager, TerrainManager, PlayerManager, PhysicsManager, InputManager, StateManager } from "@utils";
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
    // Load player sprites from new location
    this.load.image("croc-1", "src/assets/players/croc-1.png");
    this.load.image("croc-2", "src/assets/players/croc-2.png");
    this.load.image("chameleon-1", "src/assets/players/chameleon-1.png");
    this.load.image("gecko-1", "src/assets/players/gecko-1.png");

    // Load weapon sprites
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

      // Update held weapon position, rotation, and visibility
      if (player.weaponSprite) {
        // Rotate launcher weapons (bazooka, shotgun) to match aim angle
        const currentWeapon = this.turnManager.getCurrentWeapon();
        const weaponConfig = Config.WEAPON_CONFIGS[currentWeapon];

        if (weaponConfig?.hasHeldSprite && !weaponConfig.projectileUsesHeldSprite) {
          // For launcher weapons, flip sprite vertically when facing left
          player.weaponSprite.setFlipX(false);
          player.weaponSprite.setFlipY(player.facingLeft);

          // Position weapon slightly offset from player center along aim direction
          const offsetDistance = 12; // Pixels to move weapon away from croc
          const offsetX = Math.cos(player.aimAngle) * offsetDistance;
          const offsetY = Math.sin(player.aimAngle) * offsetDistance;
          player.weaponSprite.setPosition(player.x + offsetX, player.y + offsetY);

          // Set origin so grip/handle is at rotation point (player center)
          // This makes weapon rotate along the aim line
          player.weaponSprite.setOrigin(0.2, 0.5);

          // Use aim angle directly for both directions
          player.weaponSprite.setRotation(player.aimAngle);
        } else {
          // For thrown weapons (grenade), use sprite flip
          player.weaponSprite.setFlipX(player.facingLeft);
          player.weaponSprite.setFlipY(false);
          player.weaponSprite.setOrigin(0.5, 0.5);
          player.weaponSprite.setPosition(player.x + (player.facingLeft ? -24 : 24), player.y - 10);
          player.weaponSprite.setRotation(0);
        }
      }
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
      // Keyboard aiming controls
      const cursors = InputManager.getCursors(this);
      if (cursors.up.isDown) {
        currentPlayer.aimAngle -= 0.026; // Rotate counterclockwise (180° in 2 seconds)
      }
      if (cursors.down.isDown) {
        currentPlayer.aimAngle += 0.026; // Rotate clockwise
      }

      // Auto-flip player direction based on aim angle (only when NOT moving)
      const isMoving = cursors.left.isDown || cursors.right.isDown;
      if (!isMoving) {
        const aimTargetX = currentPlayer.x + Math.cos(currentPlayer.aimAngle) * 100;
        if (aimTargetX < currentPlayer.x && !currentPlayer.facingLeft) {
          currentPlayer.facingLeft = true;
          currentPlayer.graphics.setFlipX(true);
        } else if (aimTargetX >= currentPlayer.x && currentPlayer.facingLeft) {
          currentPlayer.facingLeft = false;
          currentPlayer.graphics.setFlipX(false);
        }
      }

      UIManager.updateAimLine(this);
    } else {
      UIManager.clearAimLine(this);
    }

    this.matter.world.getAllBodies().forEach(body => {
      if (body.projectileGraphics && !body.destroyed) {
        body.projectileGraphics.setPosition(body.position.x, body.position.y);

        // Property-based rotation
        if (body.weaponConfig?.hasPhysicsRotation) {
          const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
          const rotationSpeed = speed * 0.01;
          body.projectileGraphics.rotation += rotationSpeed * (body.velocity.x < 0 ? -1 : 1);
        } else {
          body.projectileGraphics.setRotation(body.angle);
        }

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
