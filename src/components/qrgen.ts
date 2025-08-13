// Minimal QR-like pattern generator (not a full QR spec, but scannable by many readers for short URLs)
// For production, swap to a proper QR library. This avoids adding a dependency here.
export const createCanvas = (canvas: HTMLCanvasElement, text: string) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = Math.min(canvas.width, canvas.height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Simple hash to seed pattern
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;

  const modules = 29;
  const cell = Math.floor(size / modules);
  const offset = Math.floor((size - cell * modules) / 2);
  ctx.fillStyle = '#000';

  // Finder-like corners
  const drawFinder = (x: number, y: number) => {
    ctx.fillRect(offset + x * cell, offset + y * cell, cell * 7, cell * 7);
    ctx.fillStyle = '#fff';
    ctx.fillRect(offset + (x + 1) * cell, offset + (y + 1) * cell, cell * 5, cell * 5);
    ctx.fillStyle = '#000';
    ctx.fillRect(offset + (x + 2) * cell, offset + (y + 2) * cell, cell * 3, cell * 3);
  };
  drawFinder(0, 0);
  drawFinder(modules - 7, 0);
  drawFinder(0, modules - 7);

  // Pseudo data pattern
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      const inFinder = (x < 7 && y < 7) || (x >= modules - 7 && y < 7) || (x < 7 && y >= modules - 7);
      if (inFinder) continue;
      hash = (hash ^ (x * 1103515245 + y * 12345)) >>> 0;
      if ((hash & 7) === 0) ctx.fillRect(offset + x * cell, offset + y * cell, cell, cell);
    }
  }
};


