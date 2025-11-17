// Turn management utilities for Combat Crocs

class TurnManager {
  constructor(scene) {
    this.scene = scene;
    this.currentPlayer = 0;
    this.currentTeam = "A"; // Current team whose turn it is
    this.teamAPlayerIndex = 0; // Which player in team A plays next
    this.teamBPlayerIndex = 0; // Which player in team B plays next
    this.turnTimer = 0;
    this.turnInProgress = false; // Prevents next player from moving
    this.weaponByTeam = {
      // Separate weapon selections per team
      A: "BAZOOKA",
      B: "BAZOOKA",
    };
  }

  startTurn() {
    this.currentPlayer = this.getNextPlayerIndex();
    this.turnTimer = Config.TURN_TIME_LIMIT / 1000;

    const currentPlayerObj = this.scene.players[this.currentPlayer];
    currentPlayerObj.canMove = true;
    currentPlayerObj.canShoot = true;

    // Delegate UI updates to UIManager
    UIManager.updateTurnIndicator(this.scene, currentPlayerObj);
    UIManager.updatePlayerHighlighting(this.scene, this.currentPlayer);
    UIManager.updateWeaponDisplay(this.scene); // Update weapon display for new team

    UIManager.clearAimLine(this.scene);
  }

  getNextPlayerIndex() {
    const teamACount = window.CombatCrocs.gameState.game.teamACount || 1;
    const teamBCount = window.CombatCrocs.gameState.game.teamBCount || 1;

    const maxAttempts = this.scene.players.length;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      const isTeamA = this.currentTeam === "A";
      const targetPlayerId = isTeamA ? `A${this.teamAPlayerIndex + 1}` : `B${this.teamBPlayerIndex + 1}`;

      const playerIndex = this.scene.players.findIndex(player => player.id === targetPlayerId);

      if (playerIndex >= 0 && this.scene.players[playerIndex].health > 0) {
        // Player is alive - switch to other team and advance player index
        this.currentTeam = isTeamA ? "B" : "A";
        if (isTeamA) {
          this.teamAPlayerIndex = (this.teamAPlayerIndex + 1) % teamACount;
        } else {
          this.teamBPlayerIndex = (this.teamBPlayerIndex + 1) % teamBCount;
        }
        return playerIndex;
      }

      // Advance to next player on current team (dead or not found)
      if (isTeamA) {
        this.teamAPlayerIndex = (this.teamAPlayerIndex + 1) % teamACount;
      } else {
        this.teamBPlayerIndex = (this.teamBPlayerIndex + 1) % teamBCount;
      }
    }

    console.warn("No living players found");
    return 0;
  }

  updateTurnTimer(delta) {
    this.turnTimer = Math.max(0, this.turnTimer - delta);
    return Math.ceil(this.turnTimer);
  }

  shouldEndTurn() {
    return this.turnTimer <= 0 && !this.turnInProgress;
  }

  endCurrentTurn() {
    // Reset turn state and flag for next turn
    console.log("Projectile turn ended, resetting turnInProgress to false");
    this.turnInProgress = false;
    return true; // Signal that turn should continue to next player
  }

  // Get current turn state for external access
  getCurrentPlayerIndex() {
    return this.currentPlayer;
  }

  getCurrentTeam() {
    return this.currentTeam;
  }

  isTurnInProgress() {
    return this.turnInProgress;
  }

  getCurrentWeapon() {
    return this.weaponByTeam[this.currentTeam];
  }

  // Delegated from UIManager for better separation
  static updateWeaponDisplay(scene) {
    const { turnManager: tm } = scene;
    scene.weaponText?.setText(`Weapon: ${Config.WEAPON_TYPES[tm.getCurrentWeapon()].name}`);
  }

  setCurrentWeapon(weaponType) {
    if (Config.WEAPON_TYPES[weaponType]) {
      this.weaponByTeam[this.currentTeam] = weaponType;
      console.log(`Team ${this.currentTeam} weapon switched to: ${weaponType}`);
    }
  }
}

window.TurnManager = TurnManager;
