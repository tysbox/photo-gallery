/**
 * Kyoto Photographic Artworks Generator
 * Generates fine-art Kyoto photographic renders with atmospheric lighting,
 * traditional Rakkan seals (落款), watermarks, and splits into the exact 4 quadrants (tl, tr, bl, br)
 * plus thumbnail, matching VIDE SIGNIFIANT specifications.
 */

import { FORMAT_DIMENSIONS, Format } from '../types';

export interface GeneratedImages {
  master: string;
  thumbnail: string;
  split: [string, string, string, string]; // tl, tr, bl, br
}

interface PhotoPreset {
  id: string;
  format: Format;
  title: string;
  subtitle: string;
  primaryColor: string;
  palette: string[];
  drawArt: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

// Draw traditional Japanese red seal (落款印)
function drawRakkan(ctx: CanvasRenderingContext2D, x: number, y: number, text: string = '空') {
  ctx.save();
  const size = 32;
  ctx.fillStyle = '#b32424';
  ctx.strokeStyle = '#8c1a1a';
  ctx.lineWidth = 1.5;

  // Stamp body with slightly textured corners
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 4);
  ctx.fill();
  ctx.stroke();

  // Seal inner border
  ctx.strokeStyle = '#df4747';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(x + 3, y + 3, size - 6, size - 6);

  // Seal Kanji
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Shippori Mincho", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + size / 2, y + size / 2 + 1);

  ctx.restore();
}

// Draw subtle photographer watermark
function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, text: string = 'VIDE SIGNIFIANT') {
  ctx.save();
  ctx.font = '11px "Shippori Mincho", "Hiragino Mincho ProN", serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.letterSpacing = '0.15em';
  ctx.textAlign = 'right';
  ctx.fillText(text, w - 24, h - 20);
  ctx.restore();
}

// Fine film grain texture
function applyGrain(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number = 0.04) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const len = data.length;
  for (let i = 0; i < len; i += 4) {
    const grain = (Math.random() - 0.5) * 50 * alpha;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);
}

