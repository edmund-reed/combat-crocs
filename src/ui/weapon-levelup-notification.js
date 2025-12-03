// Level-up notification system for weapon upgrades

import { Config } from "@config";
import { UITextHelpers } from "./ui-helpers.js";
import { WeaponUpgradeEffects } from "@weapons";

class WeaponLevelUpNotification {
  static show(scene, weaponType, newLevel) {
    if (!scene || scene.gameEnded) return;

    console.log(`🎊 SHOWING LEVEL-UP NOTIFICATION: ${weaponType} Level ${newLevel}`);

    // Show screen flash effect
    WeaponUpgradeEffects.showLevelUpFlash(scene);

    // Use Config directly instead of scene.game.config
    const centerX = Config.GAME_WIDTH / 2;
    const centerY = Config.GAME_HEIGHT / 2;

    // Create notification background
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRoundedRect(centerX - 150, centerY - 50, 300, 100, 10);
    bg.lineStyle(3, 0xffd700);
    bg.strokeRoundedRect(centerX - 150, centerY - 50, 300, 100, 10);
    bg.setDepth(2000);

    // Create level-up text
    const stars = "⭐".repeat(newLevel);
    const mainText = UITextHelpers.primaryText(scene, centerX, centerY - 15, "LEVEL UP!", 24);
    const weaponText = UITextHelpers.createStatusText(scene, centerX, centerY + 10, weaponType, "#FFD700", 18);
    const levelText = UITextHelpers.createStatusText(scene, centerX, centerY + 30, stars, "#FFD700", 16);

    mainText.setDepth(2001);
    weaponText.setDepth(2001);
    levelText.setDepth(2001);

    // Animate in
    bg.setAlpha(0);
    mainText.setAlpha(0).setScale(0.5);
    weaponText.setAlpha(0);
    levelText.setAlpha(0);

    scene.tweens.add({
      targets: bg,
      alpha: 1,
      duration: 200,
    });

    scene.tweens.add({
      targets: mainText,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: "Back.easeOut",
    });

    scene.tweens.add({
      targets: [weaponText, levelText],
      alpha: 1,
      duration: 300,
      delay: 150,
    });

    // Auto-dismiss after 2 seconds
    scene.time.delayedCall(2000, () => {
      scene.tweens.add({
        targets: [bg, mainText, weaponText, levelText],
        alpha: 0,
        duration: 300,
        onComplete: () => {
          bg.destroy();
          mainText.destroy();
          weaponText.destroy();
          levelText.destroy();
        },
      });
    });
  }
}

export default WeaponLevelUpNotification;
