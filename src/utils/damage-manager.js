import { Logger } from "@config";
import { LastStandManager } from "./last-stand-manager.js";

export class DamageManager {
  static applyDamage(scene, targetPlayer, damage) {
    const previousHealth = targetPlayer.health;
    const finalHealth = previousHealth - damage;

    Logger.playerAction(
      `Damage: Player ${targetPlayer.id} ${previousHealth} → ${finalHealth}, ` +
        `ability=${targetPlayer.ability?.name}, used=${targetPlayer.lastStandUsed}, inStand=${targetPlayer.inLastStand}`,
    );

    const enteredLastStand = LastStandManager.tryEnterLastStand(scene, targetPlayer, finalHealth);
    enteredLastStand || (targetPlayer.health = Math.max(0, finalHealth));

    return {
      previousHealth,
      currentHealth: targetPlayer.health,
      requestedDamage: damage,
      actualDamage: previousHealth - targetPlayer.health,
      enteredLastStand,
    };
  }
}
