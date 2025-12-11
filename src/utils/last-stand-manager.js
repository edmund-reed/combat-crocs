// Last Stand ability management for Combat Crocs

import { Config } from "@config";

export class LastStandManager {
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
