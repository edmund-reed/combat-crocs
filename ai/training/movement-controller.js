// Movement Controller - Execute real movement in browser
// Handles button presses, timing, and physics execution

/**
 * Apply movement controls to browser (hold buttons for duration)
 * @param {Object} page - Puppeteer page
 * @param {Object} controls - { left, right, jump }
 * @param {number} durationMs - How long to hold (ms)
 */
export async function applyMovementControls(page, controls, durationMs) {
  // Set button states to "down"
  await page.evaluate(ctrl => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    if (!scene?.cursors) return;

    // Hold arrow keys
    if (ctrl.left) scene.cursors.left.isDown = true;
    if (ctrl.right) scene.cursors.right.isDown = true;

    // Press jump (one-time, not held)
    if (ctrl.jump && scene.spaceKey) {
      scene.spaceKey.isDown = true;
    }
  }, controls);

  // Wait for movement to occur (YOU SEE THIS in headed mode!)
  await delay(durationMs);

  // Release buttons
  await page.evaluate(ctrl => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    if (!scene?.cursors) return;

    scene.cursors.left.isDown = false;
    scene.cursors.right.isDown = false;

    // Release jump after movement completes
    if (ctrl.jump && scene.spaceKey) {
      scene.spaceKey.isDown = false;
    }
  }, controls);
}

/**
 * Execute walk movement (left or right)
 * @param {Object} page - Puppeteer page
 * @param {string} direction - 'left' or 'right'
 * @param {number} distance - Distance to walk (px)
 */
export async function executeWalk(page, direction, distance) {
  // Calculate duration based on walking speed
  const HORIZONTAL_SPEED = 160; // px/s
  const duration = Math.abs(distance / HORIZONTAL_SPEED) * 1000; // Convert to ms

  const controls = {
    left: direction === "left",
    right: direction === "right",
    jump: false,
  };

  await applyMovementControls(page, controls, duration);
}

/**
 * Execute jump with direction hold
 * @param {Object} page - Puppeteer page
 * @param {string} direction - 'left', 'right', or 'straight'
 * @param {number} holdTime - How long to hold direction (ms)
 */
export async function executeJump(page, direction, holdTime) {
  const controls = {
    left: direction === "left",
    right: direction === "right",
    jump: true,
  };

  // Hold jump + direction for specified time
  await applyMovementControls(page, controls, holdTime);

  // Wait for landing (gravity brings player down)
  // Full jump arc is ~1 second
  await delay(1000 - holdTime);
}

/**
 * Get current player position from browser
 * @param {Object} page - Puppeteer page
 * @returns {Object} - Current position {x, y}
 */
export async function getCurrentPlayerPosition(page) {
  return await page.evaluate(() => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    const playerIndex = scene.turnManager.getCurrentPlayerIndex();
    const currentPlayer = scene.players[playerIndex];

    return {
      x: Math.round(currentPlayer.x),
      y: Math.round(currentPlayer.y),
    };
  });
}

/**
 * Calculate distance between two positions
 * @param {Object} pos1 - First position {x, y}
 * @param {Object} pos2 - Second position {x, y}
 * @returns {number} - Distance in pixels
 */
export function distance(pos1, pos2) {
  return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
}

/**
 * Simple delay helper
 * @param {number} ms - Milliseconds to wait
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
