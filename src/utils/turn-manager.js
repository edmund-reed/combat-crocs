// Turn management utilities for Combat Crocs

class TurnManager {
  constructor(scene) {
    Object.assign(this, {
      scene,
      currentPlayer: 0,
      currentTeamIndex: 0,
      currentTeamId: 0,
      playerIndices: [],
      currentTurnTimer: null,
      turnInProgress: false,
      weaponByTeam: {},
      weaponAmmo: {},
    });
    this.initializeWeaponAmmo();
  }

  // Initialize weapon ammo from weapon configurations
  initializeWeaponAmmo = () => {
    Object.keys(Config.WEAPON_CONFIGS).forEach(weaponKey => {
      this.weaponAmmo[weaponKey] = Config.WEAPON_CONFIGS[weaponKey].shotsPerTurn;
    });
  };

  initializeTeams = () => {
    const teams = GameStateManager.getTeams();
    this.playerIndices = new Array(teams.length).fill(0);
    teams.forEach(({ id }) => (this.weaponByTeam[id] = "BAZOOKA"));
  };

  startTurn = () => {
    this.currentTurnTimer?.destroy();
    this.currentTurnTimer = null;
    this.currentPlayer = this.getNextPlayerIndex();

    console.log(`🎯 TURN: Player ${this.currentPlayer}, ${Config.TURN_TIME_LIMIT / 1000}s`);

    const currentPlayerObj = this.scene.players[this.currentPlayer];
    currentPlayerObj.canMove = currentPlayerObj.canShoot = true;

    this.scene.players.forEach((player, index) => {
      if (index !== this.currentPlayer) player.canMove = player.canShoot = false;
    });

    Object.keys(this.weaponAmmo).forEach(key => {
      this.weaponAmmo[key] = Config.WEAPON_CONFIGS[key]?.shotsPerTurn || 1;
    });

    this.weaponLocked = false;
    this.currentTurnTimer = this.scene.time.delayedCall(Config.TURN_TIME_LIMIT, () => this.handleTurnTimeout());

    UIManager.updateTurnIndicator(this.scene, currentPlayerObj);
    UIManager.updatePlayerHighlighting(this.scene, this.currentPlayer);
    UIManager.updateWeaponDisplay(this.scene);
    UIManager.clearAimLine(this.scene);
  };

  // Handle automatic turn timeout (called by Phaser delayedCall)
  handleTurnTimeout = () => {
    if (!this.turnInProgress) {
      console.log("⏰ TIMEOUT → next turn");
      this.currentTurnTimer = null;
      this.startTurn();
    }
  };

  // Find the next living player within a specific team using round-robin
  findNextLivingPlayerInTeam = team => {
    const teamIndex = GameStateManager.getTeams().findIndex(t => t.id === team.id);

    for (let offset = 0; offset < team.crocCount; offset++) {
      const playerNum = ((this.playerIndices[teamIndex] + offset) % team.crocCount) + 1;
      const playerIndex = PlayerManager.getPlayerIndexById(this.scene, `${team.id}${playerNum}`);

      if (PlayerManager.isPlayerAlive(this.scene, playerIndex)) {
        this.playerIndices[teamIndex] = (this.playerIndices[teamIndex] + offset + 1) % team.crocCount;
        return playerIndex;
      }
    }

    return -1;
  };

  // Advance to the next team in round-robin fashion
  advanceToNextTeam = () => {
    this.currentTeamIndex = (this.currentTeamIndex + 1) % GameStateManager.getTeams().length;
  };

  // Get the next player index using round-robin team and player selection
  getNextPlayerIndex = () => {
    const teams = GameStateManager.getTeams();

    for (let attempts = 0; attempts < teams.length; attempts++) {
      const playerIndex = this.findNextLivingPlayerInTeam(teams[this.currentTeamIndex]);

      if (playerIndex >= 0) {
        this.currentTeamId = teams[this.currentTeamIndex].id;
        this.advanceToNextTeam();
        return playerIndex;
      }

      this.advanceToNextTeam();
    }

    console.warn("No living players found");
    return 0;
  };

  endCurrentTurn = () => {
    console.log("Projectile turn ended, resetting turnInProgress");
    this.turnInProgress = false;
    return true;
  };

  getCurrentPlayerIndex = () => this.currentPlayer;
  getCurrentTeam = () => this.currentTeamId || 0;
  isTurnInProgress = () => this.turnInProgress;
  getCurrentWeapon = () => this.weaponByTeam[this.getCurrentTeam()] || "BAZOOKA";

  // Delegated from UIManager for better separation
  static updateWeaponDisplay = scene => {
    const { turnManager: tm } = scene;
    scene.weaponText?.setText(`Weapon: ${tm.getCurrentWeapon()}`);
  };

  setCurrentWeapon = weaponType => {
    if (Config.WEAPON_CONFIGS[weaponType]) {
      this.weaponByTeam[this.getCurrentTeam()] = weaponType;
      console.log(`Team ${this.getCurrentTeam()} → ${weaponType}`);
    }
  };

  // Generic timer explosion handler (used by grenades and other timer-based weapons)
  detonateTimerExplosion = (scene, projectileBody) => {
    ExplosionSystem.createExplosion(
      scene,
      projectileBody.position.x,
      projectileBody.position.y,
      projectileBody.projectileOwner,
      projectileBody.weaponType || "UNKNOWN",
    );

    projectileBody.timerId && clearTimeout(projectileBody.timerId);
    scene.endProjectileTurn();
  };
}

window.TurnManager = TurnManager;
