import { Config } from "@config";
import { StateManager, Logger, PlayerManager } from "@utils";
import { UIManager } from "@ui";
import { WeaponSpriteManager } from "@weapons";
import { LastStandManager } from "./last-stand-manager.js";

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
      weaponAmmo: Object.fromEntries(
        Object.entries(Config.WEAPON_CONFIGS).map(([k, v]) => [k, v.shotsPerTurn]),
      ),
      turnCount: 0,
      teamTurnCounters: {},
    });
  }

  initializeTeams = () => {
    const teams = StateManager.getTeams();
    this.playerIndices = new Array(teams.length).fill(0);
    teams.forEach(({ id }) => (this.weaponByTeam[id] = "BAZOOKA"));
  };

  startTurn = () => {
    this.currentTurnTimer?.destroy();
    this.turnCount++;

    this.scene.hasAttackedThisTurn = false;
    this.scene.canReviveThisTurn = true;

    this.currentPlayer = this.getNextPlayerIndex();
    const currentTeamId = this.getCurrentTeam();

    this.teamTurnCounters[currentTeamId] = (this.teamTurnCounters[currentTeamId] || 0) + 1;

    Logger.gameEvent(
      `TURN: Player ${this.currentPlayer}, Team ${currentTeamId} Turn #${this.teamTurnCounters[currentTeamId]}`,
    );

    const currentPlayerObj = this.scene.players[this.currentPlayer];
    this.scene.players.forEach((p, i) =>
      i === this.currentPlayer ? PlayerManager.activateForTurn(p) : PlayerManager.resetForTurn(p),
    );

    this.weaponAmmo = Object.fromEntries(
      Object.entries(Config.WEAPON_CONFIGS).map(([k, v]) => [k, v.shotsPerTurn]),
    );

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
    WeaponSpriteManager.updateWeaponSpritesForTurn(this.scene, this.getCurrentWeapon(), this.currentPlayer);
  };

  findNextLivingPlayerInTeam = team => {
    const teams = StateManager.getTeams();
    const teamIndex = teams.findIndex(t => t.id === team.id);

    for (let offset = 0; offset < team.crocCount; offset++) {
      const playerNum = ((this.playerIndices[teamIndex] + offset) % team.crocCount) + 1;
      const playerIndex = PlayerManager.getPlayerIndexById(this.scene, `${team.id}${playerNum}`);
      const player = this.scene.players[playerIndex];

      if (PlayerManager.isPlayerAlive(this.scene, playerIndex) && !player?.inLastStand) {
        this.playerIndices[teamIndex] = (this.playerIndices[teamIndex] + offset + 1) % team.crocCount;
        return playerIndex;
      }
    }
    return -1;
  };

  getNextPlayerIndex = () => {
    const teams = StateManager.getTeams();
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

  endCurrentTurn = () => {
    Logger.gameEvent("Projectile turn ended");
    this.turnInProgress = false;
    return true;
  };

  markPlayerAttacked = player => {
    Object.assign(this.scene, { hasAttackedThisTurn: true, canReviveThisTurn: false });
    if (player) player.canMove = false;
  };

  getCurrentPlayerIndex = () => this.currentPlayer;
  getCurrentTeam = () => this.currentTeamId ?? 0;
  isTurnInProgress = () => this.turnInProgress;
  getCurrentWeapon = () => this.weaponByTeam[this.getCurrentTeam()] ?? "BAZOOKA";

  setCurrentWeapon = weaponType => {
    if (Config.WEAPON_CONFIGS[weaponType]) {
      this.weaponByTeam[this.getCurrentTeam()] = weaponType;
      Logger.weaponEvent(`Team ${this.getCurrentTeam()} → ${weaponType}`);
    }
  };
}

export default TurnManager;
