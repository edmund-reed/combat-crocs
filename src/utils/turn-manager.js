import { Config } from "@config";
import { GameStateManager, Logger, PlayerManager } from "@utils";
import { UIManager } from "@ui";
import { ExplosionSystem } from "@weapons";

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
      weaponAmmo: Object.fromEntries(Object.entries(Config.WEAPON_CONFIGS).map(([k, v]) => [k, v.shotsPerTurn])),
    });
  }

  initializeTeams = () => {
    const teams = GameStateManager.getTeams();
    this.playerIndices = new Array(teams.length).fill(0);
    teams.forEach(({ id }) => (this.weaponByTeam[id] = "BAZOOKA"));
  };

  startTurn = () => {
    this.currentTurnTimer?.destroy();
    this.currentPlayer = this.getNextPlayerIndex();
    Logger.gameEvent(`TURN: Player ${this.currentPlayer}, ${Config.TURN_TIME_LIMIT / 1000}s`);

    const currentPlayerObj = this.scene.players[this.currentPlayer];
    currentPlayerObj.canMove = currentPlayerObj.canShoot = true;
    this.scene.players.forEach((p, i) => i !== this.currentPlayer && (p.canMove = p.canShoot = false));

    Object.keys(this.weaponAmmo).forEach(key => (this.weaponAmmo[key] = Config.WEAPON_CONFIGS[key]?.shotsPerTurn || 1));

    this.weaponLocked = false;
    this.currentTurnTimer = this.scene.time.delayedCall(Config.TURN_TIME_LIMIT, () => {
      if (!this.turnInProgress) {
        Logger.gameEvent("TIMEOUT → next turn");
        this.currentTurnTimer = null;
        this.startTurn();
      }
    });

    UIManager.updateTurnIndicator(this.scene, currentPlayerObj);
    UIManager.updatePlayerHighlighting(this.scene, this.currentPlayer);
    UIManager.updateWeaponDisplay(this.scene);
    UIManager.clearAimLine(this.scene);
  };

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

  getNextPlayerIndex = () => {
    const teams = GameStateManager.getTeams();

    for (let attempts = 0; attempts < teams.length; attempts++) {
      const playerIndex = this.findNextLivingPlayerInTeam(teams[this.currentTeamIndex]);

      if (playerIndex >= 0) {
        this.currentTeamId = teams[this.currentTeamIndex].id;
        this.currentTeamIndex = (this.currentTeamIndex + 1) % teams.length;
        return playerIndex;
      }

      this.currentTeamIndex = (this.currentTeamIndex + 1) % teams.length;
    }

    Logger.warn("No living players found");
    return 0;
  };

  endCurrentTurn = () => (Logger.gameEvent("Projectile turn ended"), (this.turnInProgress = false), true);

  getCurrentPlayerIndex = () => this.currentPlayer;
  getCurrentTeam = () => this.currentTeamId || 0;
  isTurnInProgress = () => this.turnInProgress;
  getCurrentWeapon = () => this.weaponByTeam[this.getCurrentTeam()] || "BAZOOKA";

  static updateWeaponDisplay = scene => {
    scene.weaponText?.setText(`Weapon: ${scene.turnManager.getCurrentWeapon()}`);
  };

  setCurrentWeapon = weaponType => {
    if (Config.WEAPON_CONFIGS[weaponType]) {
      this.weaponByTeam[this.getCurrentTeam()] = weaponType;
      Logger.weaponEvent(`Team ${this.getCurrentTeam()} → ${weaponType}`);
    }
  };

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

export default TurnManager;
