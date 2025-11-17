// Scene Utilities for Combat Crocs
// Shared utilities for game scene UI and interactions

class SceneUtils {
  // Create a team selector with plus/minus buttons and croc preview
  static createTeamSelector(scene, x, y, teamName, teamPrefix, isTeamA) {
    // Team label
    scene.add
      .text(x, y, teamName, {
        font: "bold 24px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Count display and controls
    const countY = y + 60;
    const controlY = y + 110;

    // Minus button
    const minusBtn = scene.add
      .text(x - 50, controlY, "-", {
        font: "bold 36px Arial",
        fill: "#FF6B35",
      })
      .setOrigin(0.5)
      .setInteractive();

    // Count display
    const countText = scene.add
      .text(x, countY, isTeamA ? scene.teamACount : scene.teamBCount, {
        font: "bold 48px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Plus button
    const plusBtn = scene.add
      .text(x + 50, controlY, "+", {
        font: "bold 36px Arial",
        fill: "#FF6B35",
      })
      .setOrigin(0.5)
      .setInteractive();

    // Button hover effects
    [minusBtn, plusBtn].forEach(btn => {
      btn.on("pointerover", () => btn.setScale(1.2).setFill("#FFFFFF"));
      btn.on("pointerout", () => btn.setScale(1.0).setFill("#FF6B35"));
    });

    // Minus button logic
    minusBtn.on("pointerdown", () => {
      const currentCount = isTeamA ? scene.teamACount : scene.teamBCount;
      if (currentCount > 1) {
        if (isTeamA) {
          scene.teamACount--;
        } else {
          scene.teamBCount--;
        }
        countText.setText(isTeamA ? scene.teamACount : scene.teamBCount);
        this.updateCrocPreview(scene, x, y + 160, isTeamA ? scene.teamACount : scene.teamBCount, isTeamA);
      }
    });

    // Plus button logic
    plusBtn.on("pointerdown", () => {
      const currentCount = isTeamA ? scene.teamACount : scene.teamBCount;
      if (currentCount < 3) {
        if (isTeamA) {
          scene.teamACount++;
        } else {
          scene.teamBCount++;
        }
        countText.setText(isTeamA ? scene.teamACount : scene.teamBCount);
        this.updateCrocPreview(scene, x, y + 160, isTeamA ? scene.teamACount : scene.teamBCount, isTeamA);
      }
    });

    // Initial croc preview
    this.updateCrocPreview(scene, x, y + 160, isTeamA ? scene.teamACount : scene.teamBCount, isTeamA);
  }

  // Update croc preview sprites for a team
  static updateCrocPreview(scene, x, y, count, isTeamA) {
    // Use separate sprite arrays for each team
    const spriteArray = isTeamA ? scene.teamASprites : scene.teamBSprites;

    // Remove existing crocs for this team only
    if (spriteArray && spriteArray.length > 0) {
      spriteArray.forEach(sprite => sprite.destroy());
    }

    // Clear the array
    spriteArray.length = 0;

    // Create croc sprites based on count - use team-consistent sprites
    const spacing = 60;
    const startX = x - ((count - 1) * spacing) / 2;

    // Use team-consistent sprites: Team A = croc1, Team B = croc2
    const teamSprite = isTeamA ? "croc1" : "croc2";

    for (let i = 0; i < count; i++) {
      const croc = scene.add.sprite(startX + i * spacing, y, teamSprite);
      croc.setScale(0.08); // Smaller for preview
      spriteArray.push(croc);
    }
  }
}

window.SceneUtils = SceneUtils;
