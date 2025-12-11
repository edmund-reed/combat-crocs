import { Config } from "@config";
import { UIButtonHelpers, UIManager, TeamSelectorManager, UISceneHelpers } from "@ui";
import { StateManager, Maps as MapManager, shuffleArray } from "@utils";

class PlayerSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "PlayerSelectScene" });
  }

  preload() {
    // Load background and player sprites
    this.load.image("mapBg", "src/assets/map-bg.png");

    // Load all colored character sprites
    Object.values(Config.CHARACTER_TYPES).forEach(({ baseName }) =>
      ["red", "yellow", "green", "blue", "purple"].forEach(color =>
        this.load.image(`${baseName}-${color}`, `src/assets/characters/${baseName}/${baseName}-${color}.png`),
      ),
    );

    this.load.audio("introMusic", "src/assets/intro.mp3");
  }

  create() {
    const layout = UISceneHelpers.getSceneLayout(Config);

    Object.assign(this, {
      teamCount: 2,
      availableColors: [
        { name: "Red", hex: 0xff0000 },
        { name: "Yellow", hex: 0xffff00 },
        { name: "Green", hex: 0x00ff00 },
        { name: "Blue", hex: 0x0000ff },
        { name: "Purple", hex: 0x8a2be2 },
      ],
    });

    this.teams = Array.from({ length: this.teamCount }, (_, index) => {
      const id = index + 1;
      return {
        id,
        name: `Team ${id}`,
        crocCount: 1,
        color: this.availableColors[index],
        players: [{ characterType: "CROCODILE" }],
      };
    });

    const bgImage = this.add.image(layout.centerX, layout.height, "mapBg");
    bgImage
      .setScale(Math.max(layout.width / bgImage.width, layout.height / bgImage.height))
      .setOrigin(0.5, 1);

    const mapInfo = MapManager.getMapDisplayInfo(MapManager.getCurrentMap().id);

    UISceneHelpers.createStyledText(this, layout.centerX, 60, "CHOOSE YOUR CROCODILES", 32, 4);
    UISceneHelpers.createStyledText(this, layout.centerX, 98, `Map: ${mapInfo.name}`, 18, 3);

    UIManager.createTeamCountSelector(this);
    TeamSelectorManager.createTeamSelection(this);
    this.createAbilitiesDisplay();
    this.createActionButtons();

    if (this.cache.audio.exists("introMusic")) {
      this.introMusic = this.sound.add("introMusic").setLoop(true).setVolume(0.2);
      this.introMusic.play();
    }
  }

  _stopIntroMusic = () => this.introMusic?.isPlaying && this.introMusic.stop();
  clearExistingTeamUI = () => TeamSelectorManager.clearExistingTeamUI(this);

  createAbilitiesDisplay() {
    const layout = UISceneHelpers.getSceneLayout(Config);
    const yPosition = 470;

    UISceneHelpers.createStyledText(this, layout.centerX, yPosition, "ABILITIES", 20, 3);

    const colorNames = this.availableColors.map(c => Config.COLOR_NAMES[c.hex]);
    const shuffledColors = shuffleArray(colorNames);

    const characterTypes = ["CROCODILE", "DINOSAUR", "GECKO", "CHAMELEON"];
    const characters = characterTypes.map((type, index) => ({
      type,
      color: shuffledColors[index],
    }));

    const totalWidth = 600;
    const spacing = totalWidth / (characters.length - 1);
    const startX = layout.centerX - totalWidth / 2;

    characters.forEach((char, index) => {
      const x = startX + index * spacing;
      const charConfig = Config.CHARACTER_TYPES[char.type];
      const spriteKey = `${charConfig.baseName}-${char.color}`;

      this.add
        .sprite(x - 60, yPosition + 50, spriteKey)
        .setDisplaySize(32, 40)
        .setOrigin(0.5);

      UISceneHelpers.createStyledText(this, x - 25, yPosition + 50, charConfig.ability.name, 16, 2).setOrigin(
        0,
        0.5,
      );
    });
  }

  createActionButtons() {
    const layout = UISceneHelpers.getSceneLayout(Config);
    const buttonY = layout.height - 100;

    UIButtonHelpers.createStyledButton(
      this,
      layout.centerX,
      buttonY,
      "START BATTLE",
      { default: 28, hover: 32 },
      () => {
        StateManager.storeTeams(this.teams);
        this._stopIntroMusic();
        this.scene.start("GameScene");
      },
    );

    UIButtonHelpers.createStyledButton(
      this,
      layout.centerX,
      buttonY + 60,
      "Back",
      { default: 24, hover: 28 },
      () => {
        this._stopIntroMusic();
        this.scene.start("MapSelectScene");
      },
    );
  }
}

export default PlayerSelectScene;
