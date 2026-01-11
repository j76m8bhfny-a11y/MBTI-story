// miniprogram/utils/poster-gen.ts

// 1. 定义兼容性更好的圆角矩形绘制函数 (解决 roundRect 报错)
const drawRoundRectPath = (ctx: any, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
  ctx.lineTo(x + w, y + h - r);
  ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 3 / 2);
  ctx.closePath();
};

// 2. 绘制卡片轮廓（含底部锯齿）
const drawZigzagCard = (ctx: any, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
  
  // 右侧边线
  ctx.lineTo(x + w, y + h - 10); 

  // 底部锯齿 (Zigzag)
  const teethCount = 25; 
  const toothW = w / teethCount;
  const toothH = 6;
  for (let i = teethCount; i > 0; i--) {
    ctx.lineTo(x + i * toothW - toothW / 2, y + h + toothH);
    ctx.lineTo(x + (i - 1) * toothW, y + h - toothH / 4); // 微调锯齿深度
  }

  // 左侧边线
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 3 / 2);
  ctx.closePath();
};

// 3. 文字自动换行
const drawWrappedText = (ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
  if (!text) return y;
  const chars = text.split('');
  let line = '';
  let currentY = y;
  
  for (let n = 0; n < chars.length; n++) {
    const testLine = line + chars[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = chars[n];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY + lineHeight; // 返回下一行的 Y 坐标
};

// 4. 加载图片辅助函数
const createImage = (canvas: any, src: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const img = canvas.createImage();
    img.onload = () => resolve(img);
    img.onerror = (e: any) => reject(e);
    img.src = src;
  });
};

