// Input management utilities for Combat Crocs

class InputManager {
  // Set up keyboard and mouse controls for the scene
  static setupInput(scene) {
    // Keyboard controls
    scene.cursors = scene.input.keyboard.createCursorKeys();
    scene.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Mouse aiming and shooting
    scene.input.on("pointermove", pointer => this.handleAiming(scene, pointer), scene);
    scene.input.on("pointerdown", pointer => this.handleShooting(scene, pointer), scene);

    // Clear aim line on turn change
    scene.events.on("turnChange", () => {
      InputManager.clearAimLine(scene);
    });

    // Keyboard shortcuts
    scene.input.keyboard.on("keydown-W", () => {
      UIManager.showWeaponSelectMenu(scene);
    });
  }

  // Handle mouse aiming calculations
  static handleAiming(scene, pointer) {
    if (!scene.gameStarted) return;

    const currentPlayerIndex = scene.turnManager.getCurrentPlayerIndex();
    if (!scene.players[currentPlayerIndex].canShoot) return;

    const player = scene.players[currentPlayerIndex];
    const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
    player.aimAngle = angle;

    // Update aim line when mouse moves
    InputManager.updateAimLine(scene);
  }

  // Handle shooting mechanics
  static handleShooting(scene, pointer) {
    // Prevent shooting while any modal overlay is active
    if (UIManager.isModalOpen(scene)) return;

    const currentPlayerIndex = scene.turnManager.getCurrentPlayerIndex();
    const player = scene.players[currentPlayerIndex];
    const currentWeapon = scene.turnManager.getCurrentWeapon();

    if (!player.canShoot || scene.turnManager.isTurnInProgress()) return;

    console.log(`Player ${player.id} shooting ${currentWeapon} at (${pointer.worldX}, ${pointer.worldY})`);

    // End turn after shooting (bazookas end turn, grenades keep turn until explosion)
    if (currentWeapon !== "GRENADE") {
      scene.turnManager.endCurrentTurn();
    }

    WeaponManager.createProjectile(scene, player, pointer.worldX, pointer.worldY, currentWeapon);
    player.canShoot = false;
    player.canMove = false; // Lock movement during projectile flight

    // Clear aim line
    InputManager.clearAimLine(scene);
  }

  // Get current cursor keys for movement handling
  static getCursors(scene) {
    return scene.cursors;
  }

  // Get space key for jumping
  static getSpaceKey(scene) {
    return scene.spaceKey;
  }

  // Update aiming line graphics (moved from UI for input cohesion)
  static updateAimLine(scene) {
    this.clearAimLine(scene);

    const currentPlayerIndex = scene.turnManager.getCurrentPlayerIndex();
    if (!scene.players[currentPlayerIndex].canShoot) return;

    const player = scene.players[currentPlayerIndex];
    const mouse = scene.input.activePointer;
    const angle = Phaser.Math.Angle.Between(player.x, player.y, mouse.worldX, mouse.worldY);

    scene.aimLine = scene.add.graphics().lineStyle(4, 0xffd23f).moveTo(player.x, player.y);

    const lineLength = Math.max(150, 300 - Math.abs(player.body.velocity.y) * 5);
    const endX = player.x + Math.cos(angle) * lineLength;
    const endY = player.y + Math.sin(angle) * lineLength;

    scene.aimLine.lineTo(endX, endY).strokePath();

    // Add arrowhead
    scene.aimLine.moveTo(endX, endY);
    scene.aimLine.lineTo(endX - Math.cos(angle - Math.PI / 6) * 12, endY - Math.sin(angle - Math.PI / 6) * 12);
    scene.aimLine.moveTo(endX, endY);
    scene.aimLine.lineTo(endX - Math.cos(angle + Math.PI / 6) * 12, endY - Math.sin(angle + Math.PI / 6) * 12);
    scene.aimLine.strokePath();
  }

  // Clear aiming line graphics
  static clearAimLine(scene) {
    if (scene.aimLine) {
      scene.aimLine.destroy();
      scene.aimLine = null;
    }
  }
}

window.InputManager = InputManager;
