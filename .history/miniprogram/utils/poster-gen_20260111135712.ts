// miniprogram/utils/poster-gen.ts

const CTX_WIDTH = 600; // 虚拟画布宽度，用于计算比例
let scale = 1;

// 初始化 Canvas 图片对象
const createImage = (canvas: any, src: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const img = canvas.createImage();
    img.onload = () => resolve(img);
    img.onerror = (e: any) => reject(e);
    img.src = src;
  });
};

// 绘制圆角矩形（支持自定义锯齿底边）
const drawCardPath = (ctx: any, x: number, y: number, w: number, h: number, r: number, zigzag = false) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0); // 右上角
  ctx.lineTo(x + w, y + h - (zigzag ? 10 * scale : 0)); // 右边线
  
  if (zigzag) {
    // 绘制底部锯齿
    const teethCount = 20; // 锯齿数量
    const toothW = w / teethCount;
    const toothH = 8 * scale;
    const bottomY = y + h - toothH;
    
    for (let i = teethCount; i > 0; i--) {
      // 从右向左画
      ctx.lineTo(x + i * toothW - toothW / 2, bottomY + toothH);
      ctx.lineTo(x + (i - 1) * toothW, bottomY);
    }
  } else {
    ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    ctx.lineTo(x + r, y + h);
  }

  if (!zigzag) ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI); // 左下角（非锯齿时）
  ctx.lineTo(x, y + r); // 左边线
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 3 / 2); // 左上角
  ctx.closePath();
};

