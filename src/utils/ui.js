// UI utilities for Combat Crocs

class UIManager {
  // Create health bars above each crocodile
  static createHealthBars(scene) {
    scene.healthBars = [];

    scene.players.forEach((player, index) => {
      const bar = scene.add.graphics();
      bar.fillStyle(0xff0000);
      bar.fillRect(0, 0, 100, 12); // Smaller bars above players
      bar.fillStyle(0x00ff00);
      bar.fillRect(0, 0, 100 * (player.health / 100), 12);

      // Player label (centered below bar)
      const textLabel = scene.add
        .text(0, 2, `P${player.id}`, {
          font: "10px Arial",
          fill: "#FFFFFF",
        })
        .setOrigin(0.5);

      scene.healthBars.push({
        barGraphics: bar,
        textLabel: textLabel,
        playerId: player.id,
      });
    });
  }

  // Update health bar positions (called every frame)
  static updateHealthBarPositions(scene) {
    scene.healthBars.forEach((barData) => {
      // Find the corresponding player
      const player = scene.players.find((p) => p.id === barData.playerId);
      if (!player || player.health <= 0) {
        // Dead players - hide bars
        barData.barGraphics.setVisible(false);
        barData.textLabel.setVisible(false);
        return;
      }

      // Position bar above player's head (50px above player center)
      const barX = player.x - 50; // Centered above player
      const barY = player.y - 60; // Above player head

      barData.barGraphics.setPosition(barX, barY);
      barData.textLabel.setPosition(player.x, barY + 14); // Below bar

      // Ensure bars are visible
      barData.barGraphics.setVisible(true);
      barData.textLabel.setVisible(true);
    });
  }

  // Update health bar values (positions updated separately)
  static updateHealthBars(scene) {
    scene.healthBars.forEach((barData, index) => {
      const { barGraphics } = barData;
      const player = scene.players[index];

      barGraphics.clear();

      // Draw background (red)
      barGraphics.fillStyle(0xff0000);
      barGraphics.fillRect(0, 0, 100, 12);

      // Draw health (green for alive, solid red for dead)
      if (player.health > 0) {
        barGraphics.fillStyle(0x00ff00);
        const healthWidth = 100 * (player.health / 100);
        barGraphics.fillRect(0, 0, healthWidth, 12);

        // Show bar for alive players
        barData.barGraphics.setVisible(true);
        barData.textLabel.setVisible(true);
      } else {
        // Dead player - solid red and hide gravestone
        barData.barGraphics.setVisible(false);
        barData.textLabel.setVisible(false);

        // First death - remove physics body and show gravestone
        if (player.body && !player.body.isRemoved) {
          scene.matter.world.remove(player.body);
          player.body.isRemoved = true;
        }
        this.showGravestone(scene, player);
      }
    });
  }

  // Show gravestone for dead player
  static showGravestone(scene, player) {
    // Create gravestone at player's position
    const gravestone = scene.add.graphics();
    gravestone.fillStyle(0x666666); // Dark gray
    gravestone.fillRect(player.x - 8, player.y - 30, 16, 30); // Vertical stone
    gravestone.fillRect(player.x - 12, player.y - 35, 24, 8); // Horizontal top

    // RIP text
    const ripText = scene.add
      .text(player.x, player.y - 40, "RIP", {
        font: "bold 10px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 1,
      })
      .setOrigin(0.5);

    // Hide original player sprite
    player.graphics.setVisible(false);

    // Store references for cleanup if needed
    if (!scene.gravestones) scene.gravestones = [];
    scene.gravestones.push({ gravestone, ripText });
  }

  // Create weapon display
  static createWeaponDisplay(scene) {
    scene.weaponText = scene.add.text(
      Config.GAME_WIDTH - 200,
      20,
      `Weapon: ${
        Config.WEAPON_TYPES[scene.turnManager.getCurrentWeapon()].name
      }`,
      {
        font: "16px Arial",
        fill: "#FFD23F",
      }
    );
  }

  // Create timer display
  static createTimerDisplay(scene) {
    scene.timerText = scene.add.text(Config.GAME_WIDTH - 200, 50, "Time: 30", {
      font: "16px Arial",
      fill: "#FFFFFF",
    });
  }

  // Create turn indicator
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

  // Create instructions
  static createInstructions(scene) {
    const instructionsText = scene.add
      .text(
        Config.GAME_WIDTH / 2,
        50,
        "Move: Arrow Keys | Aim: Mouse | Shoot: Click | Jump: Spacebar | Weapons: W or 🔫",
        {
          font: "14px Arial",
          fill: "#FFFFFF",
          stroke: "#000000",
          strokeThickness: 2,
        }
      )
      .setOrigin(0.5);

    return instructionsText;
  }

