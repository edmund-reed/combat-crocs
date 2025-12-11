// Last Stand ability management for Combat Crocs

import { Config, Logger } from "@config";

export class LastStandManager {
  static #hasLivingTeammates(scene, player) {
    return scene.players.some(p => p.teamId === player.teamId && p.id !== player.id && p.health > 0);
  }

  static #hasExpired(scene, player) {
    const currentCounter = scene.turnManager.teamTurnCounters[player.teamId] || 0;
    const requiredTurn = (player.lastStandTeamTurn ?? 0) + 1; // their next team turn
    const hasHadNextTurn = currentCounter >= requiredTurn;
    const isPlayersTeamTurnNow = scene.turnManager.currentTeamId === player.teamId;
    return hasHadNextTurn && !isPlayersTeamTurnNow;
  }

  static #getPulseAlpha = () => {
    const { PULSE_BASE_ALPHA, PULSE_FREQUENCY } = Config.LAST_STAND;
    return PULSE_BASE_ALPHA * (1 + Math.sin(Date.now() / PULSE_FREQUENCY));
  };

  // Entry point used by DamageManager to allow Last Stand to intercept lethal hits
  static tryEnterLastStand(scene, player, finalHealth) {
    if (
      finalHealth <= 0 &&
      player.ability?.reviveHealthPercent &&
      !player.lastStandUsed &&
      !player.inLastStand
    ) {
      Logger.gameEvent(`🩹 Last Stand condition met for Player ${player.id}`);
      this.#enterLastStand(scene, player);
      return true;
    }
    return false;
  }

  static handleRevivalInput(scene, currentPlayer, rKeyPressed) {
    if (!rKeyPressed || !scene.canReviveThisTurn) return false;

    const teammate = scene.players.find(
      p =>
        p.teamId === currentPlayer.teamId &&
        p.inLastStand &&
        Phaser.Math.Distance.Between(currentPlayer.x, currentPlayer.y, p.x, p.y) <=
          Config.LAST_STAND.REVIVAL_RANGE,
    );

    if (teammate) {
      Object.assign(teammate, {
        health: (teammate.maxHealth || 100) * (teammate.ability?.reviveHealthPercent || 0.25),
        inLastStand: false,
        lastStandTeamTurn: undefined,
      });
      teammate.graphics.setAlpha(1.0);
      return true;
    }
    return false;
  }

  static updateLastStandPlayers(scene) {
    scene.players.forEach(player => {
      if (player.inLastStand && player.lastStandTeamTurn !== undefined) {
        // If all teammates are dead, player dies immediately
        if (!this.#hasLivingTeammates(scene, player)) {
          Logger.gameEvent(`💀 Player ${player.id} Last Stand - all teammates dead, dying immediately`);
          Object.assign(player, { health: 0, inLastStand: false });
          player.graphics.setAlpha(0.3);
          return;
        }

        // Otherwise expire once their team's next turn has fully passed
        if (this.#hasExpired(scene, player)) {
          Object.assign(player, { health: 0, inLastStand: false });
          player.graphics.setAlpha(0.3);
          Logger.gameEvent(`💀 Player ${player.id} Last Stand expired - died`);
        } else {
          player.graphics.setAlpha(this.#getPulseAlpha());
        }
      } else if (player.health > 0) {
        player.graphics.setAlpha(1.0);
      }
    });
  }

  static #enterLastStand(scene, player) {
    // Only allow Last Stand if there is at least one living teammate
    if (this.#hasLivingTeammates(scene, player)) {
      // Record the team's current turn counter at the moment of entry.
      // We'll expire Last Stand based on how many full team turns have
      // occurred since this value.
      const recordedTurn = scene.turnManager.teamTurnCounters[player.teamId] || 0;
      Object.assign(player, {
        health: Config.LAST_STAND.MINIMAL_HEALTH,
        inLastStand: true,
        lastStandUsed: true,
        lastStandTeamTurn: recordedTurn,
      });
      Logger.gameEvent(
        `🩹 Player ${player.id} entered Last Stand, recorded turn: ${recordedTurn}, current counter: ${
          scene.turnManager.teamTurnCounters[player.teamId] || 0
        }`,
      );
    } else {
      player.health = 0;
    }
  }
}