const PRESETS: Record<string, PhotoPreset> = {
  'KYOTO-0001': {
    id: 'KYOTO-0001',
    format: 'landscape',
    title: '嵐山 渡月橋の薄霧',
    subtitle: 'Morning Mist over Togetsukyo Bridge',
    primaryColor: '#3a4b53',
    palette: ['#1c252a', '#445660', '#7a8e99', '#cad5db'],
    drawArt: (ctx, w, h) => {
      // Sky & river gradient
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#536570');
      sky.addColorStop(0.35, '#8fa1aa');
      sky.addColorStop(0.5, '#cad4da');
      sky.addColorStop(0.65, '#495a63');
      sky.addColorStop(1, '#232e34');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Layered Arashiyama mountains in mist
      const drawMountain = (baseY: number, height: number, color: string, roughness: number) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, baseY);
        for (let x = 0; x <= w; x += 30) {
          const ny = baseY - Math.sin((x / w) * Math.PI * 1.5 + roughness) * height
            - Math.cos((x / 140)) * (height * 0.25);
          ctx.lineTo(x, ny);
        }
        ctx.lineTo(w, baseY + 60);
        ctx.lineTo(0, baseY + 60);
        ctx.closePath();
        ctx.fill();
      };

      drawMountain(h * 0.48, h * 0.35, 'rgba(40, 52, 60, 0.45)', 0.4);
      drawMountain(h * 0.52, h * 0.26, 'rgba(32, 42, 48, 0.7)', 1.2);
      drawMountain(h * 0.55, h * 0.18, 'rgba(24, 32, 38, 0.95)', 2.1);

      // Mist band across river
      const mist = ctx.createLinearGradient(0, h * 0.48, 0, h * 0.62);
      mist.addColorStop(0, 'rgba(215, 226, 232, 0)');
      mist.addColorStop(0.5, 'rgba(215, 226, 232, 0.48)');
      mist.addColorStop(1, 'rgba(215, 226, 232, 0)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, h * 0.45, w, h * 0.2);

      // Togetsukyo wooden bridge structure
      const bridgeY = h * 0.58;
      ctx.strokeStyle = '#181f22';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(w * 0.05, bridgeY);
      ctx.quadraticCurveTo(w * 0.5, bridgeY - 8, w * 0.95, bridgeY);
      ctx.stroke();

      // Handrails
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#2d3a40';
      ctx.beginPath();
      ctx.moveTo(w * 0.05, bridgeY - 14);
      ctx.quadraticCurveTo(w * 0.5, bridgeY - 22, w * 0.95, bridgeY - 14);
      ctx.stroke();

      // Bridge pillars & reflections
      for (let x = w * 0.12; x <= w * 0.88; x += w * 0.045) {
        ctx.fillStyle = '#11171a';
        ctx.fillRect(x - 2, bridgeY - 2, 4, 30);
        // Water reflection
        ctx.fillStyle = 'rgba(17, 23, 26, 0.25)';
        ctx.fillRect(x - 1.5, bridgeY + 28, 3, 24);
      }

      // River ripples
      ctx.strokeStyle = 'rgba(202, 213, 219, 0.2)';
      ctx.lineWidth = 1.2;
      for (let ry = bridgeY + 30; ry < h; ry += 12) {
        ctx.beginPath();
        ctx.moveTo(w * 0.05, ry);
        for (let rx = w * 0.05; rx < w * 0.95; rx += 40) {
          ctx.lineTo(rx + 20, ry + (Math.sin(rx * 0.05 + ry) * 2));
        }
        ctx.stroke();
      }

      drawRakkan(ctx, 40, h - 70, '霧');
      drawWatermark(ctx, w, h, 'KYOTO ARCHIVE / TOGETSUKYO');
    },
  },
  'KYOTO-0002': {
    id: 'KYOTO-0002',
    format: 'landscape',
    title: '龍安寺 方丈石庭の静寂',
    subtitle: 'Silence of Ryoan-ji Rock Garden',
    primaryColor: '#787163',
    palette: ['#2e2c28', '#5e584f', '#968f82', '#dcd8ce'],
    drawArt: (ctx, w, h) => {
      // Wall (油土塀) background with clay texture
      const wallGrad = ctx.createLinearGradient(0, 0, 0, h * 0.48);
      wallGrad.addColorStop(0, '#534d43');
      wallGrad.addColorStop(0.5, '#756c5e');
      wallGrad.addColorStop(1, '#8e8473');
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, w, h * 0.48);

      // Wall roof tiles (瓦)
      ctx.fillStyle = '#262420';
      ctx.fillRect(0, 0, w, 28);
      ctx.fillStyle = '#3a3732';
      ctx.fillRect(0, 28, w, 8);

      // Clay wall stains and age patina
      for (let x = 20; x < w; x += 45) {
        const stainH = 60 + Math.sin(x * 0.2) * 40;
        ctx.fillStyle = 'rgba(40, 36, 30, 0.22)';
        ctx.fillRect(x, 36, 25, stainH);
      }

      // Stone garden gravel bed (白砂)
      const sandGrad = ctx.createLinearGradient(0, h * 0.48, 0, h);
      sandGrad.addColorStop(0, '#cdc9bf');
      sandGrad.addColorStop(1, '#b5b0a3');
      ctx.fillStyle = sandGrad;
      ctx.fillRect(0, h * 0.48, w, h * 0.52);

      // Raked gravel waves (砂紋)
      ctx.strokeStyle = 'rgba(100, 95, 85, 0.35)';
      ctx.lineWidth = 1.6;
      for (let y = h * 0.52; y < h; y += 14) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= w; x += 20) {
          ctx.lineTo(x, y + Math.sin(x * 0.03) * 3);
        }
        ctx.stroke();
      }

      // Zen Stone Groups (石組)
      const drawStoneGroup = (cx: number, cy: number, radius: number) => {
        // Concentric raked ripples around stones
        for (let r = radius + 8; r <= radius + 40; r += 9) {
          ctx.strokeStyle = 'rgba(90, 85, 75, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(cx, cy, r * 1.5, r * 0.8, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Moss mound (苔)
        ctx.fillStyle = '#3d4d2a';
        ctx.beginPath();
        ctx.ellipse(cx, cy + radius * 0.1, radius * 1.35, radius * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dark ancient stone
        const stoneGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
        stoneGrad.addColorStop(0, '#4a4843');
        stoneGrad.addColorStop(0.6, '#282723');
        stoneGrad.addColorStop(1, '#181715');
        ctx.fillStyle = stoneGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy - radius * 0.2, radius, radius * 0.75, -0.15, 0, Math.PI * 2);
        ctx.fill();
      };

      drawStoneGroup(w * 0.28, h * 0.72, 34);
      drawStoneGroup(w * 0.33, h * 0.75, 20);
      drawStoneGroup(w * 0.72, h * 0.68, 42);
      drawStoneGroup(w * 0.78, h * 0.73, 26);
      drawStoneGroup(w * 0.67, h * 0.74, 18);

      // Veranda timber framing at very bottom
      ctx.fillStyle = '#1c1b18';
      ctx.fillRect(0, h - 22, w, 22);

      drawRakkan(ctx, 40, h - 75, '石');
      drawWatermark(ctx, w, h, 'KYOTO ARCHIVE / RYOANJI');
    },
  },
  'KYOTO-0003': {
    id: 'KYOTO-0003',
    format: 'landscape',
    title: '鴨川 黄昏と先斗町の灯',
    subtitle: 'Twilight along Kamo River & Pontocho Lanterns',
    primaryColor: '#8a4b38',
    palette: ['#161c28', '#2e3b52', '#8c4838', '#df8b42', '#f6ce83'],
    drawArt: (ctx, w, h) => {
      // Twilight sky: deep indigo to warm orange
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      sky.addColorStop(0, '#101622');
      sky.addColorStop(0.4, '#243044');
      sky.addColorStop(0.7, '#64383c');
      sky.addColorStop(0.95, '#b95b34');
      sky.addColorStop(1, '#e58e4e');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h * 0.6);

      // Far bank silhouette of Higashiyama hills
      ctx.fillStyle = '#121720';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.52);
      for (let x = 0; x <= w; x += 40) {
        ctx.lineTo(x, h * 0.52 - Math.sin(x * 0.005) * 22 - Math.cos(x * 0.02) * 8);
      }
      ctx.lineTo(w, h * 0.6);
      ctx.lineTo(0, h * 0.6);
      ctx.fill();

      // Pontocho wooden tearoom balconies (納涼床)
      ctx.fillStyle = '#0a0d13';
      ctx.fillRect(0, h * 0.44, w * 0.45, h * 0.16);

      // Warm paper lanterns glow
      for (let lx = w * 0.04; lx < w * 0.42; lx += 28) {
        const ly = h * 0.50 + Math.sin(lx) * 6;
        // Glow radius
        const glow = ctx.createRadialGradient(lx, ly, 2, lx, ly, 24);
        glow.addColorStop(0, 'rgba(255, 210, 120, 0.9)');
        glow.addColorStop(0.4, 'rgba(235, 120, 40, 0.4)');
        glow.addColorStop(1, 'rgba(200, 80, 20, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(lx - 24, ly - 24, 48, 48);

        // Lantern core
        ctx.fillStyle = '#fff4d0';
        ctx.beginPath();
        ctx.ellipse(lx, ly, 4, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Kamo River water flow & twilight reflections
      const water = ctx.createLinearGradient(0, h * 0.6, 0, h);
      water.addColorStop(0, '#2b2123');
      water.addColorStop(0.3, '#1c222e');
      water.addColorStop(1, '#0e1219');
      ctx.fillStyle = water;
      ctx.fillRect(0, h * 0.6, w, h * 0.4);

      // Lantern streak reflections in water
      for (let rx = w * 0.04; rx < w * 0.42; rx += 28) {
        const streak = ctx.createLinearGradient(rx, h * 0.6, rx, h * 0.9);
        streak.addColorStop(0, 'rgba(240, 160, 60, 0.4)');
        streak.addColorStop(1, 'rgba(200, 80, 20, 0)');
        ctx.fillStyle = streak;
        ctx.fillRect(rx - 6, h * 0.6, 12, h * 0.3);
      }

      // Soft water ripples
      ctx.strokeStyle = 'rgba(220, 140, 70, 0.18)';
      ctx.lineWidth = 1;
      for (let y = h * 0.64; y < h; y += 10) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= w; x += 30) {
          ctx.lineTo(x, y + Math.sin(x * 0.04) * 2);
        }
        ctx.stroke();
      }

      drawRakkan(ctx, w - 80, h - 80, '灯');
      drawWatermark(ctx, w, h, 'KYOTO ARCHIVE / KAMOGAWA');
    },
  },
  'KYOTO-0004': {
    id: 'KYOTO-0004',
    format: 'portrait',
    title: '嵯峨野 竹林の小径 翠緑',
    subtitle: 'Verdant Hues of the Bamboo Grove Path',
    primaryColor: '#2d4734',
    palette: ['#0f1c13', '#223827', '#456b4d', '#86aa8a', '#d2e4d4'],
    drawArt: (ctx, w, h) => {
      // Atmospheric canopy light gradient
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#6d8c72');
      bg.addColorStop(0.3, '#3b5540');
      bg.addColorStop(0.7, '#1b2d1f');
      bg.addColorStop(1, '#111a13');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Winding earthen path perspective
      ctx.fillStyle = '#655e52';
      ctx.beginPath();
      ctx.moveTo(w * 0.48, h * 0.45);
      ctx.lineTo(w * 0.52, h * 0.45);
      ctx.lineTo(w * 0.78, h);
      ctx.lineTo(w * 0.22, h);
      ctx.closePath();
      ctx.fill();

      // Earth & fallen bamboo leaf texture on path
      ctx.fillStyle = '#4e483e';
      ctx.beginPath();
      ctx.moveTo(w * 0.49, h * 0.45);
      ctx.lineTo(w * 0.51, h * 0.45);
      ctx.lineTo(w * 0.65, h);
      ctx.lineTo(w * 0.35, h);
      ctx.closePath();
      ctx.fill();

      // Bamboo fence (竹穂垣) along both borders
      const drawFence = (isLeft: boolean) => {
        const bx = isLeft ? w * 0.25 : w * 0.75;
        const tx = isLeft ? w * 0.46 : w * 0.54;
        ctx.strokeStyle = '#28231c';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(bx, h);
        ctx.lineTo(tx, h * 0.48);
        ctx.stroke();
      };
      drawFence(true);
      drawFence(false);

      // Layered tall vertical Bamboo stalks
      const stalks = [
        { x: w * 0.06, width: 28, depth: 1 },
        { x: w * 0.14, width: 22, depth: 2 },
        { x: w * 0.21, width: 34, depth: 1 },
        { x: w * 0.30, width: 16, depth: 3 },
        { x: w * 0.40, width: 12, depth: 4 },
        { x: w * 0.60, width: 14, depth: 4 },
        { x: w * 0.68, width: 24, depth: 2 },
        { x: w * 0.79, width: 32, depth: 1 },
        { x: w * 0.88, width: 20, depth: 2 },
        { x: w * 0.95, width: 36, depth: 1 },
      ];

      stalks.forEach((stalk) => {
        const grad = ctx.createLinearGradient(stalk.x - stalk.width / 2, 0, stalk.x + stalk.width / 2, 0);
        if (stalk.depth === 1) {
          grad.addColorStop(0, '#152419');
          grad.addColorStop(0.3, '#3a5a41');
          grad.addColorStop(0.7, '#608667');
          grad.addColorStop(1, '#1b2c1f');
        } else {
          grad.addColorStop(0, '#111a13');
          grad.addColorStop(0.5, '#283c2c');
          grad.addColorStop(1, '#0e1610');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(stalk.x - stalk.width / 2, 0, stalk.width, h);

        // Bamboo rings (節)
        ctx.strokeStyle = '#0d150e';
        ctx.lineWidth = 3.5;
        for (let ringY = 40 + (stalk.x % 60); ringY < h; ringY += 90) {
          ctx.beginPath();
          ctx.moveTo(stalk.x - stalk.width / 2, ringY);
          ctx.lineTo(stalk.x + stalk.width / 2, ringY - 2);
          ctx.stroke();
        }
      });

      // Sunlight filtering in rays (木漏れ日)
      const ray = ctx.createLinearGradient(w * 0.5, 0, w * 0.3, h);
      ray.addColorStop(0, 'rgba(215, 240, 215, 0.28)');
      ray.addColorStop(0.6, 'rgba(180, 220, 180, 0.08)');
      ray.addColorStop(1, 'rgba(180, 220, 180, 0)');
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.moveTo(w * 0.35, 0);
      ctx.lineTo(w * 0.65, 0);
      ctx.lineTo(w * 0.8, h);
      ctx.lineTo(w * 0.2, h);
      ctx.closePath();
      ctx.fill();

      drawRakkan(ctx, 36, h - 70, '竹');
      drawWatermark(ctx, w, h, 'KYOTO ARCHIVE / SAGANO BAMBOO');
    },
  },
  'KYOTO-0005': {
    id: 'KYOTO-0005',
    format: 'portrait',
    title: '伏見稲荷 千本鳥居の朱と影',
    subtitle: 'Vermilion & Shadows of Thousand Torii',
    primaryColor: '#b43218',
    palette: ['#150e0c', '#381610', '#9c2810', '#d8441e', '#f27848'],
    drawArt: (ctx, w, h) => {
      // Dark forest mountain background
      ctx.fillStyle = '#0f130f';
      ctx.fillRect(0, 0, w, h);

      // Torii tunnel perspective: series of vermilion arches receding into distance
      const steps = 14;
      for (let i = steps; i >= 1; i--) {
        const t = i / steps; // 1 = foreground, 0 = far distance
        const archW = w * (0.15 + t * 0.75);
        const archH = h * (0.2 + t * 0.72);
        const topY = h * 0.5 - archH * 0.5;
        const leftX = w * 0.5 - archW * 0.5;
        const rightX = w * 0.5 + archW * 0.5;
        const beamH = Math.max(4, 18 * t);
        const pillarW = Math.max(3, 20 * t);

        // Vermilion gradient
        const vGrad = ctx.createLinearGradient(leftX, 0, rightX, 0);
        vGrad.addColorStop(0, '#851b0c');
        vGrad.addColorStop(0.4, '#d83a18');
        vGrad.addColorStop(0.7, '#e65328');
        vGrad.addColorStop(1, '#781508');
        ctx.fillStyle = vGrad;

        // Top cross beam (笠木)
        ctx.fillRect(leftX - pillarW, topY, archW + pillarW * 2, beamH);

        // Second beam (貫)
        ctx.fillRect(leftX, topY + beamH * 1.6, archW, beamH * 0.7);

        // Left & right pillars
        ctx.fillRect(leftX, topY, pillarW, archH);
        ctx.fillRect(rightX - pillarW, topY, pillarW, archH);

        // Black pillar bases (台石・根巻)
        ctx.fillStyle = '#110d0c';
        const baseH = 26 * t;
        ctx.fillRect(leftX - 2, topY + archH - baseH, pillarW + 4, baseH);
        ctx.fillRect(rightX - pillarW - 2, topY + archH - baseH, pillarW + 4, baseH);
      }

      // Stone pavement in tunnel center with shadows
      ctx.fillStyle = '#3a3835';
      ctx.beginPath();
      ctx.moveTo(w * 0.44, h * 0.55);
      ctx.lineTo(w * 0.56, h * 0.55);
      ctx.lineTo(w * 0.72, h);
      ctx.lineTo(w * 0.28, h);
      ctx.closePath();
      ctx.fill();

      // Dramatic sunlight cast across paving
      const sun = ctx.createLinearGradient(0, 0, w, h);
      sun.addColorStop(0, 'rgba(255, 230, 200, 0.22)');
      sun.addColorStop(1, 'rgba(255, 230, 200, 0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, w, h);

      drawRakkan(ctx, 36, h - 70, '鳥');
      drawWatermark(ctx, w, h, 'KYOTO ARCHIVE / FUSHIMI INARI');
    },
  },
  'KYOTO-0006': {
    id: 'KYOTO-0006',
    format: 'portrait',
    title: '祇園白川 雨情の石畳と柳',
    subtitle: 'Rain-washed Cobblestones, Gion Shirakawa',
    primaryColor: '#3d4b4a',
    palette: ['#121818', '#2b3838', '#4c6260', '#839d9b', '#dbe5e4'],
    drawArt: (ctx, w, h) => {
      // Rainy mist atmosphere
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#586b6a');
      bg.addColorStop(0.4, '#384646');
      bg.addColorStop(1, '#1b2222');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Traditional Machiya wood facade on right
      ctx.fillStyle = '#1c1714';
      ctx.fillRect(w * 0.55, h * 0.1, w * 0.45, h * 0.6);

      // Fine wooden lattice (千本格子)
      ctx.strokeStyle = '#342c26';
      ctx.lineWidth = 2;
      for (let lx = w * 0.58; lx < w; lx += 10) {
        ctx.beginPath();
        ctx.moveTo(lx, h * 0.22);
        ctx.lineTo(lx, h * 0.55);
        ctx.stroke();
      }

      // Warm interior lamp glowing through lattice
      const warm = ctx.createRadialGradient(w * 0.72, h * 0.36, 10, w * 0.72, h * 0.36, 120);
      warm.addColorStop(0, 'rgba(255, 200, 100, 0.6)');
      warm.addColorStop(1, 'rgba(255, 140, 50, 0)');
      ctx.fillStyle = warm;
      ctx.fillRect(w * 0.55, h * 0.2, w * 0.45, h * 0.4);

      // Weeping willow branches (柳) draping from top left
      ctx.strokeStyle = '#2b3a2a';
      ctx.lineWidth = 1.6;
      for (let bx = 0; bx < w * 0.45; bx += 24) {
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.bezierCurveTo(bx + 20, h * 0.2, bx - 10, h * 0.35, bx + 15, h * 0.5);
        ctx.stroke();
      }

      // Rain-washed wet granite cobblestones (石畳)
      const stoneGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
      stoneGrad.addColorStop(0, '#2e3838');
      stoneGrad.addColorStop(1, '#141a1a');
      ctx.fillStyle = stoneGrad;
      ctx.fillRect(0, h * 0.55, w, h * 0.45);

      // Cobblestone grid and wet reflections
      for (let y = h * 0.58; y < h; y += 22) {
        ctx.strokeStyle = 'rgba(18, 24, 24, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();

        // Wet stone highlights
        ctx.strokeStyle = 'rgba(200, 225, 225, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y - 2);
        ctx.lineTo(w, y - 2);
        ctx.stroke();
      }

      // Soft rain streaks
      ctx.strokeStyle = 'rgba(220, 240, 240, 0.14)';
      ctx.lineWidth = 1;
      for (let r = 0; r < 140; r++) {
        const rx = Math.random() * w;
        const ry = Math.random() * h;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 8, ry + 24);
        ctx.stroke();
      }

      drawRakkan(ctx, 36, h - 70, '雨');
      drawWatermark(ctx, w, h, 'KYOTO ARCHIVE / GION SHIRAKAWA');
    },
  },
  'KYOTO-0007': {
    id: 'KYOTO-0007',
    format: 'square',
    title: '建仁寺 苔と白砂の波紋',
    subtitle: 'Dry Landscape: Moss & White Gravel Patterns',
    primaryColor: '#5a6352',
    palette: ['#1e221b', '#394234', '#5e6b56', '#9aa892', '#dce3d8'],
    drawArt: (ctx, w, h) => {
      // Overall square Zen garden frame
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 40, w * 0.5, h * 0.5, w * 0.7);
      bg.addColorStop(0, '#d8d4c8');
      bg.addColorStop(0.7, '#beb8a9');
      bg.addColorStop(1, '#8e8877');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Concentric circular gravel raking (円心砂紋)
      for (let r = 50; r < w * 0.65; r += 16) {
        ctx.strokeStyle = 'rgba(90, 85, 75, 0.38)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(w * 0.45, h * 0.45, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Organic moss island in center
      ctx.fillStyle = '#3a4e28';
      ctx.beginPath();
      ctx.ellipse(w * 0.45, h * 0.45, w * 0.22, h * 0.16, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Deep green moss variation
      ctx.fillStyle = '#26361a';
      ctx.beginPath();
      ctx.ellipse(w * 0.47, h * 0.46, w * 0.16, h * 0.11, 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Natural stone in center
      const sGrad = ctx.createLinearGradient(w * 0.4, h * 0.35, w * 0.52, h * 0.5);
      sGrad.addColorStop(0, '#5a554d');
      sGrad.addColorStop(0.6, '#2e2c28');
      sGrad.addColorStop(1, '#171614');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.ellipse(w * 0.46, h * 0.42, w * 0.08, h * 0.06, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Single scarlet maple leaf (紅葉) resting on gravel
      ctx.fillStyle = '#b3261a';
      ctx.beginPath();
      ctx.ellipse(w * 0.68, h * 0.65, 12, 7, 0.6, 0, Math.PI * 2);
      ctx.fill();

      drawRakkan(ctx, 36, h - 70, '静');
      drawWatermark(ctx, w, h, 'KYOTO ARCHIVE / KENNINJI');
    },
  },
  'KYOTO-0008': {
    id: 'KYOTO-0008',
    format: 'square',
    title: '冬景 金閣寺 冠雪と鏡湖池',
    subtitle: 'Golden Pavilion in Snow with Mirror Reflection',
    primaryColor: '#c49a45',
    palette: ['#161922', '#2f3542', '#a0833a', '#e8c468', '#f5f7fa'],
    drawArt: (ctx, w, h) => {
      // Winter grey sky
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      sky.addColorStop(0, '#5c6470');
      sky.addColorStop(1, '#9aa1aa');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h * 0.5);

      // Mirrored lake (Kyoko-chi)
      const water = ctx.createLinearGradient(0, h * 0.5, 0, h);
      water.addColorStop(0, '#2b3038');
      water.addColorStop(0.5, '#191d22');
      water.addColorStop(1, '#0e1114');
      ctx.fillStyle = water;
      ctx.fillRect(0, h * 0.5, w, h * 0.5);

      // Kinkaku-ji Silhouette & Gold leaf structure
      const pw = w * 0.48;
      const ph = h * 0.32;
      const px = w * 0.26;
      const py = h * 0.22;

      // Tier 1 (Dark wood)
      ctx.fillStyle = '#221e1a';
      ctx.fillRect(px + pw * 0.05, py + ph * 0.65, pw * 0.9, ph * 0.35);

      // Tier 2 & 3 (Gilded gold)
      const gold = ctx.createLinearGradient(px, py, px + pw, py + ph);
      gold.addColorStop(0, '#d4a23a');
      gold.addColorStop(0.5, '#f5d372');
      gold.addColorStop(1, '#ad7d24');
      ctx.fillStyle = gold;
      ctx.fillRect(px + pw * 0.12, py + ph * 0.3, pw * 0.76, ph * 0.35);
      ctx.fillRect(px + pw * 0.22, py + ph * 0.08, pw * 0.56, ph * 0.22);

      // Pure white snow on curved roofs (冠雪)
      ctx.fillStyle = '#ffffff';
      // Lower roof
      ctx.beginPath();
      ctx.moveTo(px - 10, py + ph * 0.65);
      ctx.quadraticCurveTo(px + pw / 2, py + ph * 0.58, px + pw + 10, py + ph * 0.65);
      ctx.lineTo(px + pw + 10, py + ph * 0.68);
      ctx.quadraticCurveTo(px + pw / 2, py + ph * 0.61, px - 10, py + ph * 0.68);
      ctx.fill();

      // Middle roof
      ctx.beginPath();
      ctx.moveTo(px + pw * 0.08, py + ph * 0.3);
      ctx.quadraticCurveTo(px + pw / 2, py + ph * 0.25, px + pw * 0.92, py + ph * 0.3);
      ctx.lineTo(px + pw * 0.92, py + ph * 0.33);
      ctx.quadraticCurveTo(px + pw / 2, py + ph * 0.28, px + pw * 0.08, py + ph * 0.33);
      ctx.fill();

      // Top roof pyramid & phoenix (鳳凰)
      ctx.beginPath();
      ctx.moveTo(px + pw * 0.18, py + ph * 0.08);
      ctx.lineTo(px + pw / 2, py - 4);
      ctx.lineTo(px + pw * 0.82, py + ph * 0.08);
      ctx.fill();

      // Gold Phoenix finial
      ctx.fillStyle = '#f0c85c';
      ctx.beginPath();
      ctx.arc(px + pw / 2, py - 6, 4, 0, Math.PI * 2);
      ctx.fill();

      // Inverted water reflection with shimmer
      const refl = ctx.createLinearGradient(px, h * 0.5, px, h * 0.85);
      refl.addColorStop(0, 'rgba(245, 211, 114, 0.45)');
      refl.addColorStop(0.5, 'rgba(180, 130, 40, 0.2)');
      refl.addColorStop(1, 'rgba(180, 130, 40, 0)');
      ctx.fillStyle = refl;
      ctx.fillRect(px + pw * 0.1, h * 0.5, pw * 0.8, h * 0.35);

      drawRakkan(ctx, 36, h - 70, '雪');
      drawWatermark(ctx, w, h, 'KYOTO ARCHIVE / KINKAKUJI');
    },
  },
  'KYOTO-0009': {
    id: 'KYOTO-0009',
    format: 'square',
    title: '町家 坪庭の蹲踞と陰翳',
    subtitle: 'Machiya Courtyard Stone Basin & Shadows',
    primaryColor: '#363430',
    palette: ['#0f0e0d', '#22201d', '#423e38', '#736d63', '#b8b2a5'],
    drawArt: (ctx, w, h) => {
      // Deep Junichiro Tanizaki "In Praise of Shadows" (陰翳礼讃) darkness
      ctx.fillStyle = '#11100e';
      ctx.fillRect(0, 0, w, h);

      // Tatami frame border & sliding shoji door frame
      ctx.strokeStyle = '#282520';
      ctx.lineWidth = 24;
      ctx.strokeRect(12, 12, w - 24, h - 24);

      // Courtyard gravel and stepping stones (坪庭)
      const gardenGrad = ctx.createRadialGradient(w * 0.5, h * 0.52, 20, w * 0.5, h * 0.52, w * 0.45);
      gardenGrad.addColorStop(0, '#3e3b35');
      gardenGrad.addColorStop(0.6, '#262420');
      gardenGrad.addColorStop(1, '#11100e');
      ctx.fillStyle = gardenGrad;
      ctx.fillRect(30, 30, w - 60, h - 60);

      // Ancient stone tsukubai basin (蹲踞)
      const bx = w * 0.5;
      const by = h * 0.54;
      const br = w * 0.18;

      ctx.fillStyle = '#22201c';
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();

      // Water hollow inside stone
      const waterGrad = ctx.createRadialGradient(bx, by, 2, bx, by, br * 0.7);
      waterGrad.addColorStop(0, '#4b5757');
      waterGrad.addColorStop(0.8, '#182020');
      waterGrad.addColorStop(1, '#0e1212');
      ctx.fillStyle = waterGrad;
      ctx.beginPath();
      ctx.arc(bx, by, br * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Slender bamboo water spout (筧)
      ctx.strokeStyle = '#6e6245';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.38);
      ctx.lineTo(bx - 6, by - 6);
      ctx.stroke();

      // Water drip ripple in center of basin
      ctx.strokeStyle = 'rgba(180, 220, 220, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(bx, by, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Single floating Camellia blossom (椿)
      ctx.fillStyle = '#c22d25';
      ctx.beginPath();
      ctx.arc(bx + 16, by - 12, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f0d040';
      ctx.beginPath();
      ctx.arc(bx + 16, by - 12, 2.5, 0, Math.PI * 2);
      ctx.fill();

      drawRakkan(ctx, 36, h - 70, '幽');
      drawWatermark(ctx, w, h, 'KYOTO ARCHIVE / TSUKIKAGE');
    },
  },
};

/**
 * Renders master canvas and cuts it into 4 quadrant tiles + thumbnail.
 */
export async function generatePhotoTiles(id: string, customImage?: HTMLImageElement): Promise<GeneratedImages> {
  const preset = PRESETS[id];
  const format: Format = preset ? preset.format : 'landscape';
  const { w, h } = FORMAT_DIMENSIONS[format];

  // 1. Create Master Canvas
  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = w;
  masterCanvas.height = h;
  const ctx = masterCanvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  if (customImage) {
    ctx.drawImage(customImage, 0, 0, w, h);
    drawRakkan(ctx, 36, h - 70, '写');
    drawWatermark(ctx, w, h, 'VIDE SIGNIFIANT');
  } else if (preset) {
    preset.drawArt(ctx, w, h);
    applyGrain(ctx, w, h, 0.035);
  } else {
    // Default fallback
    ctx.fillStyle = '#3a3832';
    ctx.fillRect(0, 0, w, h);
    drawRakkan(ctx, 36, h - 70, '空');
    drawWatermark(ctx, w, h, 'KYOTO ARCHIVE');
  }

  const masterDataUrl = masterCanvas.toDataURL('image/webp', 0.92);

  // 2. Cut 4 Quadrants: tl, tr, bl, br
  const hw = Math.floor(w / 2);
  const hh = Math.floor(h / 2);

  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = hw;
  tileCanvas.height = hh;
  const tileCtx = tileCanvas.getContext('2d');
  if (!tileCtx) throw new Error('Tile canvas context not available');

  const tiles = [
    { name: 'tl', left: 0, top: 0 },
    { name: 'tr', left: hw, top: 0 },
    { name: 'bl', left: 0, top: hh },
    { name: 'br', left: hw, top: hh },
  ];

  const splitDataUrls: [string, string, string, string] = ['', '', '', ''];

  for (let i = 0; i < 4; i++) {
    const { left, top } = tiles[i];
    tileCtx.clearRect(0, 0, hw, hh);
    tileCtx.drawImage(masterCanvas, left, top, hw, hh, 0, 0, hw, hh);
    splitDataUrls[i] = tileCanvas.toDataURL('image/webp', 0.92);
  }

  // 3. Generate Thumbnail (Long edge: 480)
  const thumbLong = 480;
  const thumbW = w >= h ? thumbLong : Math.round((thumbLong * w) / h);
  const thumbH = w < h ? thumbLong : Math.round((thumbLong * h) / w);

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = thumbW;
  thumbCanvas.height = thumbH;
  const thumbCtx = thumbCanvas.getContext('2d');
  if (thumbCtx) {
    thumbCtx.drawImage(masterCanvas, 0, 0, w, h, 0, 0, thumbW, thumbH);
  }
  const thumbDataUrl = thumbCanvas.toDataURL('image/webp', 0.88);

  return {
    master: masterDataUrl,
    thumbnail: thumbDataUrl,
    split: splitDataUrls,
  };
}

/**
 * Client-side processor for any user-uploaded image file.
 * Verifies 16:9, 3:4, or 1:1 within 2% tolerance and returns 4-split WebP data URLs.
 */
export async function processUploadedImage(
  file: File,
  targetFormat?: Format,
  options?: { watermarkText?: string; rakkanChar?: string; authorName?: string }
): Promise<{
  images: GeneratedImages;
  detectedFormat: Format;
  aspectRatio: number;
  toleranceDiff: number;
  isWithinTolerance: boolean;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        const origW = img.naturalWidth;
        const origH = img.naturalHeight;
        const ratio = origW / origH;

        // Detect best matching format
        let bestFormat: Format = 'landscape';
        let minDiff = Infinity;

        const formats: Format[] = ['landscape', 'portrait', 'square'];
        for (const f of formats) {
          const dim = FORMAT_DIMENSIONS[f];
          const expectedRatio = dim.w / dim.h;
          const diff = Math.abs(ratio - expectedRatio) / expectedRatio;
          if (diff < minDiff) {
            minDiff = diff;
            bestFormat = f;
          }
        }

        const finalFormat = targetFormat || bestFormat;
        const dim = FORMAT_DIMENSIONS[finalFormat];
        const isWithinTolerance = minDiff <= 0.02;

        // Render to target dimensions
        const masterCanvas = document.createElement('canvas');
        masterCanvas.width = dim.w;
        masterCanvas.height = dim.h;
        const ctx = masterCanvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context failure'));
          return;
        }

        ctx.drawImage(img, 0, 0, dim.w, dim.h);

        // Apply optional Rakkan and watermark
        if (options?.rakkanChar) {
          drawRakkan(ctx, 36, dim.h - 70, options.rakkanChar);
        }
        if (options?.watermarkText) {
          drawWatermark(ctx, dim.w, dim.h, options.watermarkText);
        }

        const masterDataUrl = masterCanvas.toDataURL('image/webp', 0.92);

        // Cut into 4 quadrants
        const hw = Math.floor(dim.w / 2);
        const hh = Math.floor(dim.h / 2);
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = hw;
        tileCanvas.height = hh;
        const tileCtx = tileCanvas.getContext('2d')!;

        const tiles = [
          { left: 0, top: 0 },
          { left: hw, top: 0 },
          { left: 0, top: hh },
          { left: hw, top: hh },
        ];

        const splitDataUrls: [string, string, string, string] = ['', '', '', ''];
        for (let i = 0; i < 4; i++) {
          const { left, top } = tiles[i];
          tileCtx.clearRect(0, 0, hw, hh);
          tileCtx.drawImage(masterCanvas, left, top, hw, hh, 0, 0, hw, hh);
          splitDataUrls[i] = tileCanvas.toDataURL('image/webp', 0.92);
        }

        // Thumbnail
        const thumbLong = 480;
        const thumbW = dim.w >= dim.h ? thumbLong : Math.round((thumbLong * dim.w) / dim.h);
        const thumbH = dim.w < dim.h ? thumbLong : Math.round((thumbLong * dim.h) / dim.w);

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbW;
        thumbCanvas.height = thumbH;
        const thumbCtx = thumbCanvas.getContext('2d')!;
        thumbCtx.drawImage(masterCanvas, 0, 0, dim.w, dim.h, 0, 0, thumbW, thumbH);
        const thumbDataUrl = thumbCanvas.toDataURL('image/webp', 0.88);

        resolve({
          images: {
            master: masterDataUrl,
            thumbnail: thumbDataUrl,
            split: splitDataUrls,
          },
          detectedFormat: bestFormat,
          aspectRatio: ratio,
          toleranceDiff: minDiff,
          isWithinTolerance,
        });
      };
      img.onerror = () => reject(new Error('Failed to load image file'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
