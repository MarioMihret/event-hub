const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate noise texture
const width = 400;
const height = 400;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Fill with subtle noise
const imageData = ctx.createImageData(width, height);
const data = imageData.data;

for (let i = 0; i < data.length; i += 4) {
  // Random grayscale value
  const value = Math.floor(Math.random() * 255);
  data[i] = value;     // R
  data[i + 1] = value; // G
  data[i + 2] = value; // B
  data[i + 3] = 25;   // Alpha (low opacity)
}

ctx.putImageData(imageData, 0, 0);

// Save the image
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(path.join(publicDir, 'noise.png'), buffer);

console.log('Generated noise.png in public directory'); 