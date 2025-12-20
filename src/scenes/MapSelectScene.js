import { Config } from "@config";
import { UIButtonHelpers, UISceneHelpers } from "@ui";
import { Maps as MapManager } from "@utils";

class MapSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "MapSelectScene" });
  }

  preload() {
    this.load.image("mapBg", "src/assets/backgrounds/map-bg.png");
    Object.values(MapManager.maps).forEach(map => {
      map?.id && map?.rideFolder && this.load.image(map.id, `src/assets/rides/${map.rideFolder}/logo.png`);
    });
  }

  create() {
    const layout = UISceneHelpers.getSceneLayout(Config);
    UISceneHelpers.setupScaledBackground(this, "mapBg", layout);
    UISceneHelpers.createSceneHeader(this, layout, "CHOOSE YOUR RIDE", "Select a ride to battle on");

    const selectedThemePark = MapManager.getSelectedThemePark();
    const mapIds = selectedThemePark
      ? MapManager.themeParks[selectedThemePark]?.maps ?? []
      : Object.keys(MapManager.maps);

    const spacing = 280;
    const startX = layout.centerX - (spacing * (mapIds.length - 1)) / 2;

    mapIds.forEach((mapId, index) => {
      UIButtonHelpers.createInteractiveImage(this, startX + index * spacing, 300, mapId, 250, {
        initialTint: 0xdddddd,
        onClick: () => {
          MapManager.setCurrentMap(mapId);
          window.CombatCrocs.gameState.game.selectedMap = mapId;
          this.scene.start("PlayerSelectScene");
        },
      });
    });

    UIButtonHelpers.createBackButton(
      this,
      "ThemeParkSelectScene",
      layout.centerX,
      layout.height - 120,
      "BACK",
    );
  }
}

export default MapSelectScene;
