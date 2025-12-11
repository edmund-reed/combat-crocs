// Last Stand ability management for Combat Crocs

import { Config } from "@config";

export class LastStandManager {
  static #getPulseAlpha = () => {
    const { PULSE_BASE_ALPHA, PULSE_FREQUENCY } = Config.LAST_STAND;
    return PULSE_BASE_ALPHA * (1 + Math.sin(Date.now() / PULSE_FREQUENCY));
  };

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
        const expired =
          (scene.turnManager.teamTurnCounters[player.teamId] || 0) >= player.lastStandTeamTurn + 1;
        if (expired) {
          Object.assign(player, { health: 0, inLastStand: false });
          player.graphics.setAlpha(0.3);
        } else {
          player.graphics.setAlpha(this.#getPulseAlpha());
        }
      } else if (player.health > 0) {
        player.graphics.setAlpha(1.0);
      }
    });
  }

  static handleDamage(scene, player, damage) {
    const finalHealth = player.health - damage;

    if (
      finalHealth <= 0 &&
      player.ability?.reviveHealthPercent &&
      !player.lastStandUsed &&
      !player.inLastStand
    ) {
      return this.#enterLastStand(scene, player);
    }

    player.health = Math.max(0, finalHealth);
  }

  static #enterLastStand(scene, player) {
    const hasLivingTeammates = scene.players.some(
      p => p.teamId === player.teamId && p.id !== player.id && p.health > 0 && !p.inLastStand,
    );

    if (hasLivingTeammates) {
      Object.assign(player, {
        health: Config.LAST_STAND.MINIMAL_HEALTH,
        inLastStand: true,
        lastStandUsed: true,
        lastStandTeamTurn: scene.turnManager.teamTurnCounters[player.teamId] || 0,
      });
    } else {
      player.health = 0;
    }
  }
}
