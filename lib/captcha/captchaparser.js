import { bitmaps } from './bitmaps.js';

/**
 * Converts a base64 image string to a 2D grayscale pixel array
 * @param {string} base64Image - Base64 encoded image string
 * @returns {Promise<number[][]>} - 2D array of grayscale pixel values
 */
export async function uri_to_img_data(base64Image) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    // 3-second timeout for image loading
    const timeout = setTimeout(() => {
      reject(new Error('Image loading timeout'));
    }, 3000);
    
    img.onload = () => {
      clearTimeout(timeout);
      
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        // Convert RGBA to grayscale using formula: 0.299*R + 0.587*G + 0.114*B
        const grayscaleArray = [];
        for (let y = 0; y < canvas.height; y++) {
          const row = [];
          for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const r = pixels[index];
            const g = pixels[index + 1];
            const b = pixels[index + 2];
            
            // Apply grayscale formula
            const grayscale = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            row.push(grayscale);
          }
          grayscaleArray.push(row);
        }
        
        resolve(grayscaleArray);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Image loading failed'));
    };
    
    img.src = base64Image;
  });
}

/**
 * Removes noise from the grayscale image and converts to binary
 * @param {number[][]} imageData - 2D array of grayscale pixel values
 * @returns {number[][]} - Cleaned binary image (0 = black, 255 = white)
 */
function removeNoise(imageData) {
  const height = imageData.length;
  const width = imageData[0].length;
  const cleaned = JSON.parse(JSON.stringify(imageData)); // Deep copy
  
  // First pass: convert to binary based on threshold
  const threshold = 128;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cleaned[y][x] = imageData[y][x] < threshold ? 0 : 255;
    }
  }
  
  // Second pass: remove isolated pixels (noise reduction)
  // A pixel is isolated if it's surrounded by opposite colored pixels
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const current = cleaned[y][x];
      
      // Check 8 neighbors
      const neighbors = [
        cleaned[y-1][x-1], cleaned[y-1][x], cleaned[y-1][x+1],
        cleaned[y][x-1],                    cleaned[y][x+1],
        cleaned[y+1][x-1], cleaned[y+1][x], cleaned[y+1][x+1]
      ];
      
      // Count neighbors with opposite color
      const oppositeCount = neighbors.filter(n => n !== current).length;
      
      // If more than 6 neighbors are opposite color, this pixel is likely noise
      if (oppositeCount >= 6) {
        // Flip to opposite color (remove isolated pixel)
        cleaned[y][x] = current === 0 ? 255 : 0;
      }
    }
  }
  
  return cleaned;
}

/**
 * Matches a character segment against templates and returns best match
 * @param {number[][]} segment - 32x30 pixel segment to match
 * @param {Object} templates - Character templates to match against
 * @returns {Object} - {character, confidence} of best match
 */
function matchCharacter(segment, templates) {
  let bestMatch = null;
  let highestScore = 0;
  
  for (const [char, template] of Object.entries(templates)) {
    let matchingPixels = 0;
    let totalBlackPixels = 0;
    
    // Count total black pixels in template
    for (let y = 0; y < template.length; y++) {
      for (let x = 0; x < template[y].length; x++) {
        if (template[y][x] === 0) {
          totalBlackPixels++;
        }
      }
    }
    
    // Compare pixel by pixel
    for (let y = 0; y < Math.min(segment.length, template.length); y++) {
      for (let x = 0; x < Math.min(segment[y].length, template[y].length); x++) {
        // Match black pixels
        if (template[y][x] === 0 && segment[y][x] === 0) {
          matchingPixels++;
        }
      }
    }
    
    // Calculate match percentage: matching black pixels / total black pixels in template
    const score = totalBlackPixels > 0 ? matchingPixels / totalBlackPixels : 0;
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = char;
    }
  }
  
  return {
    character: bestMatch || '?',
    confidence: highestScore
  };
}

/**
 * Parses the CAPTCHA image and extracts the 6-character string
 * @param {number[][]} cleanedImage - Binary image data
 * @returns {string} - Extracted CAPTCHA text
 */
