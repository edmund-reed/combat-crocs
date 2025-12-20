import { Config } from "@config";
import { UIButtonHelpers, UISceneHelpers } from "@ui";
import { Maps as MapManager } from "@utils";

class ThemeParkSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "ThemeParkSelectScene" });
  }

  preload() {
    this.load.image("floridaMap", "src/assets/backgrounds/florida.png");
    this.load.image("movieStudios", "src/assets/theme-parks/movie-studios.png");
    this.load.image("magicalLand", "src/assets/theme-parks/magical-land.png");
  }

  create() {
    const layout = UISceneHelpers.getSceneLayout(Config);

    UISceneHelpers.createBackground(
      this,
      { type: "image", key: "floridaMap", scale: 1.5, offsetX: -325, offsetY: 0 },
      layout,
    );

    UISceneHelpers.createSceneHeader(
      this,
      layout,
      "CHOOSE YOUR THEME PARK",
      "Select a theme park to explore",
    );

    // Theme park positions
    const positions = {
      movieStudios: { x: 600, y: 275 },
      magicalLand: { x: 750, y: 475 },
    };

    // Create theme park options
    Object.keys(MapManager.themeParks).forEach(id => {
      UIButtonHelpers.createInteractiveImage(this, positions[id].x, positions[id].y, id, 250, {
        onClick: () => {
          MapManager.setSelectedThemePark(id);
          console.log(`Selected theme park: ${MapManager.themeParks[id].name} (${id})`);
          this.scene.start("MapSelectScene");
        },
      });
    });

    // Back button
    UIButtonHelpers.createBackButton(this, "MenuScene", layout.centerX, layout.height - 80);
  }
}

export default ThemeParkSelectScene;
