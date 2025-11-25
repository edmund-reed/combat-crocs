// Turn management utilities for Combat Crocs

class TurnManager {
  constructor(scene) {
    this.scene = scene;
    this.currentPlayer = 0;
    this.currentTeamIndex = 0; // Index in teams array
    this.currentTeamId = 0; // ID of currently playing team
    this.playerIndices = []; // Which player in each team plays next
    this.currentTurnTimer = null; // Phaser delayedCall timer
    this.turnInProgress = false; // Prevents next player from moving
    this.weaponByTeam = {}; // Separate weapon selections per team

    // Weapon ammo system - now dynamic based on definitions
    this.weaponAmmo = {};
    this.initializeWeaponAmmo();
  }

  // Initialize weapon ammo from weapon configurations
  initializeWeaponAmmo() {
    Object.keys(Config.WEAPON_CONFIGS).forEach(weaponKey => {
      this.weaponAmmo[weaponKey] = Config.WEAPON_CONFIGS[weaponKey].shotsPerTurn;
    });
  }

  // Initialize based on current teams
  initializeTeams() {
    const teams = GameStateManager.getTeams();
    this.playerIndices = new Array(teams.length).fill(0);
    teams.forEach(team => {
      this.weaponByTeam[team.id] = "BAZOOKA"; // Default weapon for new teams
    });
  }

  startTurn() {
    // Cancel any existing turn timer
    if (this.currentTurnTimer) {
      this.currentTurnTimer.destroy();
      this.currentTurnTimer = null;
    }

    this.currentPlayer = this.getNextPlayerIndex();
    console.log(`🎯 STARTING TURN: Player ${this.currentPlayer}, ${Config.TURN_TIME_LIMIT / 1000}s timer active`);

    // Reset states for the new current player
    const currentPlayerObj = this.scene.players[this.currentPlayer];
    currentPlayerObj.canMove = true;
    currentPlayerObj.canShoot = true; // ✅ Explicit reset

    // Ensure ALL players except current are locked
    this.scene.players.forEach((player, index) => {
      if (index !== this.currentPlayer) {
        player.canMove = false;
        player.canShoot = false;
      }
    });

    // Reset weapon ammo for the new turn
    Object.keys(this.weaponAmmo).forEach(weaponKey => {
      this.weaponAmmo[weaponKey] = Config.WEAPON_CONFIGS[weaponKey]?.shotsPerTurn || 1;
    });

    // Unlock weapon selection for new turn
    this.weaponLocked = false;
    console.log(`🔄 Ammo reloaded and weapons unlocked for new turn`);

    // Start Phaser delayedCall timer (frame-rate independent)
    this.currentTurnTimer = this.scene.time.delayedCall(
      Config.TURN_TIME_LIMIT,
      () => this.handleTurnTimeout(),
      [],
      this,
    );

    // Delegate UI updates to UIManager
    UIManager.updateTurnIndicator(this.scene, currentPlayerObj);
    UIManager.updatePlayerHighlighting(this.scene, this.currentPlayer);
    UIManager.updateWeaponDisplay(this.scene); // Update weapon display for new team

    UIManager.clearAimLine(this.scene);
  }

  // Handle automatic turn timeout (called by Phaser delayedCall)
  handleTurnTimeout() {
    if (!this.turnInProgress) {
      console.log(`⏰ TURN TIMEOUT: ${Config.TURN_TIME_LIMIT / 1000}s expired, starting next turn`);
      this.currentTurnTimer = null; // Clear reference
      this.startTurn(); // Start next player's turn
    }
  }

  getNextPlayerIndex() {
    const teams = GameStateManager.getTeams();
    const maxAttempts = this.scene.players.length;

    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      const currentTeam = teams[this.currentTeamIndex];

      // Find next living player in current team
      for (let playerOffset = 0; playerOffset < currentTeam.crocCount; playerOffset++) {
        const playerNum = ((this.playerIndices[this.currentTeamIndex] + playerOffset) % currentTeam.crocCount) + 1;
        const targetPlayerId = `${currentTeam.id}${playerNum}`;
        const playerIndex = this.scene.players.findIndex(player => player.id === targetPlayerId);

        if (playerIndex >= 0 && this.scene.players[playerIndex].health > 0) {
          // Found living player - set current team and update indices
          this.currentTeamId = currentTeam.id;
          this.playerIndices[this.currentTeamIndex] =
            (this.playerIndices[this.currentTeamIndex] + playerOffset + 1) % currentTeam.crocCount;
          this.currentTeamIndex = (this.currentTeamIndex + 1) % teams.length;
          return playerIndex;
        }
      }

      // No living players left in this team, advance to next team
      this.currentTeamIndex = (this.currentTeamIndex + 1) % teams.length;
    }

    console.warn("No living players found");
    return 0;
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
    return this.currentTeamId || 0;
  }

  isTurnInProgress() {
    return this.turnInProgress;
  }

  getCurrentWeapon() {
    const currentTeamId = this.getCurrentTeam();
    return this.weaponByTeam[currentTeamId] || "BAZOOKA";
  }

  // Delegated from UIManager for better separation
  static updateWeaponDisplay(scene) {
    const { turnManager: tm } = scene;
    scene.weaponText?.setText(`Weapon: ${Config.WEAPON_TYPES[tm.getCurrentWeapon()].name}`);
  }

  setCurrentWeapon(weaponType) {
    if (Config.WEAPON_TYPES[weaponType]) {
      const currentTeamId = this.getCurrentTeam();
      this.weaponByTeam[currentTeamId] = weaponType;
      console.log(`Team ${currentTeamId} weapon switched to: ${weaponType}`);
    }
  }

  // Generic timer explosion handler (used by grenades and other timer-based weapons)
  detonateTimerExplosion(scene, projectileBody) {
    ExplosionSystem.createExplosion(
      scene,
      projectileBody.position.x,
      projectileBody.position.y,
      projectileBody.projectileOwner,
      projectileBody.weaponType || "UNKNOWN",
    );

    // Cleanup - weapon-specific colliding body removal is handled by caller
    if (projectileBody.timerId) {
      clearTimeout(projectileBody.timerId);
    }

    scene.endProjectileTurn();
  }
}

window.TurnManager = TurnManager;
