/**
 * TurnManager.js - Manages turn-based gameplay logic
 * Handles player turns, timers, turn transitions, and game flow
 */

class TurnManager {
  static instance = null;

  constructor(scene) {
    this.scene = scene;
    this.currentPlayer = 0;
    this.turnTimer = 0;
    this.turnInProgress = false;
    this.gameStarted = false;

    console.log("🎲 TurnManager initialized - managing turn-based gameplay");
  }

  static getInstance(scene) {
    if (!TurnManager.instance) {
      TurnManager.instance = new TurnManager(scene);
    }
    return TurnManager.instance;
  }

  // Start a new turn for the next player
  startTurn() {
    // Log position before starting turn
    this.scene.players.forEach((player) => {
      console.log(
        `Player ${player.id} position before turn: (${player.x}, ${player.y})`
      );
    });

    // Advance to next player
    this.currentPlayer = (this.currentPlayer + 1) % this.scene.players.length;
    this.turnTimer = Config.TURN_TIME_LIMIT / 1000;

    // Set player state for their turn
    const currentPlayerObj = this.scene.players[this.currentPlayer];
    currentPlayerObj.canMove = true;
    currentPlayerObj.canShoot = true;

    // Update UI to show whose turn it is
    this.updateTurnIndicator();

    // Highlight current player visually
    this.updatePlayerHighlighting();

    // Clear aim line at start of turn
    this.clearAimLine();

    // Log position after starting turn
    console.log(
      `Starting turn for Player ${currentPlayerObj.id} at position: (${currentPlayerObj.x}, ${currentPlayerObj.y})`
    );
  }

  // Called when projectile finishes (explosion or timeout)
  endProjectileTurn() {
    console.log("Projectile turn ended, resetting turnInProgress to false");
    this.turnInProgress = false;

    // Small delay before starting next turn (for explosion effect)
    this.scene.time.addEvent({
      delay: 500, // 0.5 seconds
      callback: () => {
        console.log("Starting next turn from endProjectileTurn");
        this.startTurn();
      },
    });
  }

  // Update turn indicator text and color
  updateTurnIndicator() {
    const currentPlayerObj = this.scene.players[this.currentPlayer];

    try {
      // Update the turn indicator UI
      UIManager.updateTurnIndicator(this.scene, this.currentPlayer);
    } catch (error) {
      console.warn("⚠️ UIManager not available for turn indicator update");
    }
  }

  // Highlight the current player and dim others
  updatePlayerHighlighting() {
    this.scene.players.forEach((player, index) => {
      player.graphics.setAlpha(index === this.currentPlayer ? 1.0 : 0.5);
    });
  }

  // Lock player's movement while projectile is in flight
  lockPlayerForProjectile() {
    const player = this.scene.players[this.currentPlayer];
    player.canShoot = false;
    player.canMove = false; // Lock movement during projectile flight
    this.turnInProgress = true;
    this.clearAimLine();
  }

  // Unlock player after turn is complete
  unlockPlayer() {
    const player = this.scene.players[this.currentPlayer];
    player.canMove = false; // Movement stays locked until next turn starts
    player.canShoot = false;
  }

  // Update the turn timer each frame
  updateTimer(delta) {
    if (!this.gameStarted) {
      this.gameStarted = true;
    }

    this.turnTimer = Math.max(0, this.turnTimer - delta / 1000);

    // End turn if timer runs out and player hasn't started shooting yet
    if (this.turnTimer <= 0 && !this.turnInProgress) {
      console.log("Turn timer expired, starting next turn");
      this.startTurn();
    }

    // Update timer display
    try {
      UIManager.updateTimer(this.scene, this.turnTimer);
    } catch (error) {
      console.warn("⚠️ UIManager not available for timer update");
    }
  }

  // Get current player index
  getCurrentPlayerIndex() {
    return this.currentPlayer;
  }

  // Get current player object
  getCurrentPlayer() {
    return this.scene.players[this.currentPlayer];
  }

  // Check if it's currently a player's turn
  isPlayerTurn(playerId) {
    return this.scene.players[this.currentPlayer].id === playerId;
  }

  // Is there a turn currently in progress?
  isTurnInProgress() {
    return this.turnInProgress;
  }

  // Clear aiming line graphics
  clearAimLine() {
    if (this.scene.aimLine) {
      this.scene.aimLine.destroy();
      this.scene.aimLine = null;
    }
  }

  // Get remaining time for current turn
  getRemainingTime() {
    return this.turnTimer;
  }

  // Force end current turn (for debugging or special cases)
  forceEndTurn() {
    console.log("Force ending current turn");
    this.unlockPlayer();
    this.endProjectileTurn();
  }
}

window.TurnManager = TurnManager;