export const drawPoster = async (canvas: any, ctx: any, data: any, ui: any) => {
  // 1. 设置基础比例
  const dpr = wx.getSystemInfoSync().pixelRatio;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  scale = width / 375; // 基于 iPhone 屏幕宽度的缩放比例
  
  ctx.clearRect(0, 0, width, height);

  // --- 2. 绘制全屏背景图 ---
  try {
    // 这里的背景图路径需要确保是本地路径或已下载的临时路径
    // 如果是网络图片，在外层先用 wx.getImageInfo 下载
    const bgImg = await createImage(canvas, ui.poster.bg_image);
    
    // 模拟 object-fit: cover
    const imgRatio = bgImg.width / bgImg.height;
    const canvasRatio = width / height;
    let sx, sy, sw, sh;
    
    if (imgRatio > canvasRatio) {
      sh = bgImg.height;
      sw = sh * canvasRatio;
      sx = (bgImg.width - sw) / 2;
      sy = 0;
    } else {
      sw = bgImg.width;
      sh = sw / canvasRatio;
      sx = 0;
      sy = (bgImg.height - sh) / 2;
    }
    
    // 绘制背景 + 模糊遮罩
    ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, width, height);
    
    // 叠加一层白色半透明遮罩 (模拟 bg-blur)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 0, width, height);
    
  } catch (e) {
    // 降级：纯色背景
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
  }

  // --- 3. 绘制白色卡片主体 ---
  const cardX = 20 * scale;
  const cardY = 60 * scale;
  const cardW = width - 40 * scale;
  // 计算卡片高度 (根据内容动态，这里先预估一个足够长的，或者分段画)
  // 为了简单，我们画一个很长的卡片，覆盖大部分屏幕
  const cardH = height - 140 * scale; 

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#FFFFFF';
  drawCardPath(ctx, cardX, cardY, cardW, cardH, 12 * scale, true); // true = 开启锯齿
  ctx.fill();
  ctx.restore();

  // --- 4. 绘制卡片内容 ---
  let cursorY = cardY + 50 * scale; // 当前绘制光标 Y 坐标

  // A. Header (MBTI Type)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#333333';
  ctx.font = `bold ${48 * scale}px sans-serif`;
  ctx.fillText(ui.poster.type || 'MBTI', width / 2, cursorY);
  
  cursorY += 35 * scale;
  // Role Title
  ctx.font = `bold ${18 * scale}px sans-serif`;
  ctx.fillStyle = '#666666';
  ctx.fillText(ui.poster.title || 'Role', width / 2, cursorY);

  cursorY += 40 * scale;
  // Slogan
  ctx.font = `italic ${14 * scale}px sans-serif`;
  ctx.fillStyle = '#999999';
  const slogan = `"${ui.poster.life_script || ''}"`;
  ctx.fillText(slogan, width / 2, cursorY);

  // B. Trends Section (进度条对比)
  cursorY += 40 * scale;
  const barWidth = 140 * scale;
  const barHeight = 8 * scale;
  const trends = ui.trends || [];

  trends.forEach((item: any) => {
    const rowY = cursorY;
    const centerX = width / 2;

    // 左侧文字
    ctx.font = `${20 * scale}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(item.leftChar, centerX - barWidth/2 - 15 * scale, rowY + 8*scale);

    // 右侧文字
    ctx.textAlign = 'left';
    ctx.fillText(item.rightChar, centerX + barWidth/2 + 15 * scale, rowY + 8*scale);

    // 进度条背景
    ctx.fillStyle = '#EEE';
    ctx.beginPath();
    ctx.roundRect(centerX - barWidth/2, rowY, barWidth, barHeight, [4*scale]);
    ctx.fill();

    // 进度条 Fill
    ctx.fillStyle = '#333';
    const fillW = barWidth * ((100 - item.score) / 100); // 反向逻辑同 WXML
    ctx.beginPath();
    ctx.roundRect(centerX - barWidth/2, rowY, fillW, barHeight, [4*scale]);
    ctx.fill();

    // 进度点 Dot
    ctx.beginPath();
    ctx.arc(centerX - barWidth/2 + fillW, rowY + barHeight/2, 6*scale, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#333';
    ctx.stroke();

    cursorY += 45 * scale; // 行高
  });

  // C. 撕裂线 (Tear Line)
  cursorY += 10 * scale;
  const tearY = cursorY;
  
  // 虚线
  ctx.beginPath();
  ctx.setLineDash([8 * scale, 6 * scale]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#DDD';
  ctx.moveTo(cardX + 20*scale, tearY);
  ctx.lineTo(cardX + cardW - 20*scale, tearY);
  ctx.stroke();
  ctx.setLineDash([]); // 重置

  // 左右缺口 (用背景色覆盖)
  // 注意：这里我们用 globalCompositeOperation = 'destination-out' 来挖空，或者直接画背景色圆
  // 由于我们画了阴影，挖空比较麻烦，直接画两个小黑圆模拟切口 (颜色同背景遮罩色)
  // 如果背景复杂，最好是用 clip，这里简化处理，画两个白色半圆覆盖虚线端点
  // 实际上 WXML 里是 notch-l 和 notch-r，这里画实心圆模拟
  ctx.fillStyle = '#333'; // 缺口颜色，实际上应该透明。简单起见，不画缺口，只画虚线即可，或者：
  
  // D. 灵魂配方 (Stickers)
  cursorY += 50 * scale;
  ctx.textAlign = 'center';
  ctx.font = `bold ${16 * scale}px sans-serif`;
  ctx.fillStyle = '#333';
  ctx.fillText('✨ 你的专属灵魂配方 ✨', width / 2, cursorY);

  cursorY += 40 * scale;
  const stickers = data.stickers || []; // 注意这里传入的 processedStickers
  
  // 简单排版：一行两个或三个
  // 为了复刻 WXML 的随机旋转，我们需要保存之前的随机值
  stickers.forEach((sticker: any, index: number) => {
    // 简易排列逻辑：只画前3个，水平居中分布
    if (index > 2) return; 
    
    const gap = 100 * scale;
    const itemX = (width / 2) + (index - 1) * gap;
    const itemY = cursorY;

    ctx.save();
    ctx.translate(itemX, itemY);
    // 解析 rotate 字符串 "rotate(-2.5deg)" -> -2.5
    let angle = 0;
    if (sticker.randomStyle) {
        const match = sticker.randomStyle.match(/rotate\(([-\d.]+)deg\)/);
        if (match) angle = parseFloat(match[1]) * Math.PI / 180;
    }
    ctx.rotate(angle);

    // 绘制贴纸背景 (根据 type 换色)
    ctx.fillStyle = sticker.type === 'highlight' ? '#FFE15D' : '#F0F0F0';
    if (sticker.type === 'outline') {
        ctx.fillStyle = '#FFF';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
    }
    
    // 绘制贴纸矩形
    const textW = ctx.measureText(sticker.text).width + 30 * scale;
    ctx.beginPath();
    ctx.roundRect(-textW/2, -15*scale, textW, 30*scale, [4*scale]);
    ctx.fill();
    if (sticker.type === 'outline') ctx.stroke();

    // 绘制文字
    ctx.fillStyle = '#333';
    ctx.font = `${12 * scale}px sans-serif`;
    ctx.fillText(sticker.text, 0, 4*scale); // 垂直居中微调

    ctx.restore();
  });

  // E. 总结文字 (Summary)
  cursorY += 60 * scale;
  const summary = ui.poster.summary || '';
  ctx.font = `${14 * scale}px sans-serif`;
  ctx.fillStyle = '#555';
  ctx.textAlign = 'left';
  const padding = 50 * scale;
  drawWrappedText(ctx, summary, cardX + padding, cursorY, cardW - padding * 2, 24 * scale);

  // F. 底部二维码 (QR Code) - 放在卡片内底部
  // 假设二维码图也是传入的
  const qrSize = 80 * scale;
  const qrY = cardY + cardH - qrSize - 40 * scale;
  
  // 如果你有小程序码图片路径，这里绘制
  // ctx.drawImage(qrImg, width/2 - qrSize/2, qrY, qrSize, qrSize);
  
  // 占位符：画一个灰色框
  ctx.fillStyle = '#EEE';
  ctx.fillRect(width/2 - qrSize/2, qrY, qrSize, qrSize);
  
  ctx.textAlign = 'center';
  ctx.font = `${10 * scale}px sans-serif`;
  ctx.fillStyle = '#999';
  ctx.fillText('长按识别测试', width/2, qrY + qrSize + 15 * scale);
  
  return true;
};

// 辅助：文字换行
function drawWrappedText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const chars = text.split('');
  let line = '';
  
  for (let n = 0; n < chars.length; n++) {
    const testLine = line + chars[n];
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = chars[n];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}