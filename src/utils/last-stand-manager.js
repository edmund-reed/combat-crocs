// Last Stand ability management for Combat Crocs

import { Config } from "@config";

export class LastStandManager {
  static handleRevivalInput(scene, currentPlayer, rKeyPressed) {
    if (!rKeyPressed || !scene.canReviveThisTurn) {
      if (rKeyPressed && !scene.canReviveThisTurn) {
        console.log("🚫 Cannot revive - you've already attacked this turn!");
      }
      return false;
    }

    const teammates = scene.players.filter(p => p.teamId === currentPlayer.teamId && p.inLastStand);
    for (const teammate of teammates) {
      const distance = Phaser.Math.Distance.Between(currentPlayer.x, currentPlayer.y, teammate.x, teammate.y);
      if (distance <= Config.LAST_STAND.REVIVAL_RANGE) {
        teammate.health = (teammate.maxHealth || 100) * (teammate.ability?.reviveHealthPercent || 0.25);
        teammate.inLastStand = false;
        teammate.lastStandTeamTurn = undefined;
        teammate.graphics.setAlpha(1.0);
        console.log(
          `💚 Player ${currentPlayer.id} revived ${teammate.id}! (Health: ${teammate.health.toFixed(1)})`,
        );
        return true;
      }
    }
    return false;
  }

  static updateLastStandPlayers(scene) {
    scene.players.forEach(player => {
      if (player.inLastStand && player.lastStandTeamTurn !== undefined) {
        const playerTeamTurn = scene.turnManager.teamTurnCounters[player.teamId] || 0;
        if (playerTeamTurn >= player.lastStandTeamTurn + 1) {
          player.health = 0;
          player.inLastStand = false;
          player.graphics.setAlpha(0.3);
          console.log(
            `💀 Player ${player.id} died (Last Stand expired - no revival by team turn ${playerTeamTurn})`,
          );
        } else {
          // Update visual pulsing effect
          const { PULSE_BASE_ALPHA, PULSE_FREQUENCY } = Config.LAST_STAND;
          player.graphics.setAlpha(
            PULSE_BASE_ALPHA + Math.sin(Date.now() / PULSE_FREQUENCY) * PULSE_BASE_ALPHA,
          );
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
    if (finalHealth <= 0) {
      console.log(
        `❌ Last Stand BLOCKED for ${player.id}: reviveHealthPercent=${player.ability?.reviveHealthPercent}, lastStandUsed=${player.lastStandUsed}, inLastStand=${player.inLastStand}`,
      );
    }
  }

  static #enterLastStand(scene, player) {
    const livingTeammates = scene.players.filter(
      p => p.teamId === player.teamId && p.id !== player.id && p.health > 0 && !p.inLastStand,
    );

    if (livingTeammates.length > 0) {
      Object.assign(player, {
        health: Config.LAST_STAND.MINIMAL_HEALTH,
        inLastStand: true,
        lastStandUsed: true,
        lastStandTeamTurn: scene.turnManager.teamTurnCounters[player.teamId] || 0,
      });
      console.log(
        `🦎 Player ${player.id} entered Last Stand at team turn ${player.lastStandTeamTurn}! (${livingTeammates.length} teammates)`,
      );
    } else {
      player.health = 0;
      console.log(`💀 Player ${player.id} died (no teammates to revive)`);
    }
  }
}
