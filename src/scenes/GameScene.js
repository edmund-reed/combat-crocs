import { Config } from "@config";
import {
  TurnManager,
  TerrainManager,
  PlayerManager,
  PhysicsManager,
  InputManager,
  StateManager,
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
      gameStarted: false,
      terrain: null,
      aimLine: null,
      currentMapPlatforms: [],
      turnManager: new TurnManager(this),
      hasAttackedThisTurn: false, // Track if current player has attacked
      canReviveThisTurn: true, // Track if player can still revive teammates
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
      WeaponSpriteManager.updateWeaponSprite(
        player,
        Config.WEAPON_CONFIGS[this.turnManager.getCurrentWeapon()],
        player.aimAngle,
      );

      // Apply Last Stand pulsating effect
      if (player.inLastStand) {
        const { PULSE_BASE_ALPHA, PULSE_FREQUENCY } = Config.LAST_STAND;
        player.graphics.setAlpha(
          PULSE_BASE_ALPHA + Math.sin(Date.now() / PULSE_FREQUENCY) * PULSE_BASE_ALPHA,
        );
      } else if (player.health > 0) {
        player.graphics.setAlpha(1.0);
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

      // Check for Last Stand revival (R key) - Only if player can still revive this turn
      const rKey = this.input.keyboard.addKey("R");
      if (Phaser.Input.Keyboard.JustDown(rKey) && this.canReviveThisTurn) {
        const teammates = this.players.filter(p => p.teamId === currentPlayer.teamId && p.inLastStand);
        teammates.forEach(teammate => {
          const distance = Phaser.Math.Distance.Between(
            currentPlayer.x,
            currentPlayer.y,
            teammate.x,
            teammate.y,
          );
          if (distance <= Config.LAST_STAND.REVIVAL_RANGE) {
            teammate.health = (teammate.maxHealth || 100) * (teammate.ability?.reviveHealthPercent || 0.25);
            teammate.inLastStand = false;
            teammate.lastStandTeamTurn = undefined; // Clear Last Stand tracking to prevent re-expiry
            teammate.graphics.setAlpha(1.0);
            console.log(
              `💚 Player ${currentPlayer.id} revived ${teammate.id}! (Health: ${teammate.health.toFixed(1)})`,
            );
            this.turnManager.turnInProgress = false;
            this.turnManager.startTurn();
          }
        });
      } else if (Phaser.Input.Keyboard.JustDown(rKey) && !this.canReviveThisTurn) {
        // Feedback when trying to revive after attacking
        console.log("🚫 Cannot revive - you've already attacked this turn!");
      }
    }

    if (currentPlayer.canShoot) {
      const cursors = InputManager.getCursors(this);
      if (cursors.up.isDown) currentPlayer.aimAngle -= 0.026;
      if (cursors.down.isDown) currentPlayer.aimAngle += 0.026;

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
    this.time.addEvent({ delay: 500, callback: () => this.turnManager.startTurn() });
  }
}

export default GameScene;
