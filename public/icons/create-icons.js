// Generator ikon za pomocą Canvas w Node.js
const fs = require('fs');
const { createCanvas } = require('canvas');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Gradient tło
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#FF69B4');
  gradient.addColorStop(1, '#FF1493');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Białe kółko
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/3, 0, 2 * Math.PI);
  ctx.fill();
  
  // Tekst T2M
  ctx.fillStyle = '#FF69B4';
  ctx.font = `bold ${size/6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('T2M', size/2, size/2);
  
  // Zapisz plik
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icon-${size}x${size}.png`, buffer);
  console.log(`Created icon-${size}x${size}.png`);
});
EOF < /dev/null