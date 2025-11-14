/**
 * InputManager.js - Centralized input handling system
 * Manages keyboard, mouse, and game input coordination
 * Separated by GAME CONCERNS: Player interaction, aiming, control flow
 */

class InputManager {
  static instance = null;

  constructor(scene) {
    this.scene = scene;
    this.cursors = null;
    this.spaceKey = null;
    this.isInitialized = false;
  }

  static getInstance(scene) {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager(scene);
    }
    return InputManager.instance;
  }

  /**
   * Initialize keyboard controls
   */
  setupKeyboardControls() {
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.spaceKey = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
  }

  /**
   * Initialize mouse controls
   */
  setupMouseControls() {
    // Mouse aiming (delegates to handleAiming method)
    this.scene.input.on("pointermove", (pointer) => {
      this.handleAiming(pointer);
    });

    // Mouse shooting (delegates to handleShooting method via scene)
    this.scene.input.on("pointerdown", (pointer) => {
      this.handleShooting(pointer);
    });
  }

  /**
   * Setup turn change handlers
   */
  setupTurnChangeHandlers() {
    // Update aim line when turn changes to player's turn
    this.scene.events.on("turnChange", () => {
      // Update aiming line immediately when it's the player's turn
      this.updateAimLine();
    });
  }

  /**
   * Initialize all input systems
   */
  initialize() {
    if (this.isInitialized) return;

    this.setupKeyboardControls();
    this.setupMouseControls();
    this.setupTurnChangeHandlers();

    this.isInitialized = true;
  }

  /**
   * Handle mouse aiming input
   */
  handleAiming(pointer) {
    const turnManager = TurnManager.getInstance(this.scene);
    const currentPlayer = turnManager.getCurrentPlayer();

    if (!currentPlayer || !currentPlayer.canShoot) return;

    const angle = Phaser.Math.Angle.Between(
      currentPlayer.x,
      currentPlayer.y,
      pointer.worldX,
      pointer.worldY
    );
    currentPlayer.aimAngle = angle;

    this.updateAimLine();
  }

  /**
   * Handle mouse shooting input
   */
  handleShooting(pointer) {
    const turnManager = TurnManager.getInstance(this.scene);
    const currentPlayer = turnManager.getCurrentPlayer();

    if (!currentPlayer.canShoot || turnManager.isTurnInProgress()) return;

    // Clear aim line when shooting
    this.clearAimLine();

    // Lock player and launch projectile
    turnManager.lockPlayerForProjectile();
    WeaponManager.createProjectile(
      this.scene,
      currentPlayer,
      pointer.worldX,
      pointer.worldY
    );
  }

  /**
   * Update aiming line visualization
   */
  updateAimLine() {
    const turnManager = TurnManager.getInstance(this.scene);
    const currentPlayer = turnManager.getCurrentPlayer();

    this.clearAimLine();

    if (!currentPlayer.canShoot) return;

    const mouse = this.scene.input.activePointer;
    const angle = Phaser.Math.Angle.Between(
      currentPlayer.x,
      currentPlayer.y,
      mouse.worldX,
      mouse.worldY
    );

    // Create aiming line visualization
    this.scene.aimLine = this.scene.add.graphics();
    this.scene.aimLine.lineStyle(4, 0xffd23f); // Thick yellow line
    this.scene.aimLine.moveTo(currentPlayer.x, currentPlayer.y);

    // Arrow visualization
    const lineLength = Math.max(
      150,
      300 - Math.abs(currentPlayer.body.velocity.y) * 5
    );
    const endX = currentPlayer.x + Math.cos(angle) * lineLength;
    const endY = currentPlayer.y + Math.sin(angle) * lineLength;

    this.scene.aimLine.lineTo(endX, endY);
    this.scene.aimLine.strokePath();

    // Add arrowhead
    this.addArrowhead(endX, endY, angle);
  }

  /**
   * Add arrowhead to aiming line
   */
  addArrowhead(endX, endY, angle) {
    const arrowSize = 12;
    this.scene.aimLine.moveTo(endX, endY);
    this.scene.aimLine.lineTo(
      endX - Math.cos(angle - Math.PI / 6) * arrowSize,
      endY - Math.sin(angle - Math.PI / 6) * arrowSize
    );
    this.scene.aimLine.moveTo(endX, endY);
    this.scene.aimLine.lineTo(
      endX - Math.cos(angle + Math.PI / 6) * arrowSize,
      endY - Math.sin(angle + Math.PI / 6) * arrowSize
    );
    this.scene.aimLine.strokePath();
  }

  /**
   * Clear aiming line graphics
   */
  clearAimLine() {
    if (this.scene.aimLine) {
      this.scene.aimLine.destroy();
      this.scene.aimLine = null;
    }
  }

  /**
   * Get keyboard cursors for external use
   */
  getCursors() {
    return this.cursors;
  }

  /**
   * Get space key for external use
   */
  getSpaceKey() {
    return this.spaceKey;
  }

  /**
   * Cleanup input handlers
   */
  destroy() {
    if (this.scene.aimLine) {
      this.scene.aimLine.destroy();
      this.scene.aimLine = null;
    }

    // Remove event listeners
    this.scene.input.off("pointermove");
    this.scene.input.off("pointerdown");
    this.scene.events.off("turnChange");
  }
}

window.InputManager = InputManager;
