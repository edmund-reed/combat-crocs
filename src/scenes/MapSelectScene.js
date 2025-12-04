import { Config } from "@config";
import { UITextHelpers, UIButtonHelpers } from "@ui";
import { Maps as MapManager } from "@utils";

class MapSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "MapSelectScene" });
  }

  preload() {
    // Load ride images
    this.load.image("magnificentBulk", "src/assets/rides/magnificent-bulk.png");
    this.load.image("dinocoaster", "src/assets/rides/dinocoaster.png");
    this.load.image("hotelOfHorror", "src/assets/rides/hotel-of-horror.png");
    this.load.image("heavyMetalCoaster", "src/assets/rides/heavy-metal-coaster.png");
  }

  create() {
    const { GAME_WIDTH, GAME_HEIGHT } = Config;
    const centerX = GAME_WIDTH / 2;

    this.add
      .graphics()
      .fillGradientStyle(0xff6b35, 0xf7931e, 0xffd23f, 0xffd23f, 1)
      .fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.add.text(centerX, 80, "CHOOSE YOUR RIDE", UITextHelpers._getPrimaryTextStyle(36, 4)).setOrigin(0.5);
    this.add.text(centerX, 130, "Select a ride to battle on", UITextHelpers._getPrimaryTextStyle(18, 2)).setOrigin(0.5);

    // Get maps for selected theme park
    const selectedThemePark = MapManager.getSelectedThemePark();
    const mapIds = selectedThemePark ? MapManager.getMapsForThemePark(selectedThemePark) : MapManager.getMapIds(); // Fallback to all maps

    // Create ride options in horizontal grid
    const spacing = 280; // Space between images
    const startX = centerX - (spacing * (mapIds.length - 1)) / 2;
    const gridY = 250; // Vertical position for grid

    mapIds.forEach((mapId, index) => {
      const x = startX + index * spacing;
      this.createMapOption(mapId, x, gridY);
    });

    const backBtn = this.add
      .text(centerX, GAME_HEIGHT - 120, "BACK", {
        font: "20px Arial",
        fill: "#0000FF",
        stroke: "#FFFFFF",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setInteractive();
    UIButtonHelpers.addHoverEffect(backBtn, "#0000FF");
    backBtn.on("pointerdown", () => this.scene.start("ThemeParkSelectScene"));
  }

  createMapOption(mapId, x, y) {
    // Ride image - sized appropriately for grid layout
    const rideImage = this.add.image(x, y, mapId).setInteractive();
    const imageSize = 250;
    if (rideImage.width > imageSize || rideImage.height > imageSize) {
      const scale = imageSize / Math.max(rideImage.width, rideImage.height);
      rideImage.setScale(scale);
    }

    // Hover effects
    rideImage.on("pointerover", () => {
      rideImage.setScale(rideImage.scaleX * 1.05);
      rideImage.setTint(0xdddddd);
    });
    rideImage.on("pointerout", () => {
      rideImage.setScale(rideImage.scaleX / 1.05);
      rideImage.clearTint();
    });
    rideImage.on("pointerdown", () => {
      MapManager.setCurrentMap(mapId);
      window.CombatCrocs.gameState.game.selectedMap = mapId;
      const mapInfo = MapManager.getMapDisplayInfo(mapId);
      console.log(`Selected map: ${mapInfo.name} (${mapId})`);
      this.scene.start("PlayerSelectScene");
    });
  }
}

export default MapSelectScene;
