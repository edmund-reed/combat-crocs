// UI utilities for Combat Crocs

class UIManager {
  // Create health bars
  static createHealthBars(scene) {
    scene.healthBars = [];

    scene.players.forEach((player, index) => {
      const bar = scene.add.graphics();
      bar.fillStyle(0xff0000);
      bar.fillRect(20, 20 + index * 40, 200, 20);
      bar.fillStyle(0x00ff00);
      bar.fillRect(20, 20 + index * 40, 200 * (player.health / 100), 20);

      // Player label
      scene.add.text(30, 22 + index * 40, `Player ${player.id}`, {
        font: "12px Arial",
        fill: "#FFFFFF",
      });

      scene.healthBars.push(bar);
    });
  }

  // Update health display
  static updateHealthBars(scene) {
    scene.healthBars.forEach((bar, index) => {
      bar.clear();
      const player = scene.players[index];

      bar.fillStyle(0xff0000);
      bar.fillRect(20, 20 + index * 40, 200, 20);

      // Use green for alive players, red overlay for dead
      if (player.health > 0) {
        bar.fillStyle(0x00ff00);
        const healthWidth = 200 * (player.health / 100);
        bar.fillRect(20, 20 + index * 40, healthWidth, 20);
      } else {
        // Dead player - show red bar full and add gravestone
        bar.fillStyle(0xff0000);
        bar.fillRect(20, 20 + index * 40, 200, 20);

        // Replace player sprite with gravestone
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
      `Weapon: ${Config.WEAPON_TYPES[WeaponManager.getCurrentWeapon()].name}`,
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
        "Move: Arrow Keys | Aim: Mouse | Shoot: Click | Jump: Spacebar",
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

  // Update turn display
  static updateTurnIndicator(scene, currentPlayer) {
    const player = scene.players[currentPlayer];
    scene.playerIndicator.setText(`Player ${player.id}'s Turn`);
    scene.playerIndicator.setFill(player.id === 1 ? "#00FF00" : "#FFD23F");

    // Highlight current player
    scene.players.forEach((p, index) => {
      p.graphics.setAlpha(index === currentPlayer ? 1.0 : 0.5);
    });
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
    if (!scene.players[scene.currentPlayer].canShoot) return;

    const player = scene.players[scene.currentPlayer];
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
}

window.UIManager = UIManager;
