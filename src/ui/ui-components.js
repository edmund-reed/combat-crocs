import { Config } from "@config";

class UIComponents {
  static getAbilityName = charType => Config.CHARACTER_TYPES[charType]?.ability?.name || "Unknown";

  static tooltip(scene, x, y, text, tooltipArray) {
    const tooltip = scene.add
      .text(x + 3, y - 42, text, {
        font: "12px Arial",
        fill: "#FFF",
        stroke: "#000",
        strokeThickness: 2,
        backgroundColor: "#000",
        padding: { left: 4, right: 4, top: 2, bottom: 2 },
      })
      .setOrigin(0.5, 1);

    const arrow = scene.add.graphics().fillStyle(0x000000, 1);
    arrow.fillTriangle(x - 3, y - 42, x + 9, y - 42, x + 3, y - 34);
    tooltipArray.push(tooltip, arrow);
    return tooltip;
  }

  static colorButton = (scene, color, isSelected, x, y) =>
    scene.add
      .graphics()
      .fillStyle(color.hex)
      .fillRect(0, 0, 25, 25)
      .lineStyle(isSelected ? 3 : 1, isSelected ? 0x000000 : 0xffffff)
      .strokeRect(0, 0, 25, 25)
      .setPosition(x, y)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, 25, 25), Phaser.Geom.Rectangle.Contains);
}

export default UIComponents;
