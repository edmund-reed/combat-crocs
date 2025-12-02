import { Config } from "@config";
import { UITextHelpers, UIButtonHelpers } from "@ui";
import { Maps as MapManager } from "@utils";

class MapSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "MapSelectScene" });
  }

  create() {
    const { GAME_WIDTH, GAME_HEIGHT } = Config;
    const centerX = GAME_WIDTH / 2;

    this.add
      .graphics()
      .fillGradientStyle(0xff6b35, 0xf7931e, 0xffd23f, 0xffd23f, 1)
      .fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.add.text(centerX, 80, "CHOOSE YOUR BATTLEFIELD", UITextHelpers._getPrimaryTextStyle(36, 4)).setOrigin(0.5);
    this.add.text(centerX, 130, "Select a map to fight on", UITextHelpers._getPrimaryTextStyle(18, 2)).setOrigin(0.5);

    MapManager.getMapIds().forEach((mapId, index) => {
      this.createMapOption(mapId, MapManager.getMapDisplayInfo(mapId), 200 + index * 120);
    });

    const backBtn = this.add
      .text(centerX, GAME_HEIGHT - 120, "BACK TO MENU", {
        font: "20px Arial",
        fill: "#0000FF",
        stroke: "#FFFFFF",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setInteractive();
    UIButtonHelpers.addHoverEffect(backBtn, "#0000FF");
    backBtn.on("pointerdown", () => this.scene.start("MenuScene"));
  }

  createMapOption(mapId, mapInfo, y) {
    const centerX = Config.GAME_WIDTH / 2;

    const mapBg = this.add
      .graphics()
      .fillStyle(mapInfo.backgroundColor, 1)
      .fillRect(centerX - 250, y - 40, 500, 80)
      .setAlpha(0.8);

    UITextHelpers.createStatusText(
      this,
      centerX - 230,
      y - 25,
      "★".repeat(mapInfo.difficulty),
      mapInfo.difficulty === 1 ? "#00FF00" : "#FFFF88",
      16,
    );
    UITextHelpers.secondaryText(this, centerX, y - 25, mapInfo.name, 20);
    UITextHelpers.secondaryText(this, centerX, y + 5, mapInfo.description, 14);
    UITextHelpers.createMutedText(this, centerX + 200, y + 8, `${mapInfo.platformCount} platforms`, 12);

    const mapButton = this.add.zone(centerX, y, 500, 80).setInteractive();
    mapButton.on("pointerover", () => mapBg.setAlpha(1.0));
    mapButton.on("pointerout", () => mapBg.setAlpha(0.8));
    mapButton.on("pointerdown", () => {
      MapManager.setCurrentMap(mapId);
      window.CombatCrocs.gameState.game.selectedMap = mapId;
      console.log(`Selected map: ${mapInfo.name} (${mapId})`);
      this.scene.start("PlayerSelectScene");
    });
  }
}

export default MapSelectScene;