function captcha_parse(cleanedImage) {
  const result = [];
  const charWidth = 30; // Characters are spaced 30 pixels apart
  const segmentWidth = 32; // Each character occupies 32 pixels wide
  const segmentHeight = 30; // Character height
  
  // Extract and match each of the 6 characters
  for (let i = 0; i < 6; i++) {
    const startX = i * charWidth;
    
    // Extract character segment (32x30 pixels)
    const segment = [];
    for (let y = 0; y < Math.min(segmentHeight, cleanedImage.length); y++) {
      const row = [];
      for (let x = startX; x < Math.min(startX + segmentWidth, cleanedImage[0].length); x++) {
        row.push(cleanedImage[y][x]);
      }
      segment.push(row);
    }
    
    // Match against templates
    const match = matchCharacter(segment, bitmaps);
    result.push(match.character);
    
    console.log(`Character ${i + 1}: ${match.character} (confidence: ${(match.confidence * 100).toFixed(2)}%)`);
  }
  
  return result.join('');
}

/**
 * Main CAPTCHA solver function
 * @param {string} base64Image - Base64 encoded CAPTCHA image
 * @returns {Promise<string>} - Solved CAPTCHA text
 */
export async function solve_captcha(base64Image) {
  try {
    console.log('[CAPTCHA Solver] Starting CAPTCHA analysis...');
    
    // Step 1: Convert image to grayscale array
    const grayscaleData = await uri_to_img_data(base64Image);
    console.log(`[CAPTCHA Solver] Image converted to grayscale: ${grayscaleData[0].length}x${grayscaleData.length}`);
    
    // Step 2: Remove noise and convert to binary
    const cleanedData = removeNoise(grayscaleData);
    console.log('[CAPTCHA Solver] Noise removed and converted to binary');
    
    // Step 3: Parse and recognize characters
    const captchaText = captcha_parse(cleanedData);
    console.log(`[CAPTCHA Solver] CAPTCHA solved: ${captchaText}`);
    
    return captchaText;
  } catch (error) {
    console.error('[CAPTCHA Solver] Error solving CAPTCHA:', error);
    throw error;
  }
}

/**
 * Automatically fills the CAPTCHA input field with solved text
 * @param {string} captchaText - Solved CAPTCHA text
 */
export function fill_captcha(captchaText) {
  const captchaInput = document.getElementById('captchaCheck');
  if (captchaInput) {
    captchaInput.value = captchaText;
    captchaInput.dispatchEvent(new Event('input', { bubbles: true }));
    captchaInput.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`[CAPTCHA Solver] Filled input with: ${captchaText}`);
  } else {
    console.warn('[CAPTCHA Solver] captchaCheck input field not found');
  }
}

/**
 * Shows fallback UI for manual CAPTCHA entry
 * @param {string} base64Image - CAPTCHA image to display
 */
export function showCaptchaManualFallback(base64Image) {
  console.log('[CAPTCHA Solver] Showing manual fallback UI');
  
  // Create fallback UI
  const fallbackDiv = document.createElement('div');
  fallbackDiv.id = 'captcha-fallback';
  fallbackDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border: 2px solid #333;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
  `;
  
  fallbackDiv.innerHTML = `
    <h3>CAPTCHA Recognition Failed</h3>
    <p>Please enter the CAPTCHA manually:</p>
    <img src="${base64Image}" alt="CAPTCHA" style="display: block; margin: 10px 0; border: 1px solid #ccc;" />
    <input type="text" id="manual-captcha-input" maxlength="6" style="width: 100%; padding: 8px; font-size: 16px; margin-bottom: 10px;" />
    <button id="manual-captcha-submit" style="width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
      Submit
    </button>
  `;
  
  document.body.appendChild(fallbackDiv);
  
  // Handle manual submission
  document.getElementById('manual-captcha-submit').addEventListener('click', () => {
    const manualInput = document.getElementById('manual-captcha-input').value;
    fill_captcha(manualInput);
    document.body.removeChild(fallbackDiv);
  });
}
