import { Config } from "@config";
import { UITextHelpers, UIButtonHelpers, UISceneHelpers } from "@ui";
import { Maps as MapManager } from "@utils";

class MapSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "MapSelectScene" });
  }

  preload() {
    this.load.image("mapBg", "src/assets/map-bg.png");
    this.load.image("magnificentBulk", "src/assets/rides/magnificent-bulk.png");
    this.load.image("dinocoaster", "src/assets/rides/dinocoaster.png");
    this.load.image("hotelOfHorror", "src/assets/rides/hotel-of-horror.png");
    this.load.image("heavyMetalCoaster", "src/assets/rides/heavy-metal-coaster.png");
  }

  create() {
    // const layout = UISceneHelpers.getSceneLayout(Config);
    const { width, height, centerX } = UISceneHelpers.getSceneLayout(Config);

    // Map background image (positioned like main menu)
    const bgImage = this.add.image(centerX, height, "mapBg");
    bgImage.setScale(Math.max(width / bgImage.width, height / bgImage.height)).setOrigin(0.5, 1);

    // Title and subtitle
    UISceneHelpers.styledText(this, centerX, 80, "CHOOSE YOUR RIDE", 36, 4);
    UISceneHelpers.styledText(this, centerX, 130, "Select a ride to battle on", 18, 2);

    // Get maps for selected theme park
    const selectedThemePark = MapManager.getSelectedThemePark();
    const mapIds = selectedThemePark
      ? MapManager.getMapsForThemePark(selectedThemePark)
      : MapManager.getMapIds();

    // Create ride options in horizontal grid
    const spacing = 280;
    const startX = centerX - (spacing * (mapIds.length - 1)) / 2;

    mapIds.forEach((mapId, index) => {
      UIButtonHelpers.createInteractiveImage(this, startX + index * spacing, 300, mapId, 250, {
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
    UIButtonHelpers.createBackButton(this, "ThemeParkSelectScene", centerX, height - 120, "BACK");
  }
}

export default MapSelectScene;