// === 主绘图函数 ===
export const drawPoster = async (canvas: any, ctx: any, drawData: any, ui: any) => {
  const dpr = wx.getSystemInfoSync().pixelRatio;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  const scale = width / 375; // 基于 iPhone 屏幕宽度的缩放基准
  
  // 重置画布
  ctx.clearRect(0, 0, width, height);
  
  // --- A. 绘制背景 (Background) ---
  // 绘制米色底色 (作为图片加载失败的兜底)
  ctx.fillStyle = '#FFFDF5';
  ctx.fillRect(0, 0, width, height);

  if (ui.poster?.bg_image) {
    try {
      const bgImg = await createImage(canvas, ui.poster.bg_image);
      // 模拟 object-fit: cover
      const imgRatio = bgImg.width / bgImg.height;
      const canvasRatio = width / height;
      let sx, sy, sw, sh;
      if (imgRatio > canvasRatio) {
        sh = bgImg.height; sw = sh * canvasRatio;
        sx = (bgImg.width - sw) / 2; sy = 0;
      } else {
        sw = bgImg.width; sh = sw / canvasRatio;
        sx = 0; sy = (bgImg.height - sh) / 2;
      }
      ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, width, height);
      
      // 叠加白色半透明遮罩 (模拟 bg-blur 效果)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // 调整透明度以控制背景淡化程度
      ctx.fillRect(0, 0, width, height);
    } catch (e) {
      console.warn('背景图绘制失败', e);
    }
  }

  // --- B. 绘制卡片主体 (Card Body) ---
  const cardX = 20 * scale;
  const cardY = 50 * scale;
  const cardW = width - 40 * scale;
  const cardH = height - 120 * scale; // 卡片高度

  ctx.save();
  // 卡片阴影
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 20 * scale;
  ctx.shadowOffsetY = 8 * scale;
  
  ctx.fillStyle = '#FFFFFF';
  drawZigzagCard(ctx, cardX, cardY, cardW, cardH, 16 * scale);
  ctx.fill();
  ctx.restore();

  let cursorY = cardY + 60 * scale;

  // --- C. Header区域 ---
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 1. MBTI Type (e.g. "INTP")
  ctx.fillStyle = '#222';
  ctx.font = `900 ${48 * scale}px "PingFang SC", sans-serif`; // 加粗
  ctx.fillText(ui.poster.type || 'MBTI', width / 2, cursorY);
  
  // 装饰星星 ✨ (简单的黄色文字替代)
  ctx.font = `${24 * scale}px sans-serif`;
  ctx.fillText('✨', width / 2 + 80 * scale, cursorY - 20 * scale);

  cursorY += 40 * scale;

  // 2. Role Title (e.g. "逻辑学家")
  ctx.fillStyle = '#666';
  ctx.font = `bold ${18 * scale}px sans-serif`;
  ctx.fillText(ui.poster.title || 'Role', width / 2, cursorY);

  cursorY += 40 * scale;

  // 3. Slogan (e.g. "真理在大炮射程之内")
  const slogan = ui.poster.life_script ? `“ ${ui.poster.life_script} ”` : '';
  ctx.fillStyle = '#888';
  ctx.font = `italic ${14 * scale}px sans-serif`; // 斜体
  // 绘制 Slogan 背景框 (可选，为了还原 box 效果)
  // 这里简化为直接绘制文字
  drawWrappedText(ctx, slogan, width/2, cursorY, cardW - 60*scale, 20*scale);
  
  // 更新 cursorY (这里简单估算行高)
  cursorY += 30 * scale; 


  // --- D. 趋势条区域 (Trends) ---
  // 复刻 WXML 里的 .trends-section
  const trends = ui.trends || [];
  const barWidth = 160 * scale;
  const barHeight = 6 * scale;
  
  cursorY += 20 * scale;

  trends.forEach((item: any) => {
    // 每一行的中心 Y
    const rowY = cursorY;
    
    // 1. 左右文字
    ctx.font = `bold ${14 * scale}px sans-serif`;
    ctx.fillStyle = '#333';
    ctx.textAlign = 'right';
    ctx.fillText(item.leftChar, width/2 - barWidth/2 - 15*scale, rowY + 3*scale);
    
    ctx.textAlign = 'left';
    ctx.fillText(item.rightChar, width/2 + barWidth/2 + 15*scale, rowY + 3*scale);

    // 2. 进度条背景 (灰色槽)
    ctx.fillStyle = '#F0F0F0';
    drawRoundRectPath(ctx, width/2 - barWidth/2, rowY, barWidth, barHeight, 3*scale);
    ctx.fill();

    // 3. 进度条 Fill (黑色实心)
    // 逻辑：style="width: {{100 - item.score}}%;" implies filling from left
    // WXML 是反直觉的，如果 100-score 是宽度，那 score 越小宽度越大 (偏左)
    // 假设 item.score 是右侧属性的得分 (0-100)
    const fillPercent = (100 - item.score) / 100;
    const fillW = Math.max(barWidth * fillPercent, 6*scale); // 最小宽度保证圆角

    ctx.fillStyle = '#333333';
    drawRoundRectPath(ctx, width/2 - barWidth/2, rowY, fillW, barHeight, 3*scale);
    ctx.fill();

    // 4. 浮动胶囊 (Pill) - 还原 "优势/劣势" 标签
    // 位置：left: {{100 - item.score}}%
    const pillX = (width/2 - barWidth/2) + fillW;
    const pillY = rowY - 18 * scale; // 在进度条上方

    if (item.statusText) {
      ctx.save();
      // 胶囊背景
      // 根据 pillClass 决定颜色，这里简化逻辑：优势=黑底，劣势=灰底
      const isAdvantage = item.pillClass === 'advantage';
      ctx.fillStyle = isAdvantage ? '#333' : '#EEE';
      const pillText = item.statusText;
      ctx.font = `${10 * scale}px sans-serif`;
      const textMetrics = ctx.measureText(pillText);
      const pillW = textMetrics.width + 12 * scale;
      const pillH = 16 * scale;
      
      // 绘制胶囊
      drawRoundRectPath(ctx, pillX - pillW/2, pillY, pillW, pillH, 8*scale);
      ctx.fill();

      // 小三角 (指向下方)
      ctx.beginPath();
      ctx.moveTo(pillX, pillY + pillH);
      ctx.lineTo(pillX - 3*scale, pillY + pillH + 3*scale);
      ctx.lineTo(pillX + 3*scale, pillY + pillH + 3*scale);
      ctx.fill();

      // 胶囊文字
      ctx.fillStyle = isAdvantage ? '#FFF' : '#666';
      ctx.textAlign = 'center';
      ctx.fillText(pillText, pillX, pillY + pillH/2 + 1*scale);
      ctx.restore();
    }

    cursorY += 50 * scale; // 下一行间距
  });


  // --- E. 撕裂线 (Tear Line) & 缺口 (Notch) ---
  cursorY += 10 * scale;
  const tearY = cursorY;

  // 1. 虚线
  ctx.beginPath();
  ctx.strokeStyle = '#DDD';
  ctx.lineWidth = 1;
  ctx.setLineDash([5 * scale, 5 * scale]); // 虚线样式
  ctx.moveTo(cardX + 20 * scale, tearY);
  ctx.lineTo(cardX + cardW - 20 * scale, tearY);
  ctx.stroke();
  ctx.setLineDash([]); // 重置实线

  // 2. 左右缺口 (Notches)
  // 原理：在边缘画一个半圆，颜色填充为背景色 (模拟挖空)
  // 如果背景是复杂的图片，这里画纯色可能遮不住。
  // 最佳方案：使用 destination-out 擦除 (但需要注意图层)。
  // 简单方案：因为我们在纯色/模糊背景上，画一个稍微深一点的颜色模拟阴影，或者画背景色。
  // 这里我们画两个实心半圆，颜色取背景的主色调 '#FFFDF5' 
  // (如果背景是图，这里会露馅，但在海报生成场景通常能接受)
  ctx.fillStyle = '#FFFDF5'; // 与最底层背景同色
  
  // 左缺口
  ctx.beginPath();
  ctx.arc(cardX, tearY, 10 * scale, -Math.PI/2, Math.PI/2);
  ctx.fill();
  // 补一个内阴影圆弧线条增加立体感
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(cardX, tearY, 10 * scale, -Math.PI/2, Math.PI/2);
  ctx.stroke();

  // 右缺口
  ctx.beginPath();
  ctx.arc(cardX + cardW, tearY, 10 * scale, Math.PI/2, Math.PI*3/2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cardX + cardW, tearY, 10 * scale, Math.PI/2, Math.PI*3/2);
  ctx.stroke();


  // --- F. 灵魂配方 (Stickers) ---
  cursorY += 50 * scale;
  ctx.fillStyle = '#333';
  ctx.font = `bold ${16 * scale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('✨ 你的专属灵魂配方 ✨', width / 2, cursorY);

  cursorY += 40 * scale;
  
  // 绘制贴纸
  const stickers = drawData.stickers || [];
  stickers.forEach((sticker: any, index: number) => {
    if (index > 2) return; // 只画前3个
    
    // 简易排布：三个横向排列
    const gap = 100 * scale;
    const itemX = (width / 2) + (index - 1) * gap; // 居中分布
    const itemY = cursorY;

    ctx.save();
    ctx.translate(itemX, itemY);
    
    // 解析旋转角度
    let angle = 0;
    if (sticker.randomStyle) {
      const match = sticker.randomStyle.match(/rotate\(([-\d.]+)deg\)/);
      if (match) angle = parseFloat(match[1]) * Math.PI / 180;
    }
    ctx.rotate(angle);

    // 绘制贴纸背景
    const textStr = sticker.text || '';
    ctx.font = `${12 * scale}px sans-serif`;
    const textW = ctx.measureText(textStr).width + 24 * scale;
    const textH = 28 * scale;

    // 样式判断
    if (sticker.type === 'highlight') {
      ctx.fillStyle = '#FFE15D'; // 黄色高亮
      drawRoundRectPath(ctx, -textW/2, -textH/2, textW, textH, 6*scale);
      ctx.fill();
      ctx.fillStyle = '#333'; // 文字色
    } else if (sticker.type === 'outline') {
      ctx.fillStyle = '#FFF';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      drawRoundRectPath(ctx, -textW/2, -textH/2, textW, textH, 6*scale);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#333';
    } else {
      // 默认灰底
      ctx.fillStyle = '#F5F5F5';
      drawRoundRectPath(ctx, -textW/2, -textH/2, textW, textH, 6*scale);
      ctx.fill();
      ctx.fillStyle = '#666';
    }

    // 绘制文字
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(textStr, 0, 0);

    ctx.restore();
  });


  // --- G. 总结 (Note Box) ---
  cursorY += 50 * scale;
  const padding = 30 * scale;
  const noteW = cardW - padding * 2;
  
  ctx.fillStyle = '#555';
  ctx.textAlign = 'left';
  ctx.font = `${14 * scale}px sans-serif`;
  ctx.textBaseline = 'top'; // 换行函数需要 top 基线
  
  // 这里的 drawWrappedText 会返回绘制结束后的 Y 坐标
  cursorY = drawWrappedText(ctx, ui.poster.summary || '', cardX + padding, cursorY, noteW, 24 * scale);

  
  // --- H. 签名与日期 (Signature) ---
  // 放在锯齿上方一点
  const bottomY = cardY + cardH - 50 * scale; 
  
  ctx.textAlign = 'left';
  ctx.fillStyle = '#CCC'; // 浅灰色分割线
  ctx.fillRect(cardX + padding, bottomY - 15 * scale, noteW, 1); // 分割线
  
  ctx.font = `bold ${12 * scale}px "Courier New", monospace`; // 等宽字体更有签名感
  ctx.fillStyle = '#999';
  
  // Signature
  ctx.fillText('Signature: @LifeMBTI_AI', cardX + padding, bottomY);
  
  // Date
  const dateStr = new Date().toLocaleDateString().replace(/\//g, '.'); // 2026.1.7 格式
  ctx.textAlign = 'right';
  ctx.fillText(`Date: ${dateStr}`, cardX + cardW - padding, bottomY);


  // --- I. 底部二维码 (QR Code) ---
  // 画在卡片锯齿下方，或者卡片内部右下角？
  // 标准做法：海报底部预留区域。
  // 我们在卡片下方画二维码
  
  const qrY = cardY + cardH + 20 * scale;
  const qrSize = 80 * scale;
  
  // 绘制二维码占位符 (如果有真实二维码图片路径，需先 createImage)
  ctx.fillStyle = '#FFF';
  drawRoundRectPath(ctx, width/2 - qrSize/2, qrY, qrSize, qrSize, 8*scale);
  ctx.fill(); // 白底

  // 模拟二维码内容 (深色方块)
  ctx.fillStyle = '#333';
  ctx.fillRect(width/2 - qrSize/2 + 5, qrY + 5, qrSize - 10, qrSize - 10);
  
  ctx.fillStyle = '#999';
  ctx.font = `${10 * scale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('长按识别，测测你的灵魂', width/2, qrY + qrSize + 20 * scale);

  return true;
};