import { Config, Logger } from "@config";
import { StateManager, PlayerManager, InputManager } from "@utils";
import { UIManager } from "@ui";
import { WeaponSpriteManager } from "@weapons";

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
      weaponAmmo: this.constructor.freshAmmo(),
      turnCount: 0,
      teamTurnCounters: {},
    });
  }

  static freshAmmo = () =>
    Object.fromEntries(Object.entries(Config.WEAPON_CONFIGS).map(([k, v]) => [k, v.shotsPerTurn]));

  initializeTeams = () => {
    const teams = StateManager.getTeams();
    this.playerIndices = new Array(teams.length).fill(0);
    teams.forEach(({ id }) => (this.weaponByTeam[id] = "BAZOOKA"));
  };

  startTurn = () => {
    this.currentTurnTimer?.destroy();
    this.turnCount++;
    Object.assign(this.scene, { hasAttackedThisTurn: false, canReviveThisTurn: true });
    this.currentPlayer = this.getNextPlayerIndex();

    if (Math.random() < (Config.HEALTH_CRATE_CHANCE || 0)) this.scene.spawnHealthCrate?.();

    const teamId = this.getCurrentTeam();
    this.teamTurnCounters[teamId] = (this.teamTurnCounters[teamId] || 0) + 1;
    Logger.gameEvent(
      `TURN: Player ${this.currentPlayer}, Team ${teamId} Turn #${this.teamTurnCounters[teamId]}`,
    );

    this.scene.players.forEach((p, i) =>
      (i === this.currentPlayer ? PlayerManager.activateForTurn : PlayerManager.resetForTurn)(p),
    );

    this.weaponAmmo = TurnManager.freshAmmo();
    this.weaponLocked = false;

    this.currentTurnTimer = this.scene.time.delayedCall(Config.TURN_TIME_LIMIT, () => {
      if (this.turnInProgress) return;
      Logger.gameEvent("TIMEOUT → next turn");
      this.currentTurnTimer = null;
      this.startTurn();
    });

    UIManager.updateTurnIndicator(this.scene, this.scene.players[this.currentPlayer]);
    UIManager.updatePlayerHighlighting(this.scene, this.currentPlayer);
    UIManager.updateWeaponDisplay(this.scene);
    InputManager.clearAimIndicator(this.scene);
    WeaponSpriteManager.updateWeaponSpritesForTurn(this.scene, this.getCurrentWeapon(), this.currentPlayer);
  };

  findNextLivingPlayerInTeam = (team, teamIndex) => {
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
    for (let i = 0; i < teams.length; i++) {
      const idx = (this.currentTeamIndex + i) % teams.length;
      const playerIndex = this.findNextLivingPlayerInTeam(teams[idx], idx);
      if (playerIndex >= 0) {
        this.currentTeamId = teams[idx].id;
        this.currentTeamIndex = (idx + 1) % teams.length;
        return playerIndex;
      }
    }
    Logger.warn("No living players found");
    return 0;
  };

  endCurrentTurn = () => ((Logger.gameEvent("Projectile turn ended"), (this.turnInProgress = false)), true);

  markPlayerAttacked = player => {
    Object.assign(this.scene, { hasAttackedThisTurn: true, canReviveThisTurn: false });
    if (player) player.canMove = false;
  };

  getCurrentPlayerIndex = () => this.currentPlayer;
  getCurrentTeam = () => this.currentTeamId ?? 0;
  isTurnInProgress = () => this.turnInProgress;
  getCurrentWeapon = () => this.weaponByTeam[this.getCurrentTeam()] ?? "BAZOOKA";

  setCurrentWeapon = weaponType => {
    if (!Config.WEAPON_CONFIGS[weaponType]) return;
    this.weaponByTeam[this.getCurrentTeam()] = weaponType;
    Logger.weaponEvent(`Team ${this.getCurrentTeam()} → ${weaponType}`);
  };
}

export default TurnManager;
