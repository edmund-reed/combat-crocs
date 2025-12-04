import { Config } from "@config";
import { UITextHelpers, UIButtonHelpers, UISceneHelpers } from "@ui";
import { Maps as MapManager } from "@utils";

class MapSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "MapSelectScene" });
  }

  preload() {
    this.load.image("magnificentBulk", "src/assets/rides/magnificent-bulk.png");
    this.load.image("dinocoaster", "src/assets/rides/dinocoaster.png");
    this.load.image("hotelOfHorror", "src/assets/rides/hotel-of-horror.png");
    this.load.image("heavyMetalCoaster", "src/assets/rides/heavy-metal-coaster.png");
  }

  create() {
    const layout = UISceneHelpers.getSceneLayout(Config);

    // Gradient background
    UISceneHelpers.createBackground(
      this,
      { type: "gradient", colors: [0xff6b35, 0xf7931e, 0xffd23f, 0xffd23f] },
      layout,
    );

    // Title and subtitle
    this.add.text(layout.centerX, 80, "CHOOSE YOUR RIDE", UITextHelpers._getPrimaryTextStyle(36, 4)).setOrigin(0.5);
    this.add
      .text(layout.centerX, 130, "Select a ride to battle on", UITextHelpers._getPrimaryTextStyle(18, 2))
      .setOrigin(0.5);

    // Get maps for selected theme park
    const selectedThemePark = MapManager.getSelectedThemePark();
    const mapIds = selectedThemePark ? MapManager.getMapsForThemePark(selectedThemePark) : MapManager.getMapIds();

    // Create ride options in horizontal grid
    const spacing = 280;
    const startX = layout.centerX - (spacing * (mapIds.length - 1)) / 2;

    mapIds.forEach((mapId, index) => {
      UIButtonHelpers.createInteractiveImage(this, startX + index * spacing, 250, mapId, 250, {
        initialTint: 0xdddddd,
        onClick: () => {
          MapManager.setCurrentMap(mapId);
          window.CombatCrocs.gameState.game.selectedMap = mapId;
          console.log(`Selected map: ${MapManager.getMapDisplayInfo(mapId).name} (${mapId})`);
          this.scene.start("PlayerSelectScene");
        },
      });
    });

    // Back button
    UIButtonHelpers.createBackButton(this, "ThemeParkSelectScene", layout.centerX, layout.height - 120, "BACK");
  }
}

export default MapSelectScene;
