// Movement Simulator - Physics-accurate movement prediction
// Simulates jumps and walks to predict landing positions
// Used by movement assistance to find optimal paths

/**
 * Simulate a jump trajectory from a starting position
 * @param {Object} startPos - Starting position {x, y}
 * @param {string} direction - 'left', 'right', or 'straight'
 * @param {number} holdTime - How long to hold direction key (ms)
 * @param {Object} scene - Phaser scene (for terrain collision)
 * @returns {Object} - Landing position {x, y} and success flag
 */
export function simulateJump(startPos, direction, holdTime, scene) {
  // Phaser physics constants (match your game's actual values)
  const JUMP_VELOCITY = -550; // Initial upward velocity (negative = up in Phaser)
  const GRAVITY = 981; // Downward acceleration
  const HORIZONTAL_SPEED = 160; // Walking speed
  const TIME_STEP = 16; // 60 FPS = ~16ms per frame

  let x = startPos.x;
  let y = startPos.y;
  let velocityY = JUMP_VELOCITY;
  let velocityX = 0;

  // Apply horizontal movement based on direction
  if (direction === "left") velocityX = -HORIZONTAL_SPEED;
  if (direction === "right") velocityX = HORIZONTAL_SPEED;

  let timeElapsed = 0;

  // Simulate until landing (back at or below start height)
  const maxSimTime = 2000; // 2 second timeout
  const startY = startPos.y;

  while (timeElapsed < maxSimTime) {
    // Stop holding direction after holdTime
    if (timeElapsed >= holdTime) {
      velocityX = 0;
    }

    // Update position (physics integration)
    x += velocityX * (TIME_STEP / 1000);
    y += velocityY * (TIME_STEP / 1000);

    // Update velocity (gravity)
    velocityY += GRAVITY * (TIME_STEP / 1000);

    // Check for terrain collision (landed on platform)
    // Note: In browser context, we'll use actual terrain detection
    // For now, this is a simplified check
    if (scene && isInsideTerrainSimple({ x, y }, scene)) {
      // Hit terrain - this is landing position
      return {
        x: Math.round(x),
        y: Math.round(y),
        success: true,
        gainedHeight: y < startY, // Lower Y = higher position in Phaser
      };
    }

    // Check if we've landed (fallen back to start height or below)
    if (velocityY > 0 && y >= startY) {
      // Back at start height - check if on solid ground
      return {
        x: Math.round(x),
        y: Math.round(y),
        success: true,
        gainedHeight: false,
      };
    }

    timeElapsed += TIME_STEP;
  }

  // Timeout - return current position
  return {
    x: Math.round(x),
    y: Math.round(y),
    success: false,
    gainedHeight: false,
  };
}

/**
 * Simulate walking a certain distance
 * @param {Object} startPos - Starting position {x, y}
 * @param {string} direction - 'left' or 'right'
 * @param {number} distance - Distance to walk (px)
 * @param {Object} scene - Phaser scene (for terrain collision)
 * @returns {Object} - Ending position {x, y} and success flag
 */
export function simulateWalk(startPos, direction, distance, scene) {
  // Simple walk simulation - just offset X by distance
  // Real physics will handle terrain collision during execution

  let endX = startPos.x;

  if (direction === "left") {
    endX = Math.max(50, startPos.x - distance); // Don't go past map edge
  } else if (direction === "right") {
    endX = Math.min(1150, startPos.x + distance); // Don't go past map edge
  }

  // Check if path is clear (no terrain blocking)
  const steps = Math.ceil(Math.abs(endX - startPos.x) / 10);
  for (let i = 0; i <= steps; i++) {
    const testX = startPos.x + ((endX - startPos.x) * i) / steps;
    const testPos = { x: testX, y: startPos.y };

    if (scene && isInsideTerrainSimple(testPos, scene)) {
      // Hit terrain - stop here
      return {
        x: Math.round(testX),
        y: startPos.y,
        success: false,
        blocked: true,
      };
    }
  }

  return {
    x: Math.round(endX),
    y: startPos.y,
    success: true,
    blocked: false,
  };
}

/**
 * Simple terrain collision check (placeholder)
 * In browser context, use actual TerrainManager
 * @param {Object} pos - Position to check {x, y}
 * @param {Object} scene - Phaser scene
 * @returns {boolean} - True if inside terrain
 */
function isInsideTerrainSimple(pos, scene) {
  // This is a placeholder - in browser, use real terrain detection
  // For now, assume no terrain blocking (we'll handle this properly in browser)
  return false;
}

/**
 * Calculate duration to hold button to walk a certain distance
 * @param {number} distance - Distance to walk (px)
 * @returns {number} - Duration in ms
 */
export function calculateWalkDuration(distance) {
  const HORIZONTAL_SPEED = 160; // px/s
  return Math.abs(distance / HORIZONTAL_SPEED) * 1000; // Convert to ms
}

/**
 * Generate jump trajectory parameters for testing
 * @returns {Array} - Array of {direction, holdTime} objects
 */
export function generateJumpParameters() {
  const holdDurations = [100, 200, 300, 400, 500, 600]; // ms
  const parameters = [];

  // Generate for both directions
  for (const direction of ["left", "right"]) {
    for (const holdTime of holdDurations) {
      parameters.push({ direction, holdTime });
    }
  }

  return parameters; // 12 total combinations
}