  // Update timer display
  static updateTimer(scene, timeLeft) {
    scene.timerText.setText(`Time: ${Math.ceil(timeLeft)}`);
  }

  // Show game end screen
  static showGameEndScreen(scene, winnerTeam) {
    // Don't pause the scene - keep input working
    const overlay = scene.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT);

    const gameOverText = scene.add
      .text(
        Config.GAME_WIDTH / 2,
        Config.GAME_HEIGHT / 2,
        `${winnerTeam} Wins!\n\nClick to return to menu`,
        {
          font: "bold 32px Arial",
          fill: "#FFD23F",
          align: "center",
        }
      )
      .setOrigin(0.5);

    // Make it interactive and handle the click
    gameOverText.setInteractive();
    gameOverText.on("pointerdown", () => {
      scene.scene.stop();
      scene.scene.start("MenuScene");
    });

    // Also allow clicking anywhere on the overlay
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );
    overlay.on("pointerdown", () => {
      scene.scene.stop();
      scene.scene.start("MenuScene");
    });
  }

  // Update aiming line graphics
  static updateAimLine(scene) {
    UIManager.clearAimLine(scene);

    // Only show aiming when player can shoot
    const currentPlayerIndex = scene.turnManager.getCurrentPlayerIndex();
    if (!scene.players[currentPlayerIndex].canShoot) return;

    const player = scene.players[currentPlayerIndex];
    const mouse = scene.input.activePointer;
    const angle = Phaser.Math.Angle.Between(
      player.x,
      player.y,
      mouse.worldX,
      mouse.worldY
    );

    // Create yellow direction arrow
    scene.aimLine = scene.add.graphics();
    scene.aimLine.lineStyle(4, 0xffd23f); // Thick yellow line
    scene.aimLine.moveTo(player.x, player.y);

    // Show direction with arrowhead (extended line for better visibility)
    const lineLength = Math.max(
      150,
      300 - Math.abs(player.body.velocity.y) * 5
    );
    const endX = player.x + Math.cos(angle) * lineLength;
    const endY = player.y + Math.sin(angle) * lineLength;

    scene.aimLine.lineTo(endX, endY);
    scene.aimLine.strokePath();

    // Add arrowhead
    const arrowSize = 12;
    scene.aimLine.moveTo(endX, endY);
    scene.aimLine.lineTo(
      endX - Math.cos(angle - Math.PI / 6) * arrowSize,
      endY - Math.sin(angle - Math.PI / 6) * arrowSize
    );
    scene.aimLine.moveTo(endX, endY);
    scene.aimLine.lineTo(
      endX - Math.cos(angle + Math.PI / 6) * arrowSize,
      endY - Math.sin(angle + Math.PI / 6) * arrowSize
    );
    scene.aimLine.strokePath();
  }

  // Clear aiming line graphics
  static clearAimLine(scene) {
    if (scene.aimLine) {
      scene.aimLine.destroy();
      scene.aimLine = null;
    }
  }

  // Create weapon selection icon
  static createWeaponSelectIcon(scene) {
    const iconSize = 24;
    const { GAME_WIDTH } = Config;

    const icon = scene.add
      .graphics()
      .fillStyle(0xffd23f)
      .fillRect(GAME_WIDTH - 250, 22, iconSize, 4) // Barrel
      .fillRect(GAME_WIDTH - 250, 20, 4, iconSize / 2); // Handle

    icon
      .setInteractive(
        new Phaser.Geom.Rectangle(
          GAME_WIDTH - 255,
          10,
          iconSize + 10,
          iconSize + 10
        ),
        Phaser.Geom.Rectangle.Contains
      )
      .on("pointerdown", (_, __, ___, event) => {
        event.stopPropagation();
        this.showWeaponSelectMenu(scene);
      });

    scene.weaponSelectIcon = icon;
  }

  // Create a reusable modal overlay background
  static createModalOverlay(scene, closeCallback = null) {
    const { GAME_WIDTH: w, GAME_HEIGHT: h } = Config;
    const overlay = scene.add
      .graphics()
      .fillStyle(0x000000, 0.7)
      .fillRect(0, 0, w, h)
      .setDepth(1000);

    if (closeCallback) {
      overlay.setInteractive().on("pointerdown", () => closeCallback());
    }

    // Track modal state globally for input blocking
    scene.modalOverlayActive = true;

    // Store overlay reference for cleanup
    if (!scene.modalOverlays) scene.modalOverlays = [];
    scene.modalOverlays.push(overlay);

    return overlay;
  }

  // Clear all modal overlays
  static clearModalOverlays(scene) {
    scene.modalOverlayActive = false;
    if (scene.modalOverlays) {
      scene.modalOverlays.forEach((overlay) => overlay.destroy());
      scene.modalOverlays = [];
    }
  }

  // Check if any modal is currently active
  static isModalOpen(scene) {
    return scene.modalOverlayActive || false;
  }

  // Show weapon selection menu
  static showWeaponSelectMenu(scene) {
    if (scene.gameEnded || scene.weaponMenu) return;

    const { GAME_WIDTH: w, GAME_HEIGHT: h } = Config;
    const [menuWidth, menuHeight] = [200, 120];
    const [menuX, menuY] = [w / 2 - menuWidth / 2, h / 2 - menuHeight / 2];
    const menuDepth = 1001; // Above overlay depth

    const currentWeapon = scene.turnManager.getCurrentWeapon();
    const weapons = [
      ["Bazooka", "BAZOOKA", menuY + 45],
      ["Grenade", "GRENADE", menuY + 75],
    ];

    const elements = {
      overlay: this.createModalOverlay(scene, () =>
        this.hideWeaponSelectMenu(scene)
      ),
      menuBg: scene.add
        .graphics()
        .setDepth(menuDepth + 1)
        .fillStyle(0x333333, 0.95)
        .fillRoundedRect(menuX, menuY, menuWidth, menuHeight, 10)
        .lineStyle(3, 0xffd23f)
        .strokeRoundedRect(menuX, menuY, menuWidth, menuHeight, 10),
      title: scene.add
        .text(menuX + menuWidth / 2, menuY + 20, "Select Weapon", {
          font: "18px Arial",
          fill: "#FFD23F",
        })
        .setOrigin(0.5)
        .setDepth(menuDepth + 2),
      ...Object.fromEntries(
        weapons.map(([label, type, y]) => [
          `${label.toLowerCase()}Btn`,
          this.createWeaponButton(
            scene,
            menuX + 25,
            y,
            label,
            type,
            currentWeapon === type,
            menuDepth + 3
          ),
        ])
      ),
    };

    scene.weaponMenu = elements;
  }

  // Create weapon selection button
  static createWeaponButton(
    scene,
    x,
    y,
    label,
    weaponType,
    isSelected,
    depth = 0
  ) {
    const button = scene.add.text(x, y, `${isSelected ? "▶ " : ""}${label}`, {
      font: "14px Arial",
      fill: isSelected ? "#00FF00" : "#FFFFFF",
    });

    return button
      .setInteractive()
      .setDepth(depth)
      .on("pointerdown", (_, __, ___, event) => {
        event.stopPropagation();
        scene.turnManager.setCurrentWeapon(weaponType);
        this.updateWeaponDisplay(scene);
        this.hideWeaponSelectMenu(scene);
      });
  }

  // Hide weapon selection menu
  static hideWeaponSelectMenu(scene) {
    if (!scene.weaponMenu) return;

    // Clear modal overlay
    this.clearModalOverlays(scene);

    // Restore scene-level input
    if (scene.inputManagerBackup) {
      scene.input.on("pointermove", scene.inputManagerBackup.aimingHandler);
      scene.input.on("pointerdown", scene.inputManagerBackup.shootingHandler);
      scene.inputManagerBackup = null;
    }

    Object.values(scene.weaponMenu).forEach((el) => el?.destroy?.());
    scene.weaponMenu = null;
  }

  // Update weapon display text
  static updateWeaponDisplay(scene) {
    scene.weaponText?.setText(
      `Weapon: ${
        Config.WEAPON_TYPES[scene.turnManager.getCurrentWeapon()].name
      }`
    );
  }

  // Delegated methods from TurnManager for better separation
  static updateTurnIndicator(scene, currentPlayer) {
    const playerName = `Player ${currentPlayer.id}`;
    scene.playerIndicator.setText(`${playerName}'s Turn`);
    scene.playerIndicator.setFill(
      currentPlayer.id.startsWith("A") ? "#00FF00" : "#FFD23F"
    );
  }

  static updatePlayerHighlighting(scene, currentPlayerIndex) {
    scene.players.forEach((player, index) => {
      player.graphics.setAlpha(index === currentPlayerIndex ? 1.0 : 0.5);
    });
  }
}

window.UIManager = UIManager;
