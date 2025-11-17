// UI Components for Combat Crocs
class UIComponents {
  static createWeaponDisplay(scene) {
    const { turnManager: tm } = scene;
    scene.weaponText = scene.add.text(
      Config.GAME_WIDTH - 200,
      20,
      `Weapon: ${Config.WEAPON_TYPES[tm.getCurrentWeapon()].name}`,
      { font: "16px Arial", fill: "#FFD23F" },
    );
  }

  static createTimerDisplay(scene) {
    scene.timerText = scene.add.text(Config.GAME_WIDTH - 200, 50, "Time: 30", {
      font: "16px Arial",
      fill: "#FFFFFF",
    });
  }

  static createTurnIndicator(scene) {
    scene.playerIndicator = scene.add
      .text(Config.GAME_WIDTH / 2, 20, "Player 1's Turn", {
        font: "20px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
  }

  static createInstructions(scene) {
    return scene.add
      .text(
        Config.GAME_WIDTH / 2,
        50,
        "Move: Arrow Keys | Aim: Mouse | Shoot: Click | Jump: Spacebar | Weapons: W or 🔫",
        {
          font: "14px Arial",
          fill: "#FFFFFF",
          stroke: "#000000",
          strokeThickness: 2,
        },
      )
      .setOrigin(0.5);
  }
}

window.UIComponents = UIComponents;
