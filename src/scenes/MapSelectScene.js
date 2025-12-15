import { Config } from "@config";
import { UITextHelpers, UIButtonHelpers, UISceneHelpers } from "@ui";
import { Maps as MapManager } from "@utils";

class MapSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "MapSelectScene" });
  }

  preload() {
    this.load.image("mapBg", "src/assets/backgrounds/map-bg.png");

    // Each ride provides src/assets/rides/<rideFolder>/logo.png
    Object.values(MapManager.maps).forEach(map => {
      if (!map?.id || !map?.rideFolder) return;
      this.load.image(map.id, `src/assets/rides/${map.rideFolder}/logo.png`);
    });
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
      ? MapManager.themeParks[selectedThemePark]?.maps ?? []
      : Object.keys(MapManager.maps);

    // Create ride options in horizontal grid
    const spacing = 280;
    const startX = centerX - (spacing * (mapIds.length - 1)) / 2;

    mapIds.forEach((mapId, index) => {
      UIButtonHelpers.createInteractiveImage(this, startX + index * spacing, 300, mapId, 250, {
        initialTint: 0xdddddd,
        onClick: () => {
          MapManager.setCurrentMap(mapId);
          window.CombatCrocs.gameState.game.selectedMap = mapId;
          console.log(`Selected map: ${MapManager.maps[mapId].name} (${mapId})`);
          this.scene.start("PlayerSelectScene");
        },
      });
    });

    // Back button
    UIButtonHelpers.createBackButton(this, "ThemeParkSelectScene", centerX, height - 120, "BACK");
  }
}

export default MapSelectScene;
