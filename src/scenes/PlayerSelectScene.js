import { Config } from "@config";
import { UIButtonHelpers, UIManager, TeamSelectorManager, UISceneHelpers } from "@ui";
import { StateManager, Maps as MapManager } from "@utils";

class PlayerSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "PlayerSelectScene" });
  }

  preload() {
    this.load.image("mapBg", "src/assets/backgrounds/map-bg.png");
    Object.values(Config.CHARACTER_TYPES).forEach(({ baseName }) =>
      Config.COLOR_NAMES.forEach(({ key }) =>
        this.load.image(`${baseName}-${key}`, `src/assets/characters/${baseName}/${baseName}-${key}.png`),
      ),
    );
    this.load.audio("introMusic", "src/assets/intro.mp3");
  }

  create() {
    const layout = UISceneHelpers.getSceneLayout(Config);

    Object.assign(this, {
      teamCount: 2,
      availableColors: Config.COLOR_NAMES,
      teams: Array.from({ length: 2 }, (_, i) => ({
        id: i + 1,
        name: `Team ${i + 1}`,
        crocCount: 1,
        color: Config.COLOR_NAMES[i],
        players: [{ characterType: "CROCODILE" }],
      })),
    });

    UISceneHelpers.setupScaledBackground(this, "mapBg", layout);
    UISceneHelpers.styledText(this, layout.centerX, 60, "CHOOSE YOUR CROCODILES", 32, 4);
    UISceneHelpers.styledText(this, layout.centerX, 98, `Map: ${MapManager.getCurrentMap().name}`, 18, 3);
    UIManager.createTeamCountSelector(this);
    TeamSelectorManager.createTeamSelection(this);

    this.createAbilitiesDisplay(layout);
    this.createActionButtons(layout);

    if (this.cache.audio.exists("introMusic")) {
      this.introMusic = this.sound.add("introMusic").setLoop(true).setVolume(0.2);
      this.introMusic.play();
    }
  }

  stopIntroMusic = () => this.introMusic?.stop?.();
  clearExistingTeamUI = () => TeamSelectorManager.clearExistingTeamUI(this);

  createAbilitiesDisplay(layout) {
    const y = 470;
    UISceneHelpers.styledText(this, layout.centerX, y, "ABILITIES", 20, 3);

    const types = Object.keys(Config.CHARACTER_TYPES);
    const colors = Phaser.Utils.Array.Shuffle([...Config.COLOR_NAMES]);
    const startX = layout.centerX - 300;
    const spacing = 600 / (types.length - 1);

    types.forEach((type, i) => {
      const x = startX + i * spacing;
      const cfg = Config.CHARACTER_TYPES[type];
      const key = `${cfg.baseName}-${colors[i % colors.length].key}`;

      this.add
        .sprite(x - 60, y + 50, key)
        .setDisplaySize(32, 40)
        .setOrigin(0.5);
      UISceneHelpers.styledText(this, x - 25, y + 50, cfg.ability.name, 16, 2).setOrigin(0, 0.5);
    });
  }

  createActionButtons(layout) {
    const y = layout.height - 100;
    const nav =
      (scene, stop = true) =>
      () => {
        if (stop) this.stopIntroMusic();
        this.scene.start(scene);
      };

    UIButtonHelpers.createStyledButton(this, layout.centerX, y, "START BATTLE", [28, 32], () => {
      StateManager.storeTeams(this.teams);
      nav("GameScene")();
    });
    UIButtonHelpers.createStyledButton(this, layout.centerX, y + 60, "Back", [24, 28], nav("MapSelectScene"));
  }
}

export default PlayerSelectScene;
