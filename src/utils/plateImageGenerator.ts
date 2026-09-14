/**
 * Generates realistic high-contrast vehicle license plate images as base64 data URLs
 * for instant testing without needing an actual car in front of the camera.
 */
export function generateSyntheticPlateImage(
  plateText: string,
  state: string = 'IND',
  plateType: 'white' | 'yellow' = 'white'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background - car bumper context
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 240);
  bgGrad.addColorStop(0, '#1e293b');
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 640, 240);

  // License plate background with rounded border
  const plateX = 70;
  const plateY = 40;
  const plateW = 500;
  const plateH = 160;
  const radius = 12;

  // Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 6;

  ctx.beginPath();
  ctx.roundRect(plateX, plateY, plateW, plateH, radius);
  ctx.fillStyle = plateType === 'white' ? '#f8fafc' : '#fef08a';
  ctx.fill();
  ctx.restore();

  // Border outline
  ctx.beginPath();
  ctx.roundRect(plateX, plateY, plateW, plateH, radius);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#0f172a';
  ctx.stroke();

  // Left blue band (standard modern HSRP / Euro / India plate)
  const bandW = 44;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(plateX + 2, plateY + 2, bandW, plateH - 4, [radius, 0, 0, radius]);
  ctx.fillStyle = '#1d4ed8';
  ctx.fill();

  // Country text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state, plateX + bandW / 2, plateY + plateH - 18);

  // Chakra / Hologram icon
  ctx.beginPath();
  ctx.arc(plateX + bandW / 2, plateY + 32, 10, 0, Math.PI * 2);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Screw caps
  const screwColor = '#64748b';
  const drawScrew = (x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = screwColor;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();
  };
  drawScrew(plateX + 65, plateY + 24);
  drawScrew(plateX + plateW - 25, plateY + 24);

  // Main License Plate Text
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 52px "Courier New", monospace, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '4px';

  // Centered in remaining area
  const textCenterX = plateX + bandW + (plateW - bandW) / 2;
  ctx.fillText(plateText.toUpperCase(), textCenterX, plateY + plateH / 2 + 3);

  // Subtle metallic reflection sheen
  const sheen = ctx.createLinearGradient(plateX, plateY, plateX + plateW, plateY + plateH);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.roundRect(plateX, plateY, plateW, plateH, radius);
  ctx.fill();

  return canvas.toDataURL('image/jpeg', 0.92);
}
