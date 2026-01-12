// Character templates for CAPTCHA recognition
// Each template is a 32x30 pixel bitmap where 0 = black pixel, 255 = white pixel
// Generated from VIT CAPTCHA samples with dimensions 180x45px, 6 characters, 30px intervals

export const bitmaps = {
  // Placeholder templates - should be populated with actual character bitmaps
  // Each character is 32x30 pixels
  // 0 = black pixel, 255 = white pixel (grayscale)
  
  '0': Array(30).fill(0).map(() => Array(32).fill(128)),
  '1': Array(30).fill(0).map(() => Array(32).fill(128)),
  '2': Array(30).fill(0).map(() => Array(32).fill(128)),
  '3': Array(30).fill(0).map(() => Array(32).fill(128)),
  '4': Array(30).fill(0).map(() => Array(32).fill(128)),
  '5': Array(30).fill(0).map(() => Array(32).fill(128)),
  '6': Array(30).fill(0).map(() => Array(32).fill(128)),
  '7': Array(30).fill(0).map(() => Array(32).fill(128)),
  '8': Array(30).fill(0).map(() => Array(32).fill(128)),
  '9': Array(30).fill(0).map(() => Array(32).fill(128)),
  
  // Letter characters (A-Z, excluding O)
  'A': Array(30).fill(0).map(() => Array(32).fill(128)),
  'B': Array(30).fill(0).map(() => Array(32).fill(128)),
  'C': Array(30).fill(0).map(() => Array(32).fill(128)),
  'D': Array(30).fill(0).map(() => Array(32).fill(128)),
  'E': Array(30).fill(0).map(() => Array(32).fill(128)),
  'F': Array(30).fill(0).map(() => Array(32).fill(128)),
  'G': Array(30).fill(0).map(() => Array(32).fill(128)),
  'H': Array(30).fill(0).map(() => Array(32).fill(128)),
  'I': Array(30).fill(0).map(() => Array(32).fill(128)),
  'J': Array(30).fill(0).map(() => Array(32).fill(128)),
  'K': Array(30).fill(0).map(() => Array(32).fill(128)),
  'L': Array(30).fill(0).map(() => Array(32).fill(128)),
  'M': Array(30).fill(0).map(() => Array(32).fill(128)),
  'N': Array(30).fill(0).map(() => Array(32).fill(128)),
  // 'O': Excluded per specs
  'P': Array(30).fill(0).map(() => Array(32).fill(128)),
  'Q': Array(30).fill(0).map(() => Array(32).fill(128)),
  'R': Array(30).fill(0).map(() => Array(32).fill(128)),
  'S': Array(30).fill(0).map(() => Array(32).fill(128)),
  'T': Array(30).fill(0).map(() => Array(32).fill(128)),
  'U': Array(30).fill(0).map(() => Array(32).fill(128)),
  'V': Array(30).fill(0).map(() => Array(32).fill(128)),
  'W': Array(30).fill(0).map(() => Array(32).fill(128)),
  'X': Array(30).fill(0).map(() => Array(32).fill(128)),
  'Y': Array(30).fill(0).map(() => Array(32).fill(128)),
  'Z': Array(30).fill(0).map(() => Array(32).fill(128))
};

/**
 * Function to add or update a character template
 * @param {string} char - Character symbol
 * @param {number[][]} template - 32x30 pixel array
 */
export function addCharacterTemplate(char, template) {
  if (!bitmaps[char]) {
    console.warn(`Adding new character template for: ${char}`);
  }
  bitmaps[char] = template;
}
