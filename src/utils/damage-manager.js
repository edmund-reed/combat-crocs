import { Logger } from "@config";
import { LastStandManager } from "./last-stand-manager.js";

/**
 * Centralised damage application for players.
 *
 * Weapons should call DamageManager.applyDamage rather than mutating
 * player.health directly. This function handles:
 * - Logging
 * - Ability hooks (e.g. Last Stand)
 * - Returning the actual damage dealt for XP / UI
 */
export class DamageManager {
  static applyDamage(scene, targetPlayer, damage) {
    const previousHealth = targetPlayer.health;
    const finalHealth = previousHealth - damage;

    Logger.playerAction(
      `Damage: Player ${targetPlayer.id} ${previousHealth} → ${finalHealth}, ` +
        `ability=${targetPlayer.ability?.name}, used=${targetPlayer.lastStandUsed}, inStand=${targetPlayer.inLastStand}`,
    );

    // Let Last Stand intercept lethal hits for eligible players
    const enteredLastStand = LastStandManager.tryEnterLastStand(scene, targetPlayer, finalHealth);

    // Normal damage application when Last Stand did not intercept
    if (!enteredLastStand) {
      targetPlayer.health = Math.max(0, finalHealth);
    }

    const currentHealth = targetPlayer.health;

    return {
      previousHealth,
      currentHealth,
      requestedDamage: damage,
      actualDamage: previousHealth - currentHealth,
      enteredLastStand,
    };
  }
}
