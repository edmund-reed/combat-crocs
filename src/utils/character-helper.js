import { Config } from "@config";

// Character Helper - Centralized character sprite logic
export class CharacterHelper {
  // Get sprite key for a character type and color
  static getSpriteKey(characterType, colorHex = null) {
    if (!characterType || !Config.CHARACTER_TYPES[characterType]) {
      return "croc-red"; // Default fallback
    }

    const { baseName } = Config.CHARACTER_TYPES[characterType];
    const colorName = Config.COLOR_NAMES.find(c => c.hex === colorHex)?.key || "red";

    return `${baseName}-${colorName}`;
  }
}
