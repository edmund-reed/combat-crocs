// Weapon Menu Manager for Combat Crocs
class WeaponMenuManager {
  static createWeaponSelectIcon(scene) {
    const icon = scene.add
      .graphics()
      .fillStyle(0xffd23f)
      .fillRect(Config.GAME_WIDTH - 250, 22, 24, 4)
      .fillRect(Config.GAME_WIDTH - 250, 20, 4, 12);

    icon
      .setInteractive(new Phaser.Geom.Rectangle(Config.GAME_WIDTH - 255, 10, 30, 30), Phaser.Geom.Rectangle.Contains)
      .on("pointerdown", (_, __, ___, event) => {
        event.stopPropagation();
        // Prevent weapon switching after firing
        if (scene.turnManager.weaponLocked) {
          console.log("⚠️ Weapon locked - cannot change after firing");
          return;
        }
        this.showWeaponSelectMenu(scene);
      });

    scene.weaponSelectIcon = icon;
  }

  static showWeaponSelectMenu(scene) {
    if (scene.gameEnded || scene.weaponMenu) return;

    const { GAME_WIDTH: w, GAME_HEIGHT: h } = Config;
    const menuDepth = 1001;
    const currentWeapon = scene.turnManager.getCurrentWeapon();

    // Automatically generate weapon list from configs
    const weapons = Object.keys(Config.WEAPON_CONFIGS).map((weaponKey, index) => {
      const yPos = h / 2 - 30 + index * 30; // Space out buttons
      return [weaponKey, weaponKey, yPos]; // Just use weapon key as display name
    });

    const elements = {
      overlay: ModalManager.createModalOverlay(scene, () => this.hideWeaponSelectMenu(scene)),
      menuBg: scene.add
        .graphics()
        .setDepth(menuDepth + 1)
        .fillStyle(0x333333, 0.95)
        .fillRoundedRect(w / 2 - 100, h / 2 - 75, 200, 150, 10)
        .lineStyle(3, 0xffd23f)
        .strokeRoundedRect(w / 2 - 100, h / 2 - 75, 200, 150, 10),
      title: UITextHelpers.primaryText(scene, w / 2, h / 2 - 55, "Select Weapon", 18).setDepth(menuDepth + 2),
      ...Object.fromEntries(
        weapons.map(([label, type, y]) => [
          `${label.toLowerCase()}Btn`,
          this.createWeaponButton(scene, w / 2 - 75, y, label, type, currentWeapon === type, menuDepth + 3),
        ]),
      ),
    };

    scene.weaponMenu = elements;
  }

  static createWeaponButton(scene, x, y, label, weaponType, isSelected, depth = 0) {
    const button = UITextHelpers.createStatusText(
      scene,
      x,
      y,
      `${isSelected ? "▶ " : ""}${label}`,
      isSelected ? "#00FF00" : UITextHelpers.SECONDARY_COLOR,
      14,
    );

    return button
      .setInteractive()
      .setDepth(depth)
      .on("pointerdown", (_, __, ___, event) => {
        event.stopPropagation();
        scene.turnManager.setCurrentWeapon(weaponType);
        TurnManager.updateWeaponDisplay(scene);
        WeaponMenuManager.hideWeaponSelectMenu(scene);
      });
  }

  static hideWeaponSelectMenu(scene) {
    if (!scene.weaponMenu) return;

    ModalManager.clearModalOverlays(scene);

    if (scene.inputManagerBackup) {
      scene.input.on("pointermove", scene.inputManagerBackup.aimingHandler);
      scene.input.on("pointerdown", scene.inputManagerBackup.shootingHandler);
      scene.inputManagerBackup = null;
    }

    Object.values(scene.weaponMenu).forEach(el => el?.destroy?.());
    scene.weaponMenu = null;
  }
}

window.WeaponMenuManager = WeaponMenuManager;
