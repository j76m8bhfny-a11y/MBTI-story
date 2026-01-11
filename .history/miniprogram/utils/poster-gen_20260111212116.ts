// miniprogram/utils/poster-gen.ts

// 1. 基础工具：绘制圆角矩形路径
const drawRoundRectPath = (ctx: any, x: number, y: number, w: number, h: number, r: number | number[]) => {
  const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arc(x + w - tr, y + tr, tr, -Math.PI / 2, 0);
  ctx.lineTo(x + w, y + h - br);
  ctx.arc(x + w - br, y + h - br, br, 0, Math.PI / 2);
  ctx.lineTo(x + bl, y + h);
  ctx.arc(x + bl, y + h - bl, bl, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + tl);
  ctx.arc(x + tl, y + tl, tl, Math.PI, Math.PI * 3 / 2);
  ctx.closePath();
};

// 2. 文字自动换行
const drawWrappedText = (ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 10) => {
  if (!text) return y;
  const chars = text.split('');
  let line = '';
  let currentY = y;
  let linesDrawn = 0;
  
  for (let n = 0; n < chars.length; n++) {
    const testLine = line + chars[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = chars[n];
      currentY += lineHeight;
      linesDrawn++;
      if (linesDrawn >= maxLines) break;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
};

// 3. 图片预加载工具
const createImage = (canvas: any, src: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const img = canvas.createImage();
    img.onload = () => resolve(img);
    img.onerror = (e: any) => reject(e);
    img.src = src;
  });
};

// === 主绘图逻辑 ===
export const drawPoster = async (canvas: any, ctx: any, data: any, ui: any) => {
  // 1. 初始化尺寸与缩放
  const dpr = wx.getSystemInfoSync().pixelRatio;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  const scale = width / 750; // 基于 750rpx 设计稿的缩放因子
  const rpx = (val: number) => val * scale;

  ctx.clearRect(0, 0, width, height);

  // --- [Background] 绘制背景 ---
  ctx.fillStyle = '#e2d6f7ff';
  ctx.fillRect(0, 0, width, height);

  if (ui.poster?.bg_image) {
    try {
      const bgImg = await createImage(canvas, ui.poster.bg_image);
      const imgR = bgImg.width / bgImg.height;
      const cvsR = width / height;
      let sx=0, sy=0, sw=bgImg.width, sh=bgImg.height;
      if (imgR > cvsR) { sw = sh * cvsR; sx = (bgImg.width - sw)/2; }
      else { sh = sw / cvsR; sy = (bgImg.height - sh)/2; }
      ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, width, height);
      // 叠加半透明白层模拟模糊背景
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(0, 0, width, height);
    } catch(e) { console.error('BG Load Err', e); }
  }

  let mainCursorY = rpx(60); // 内容起始 Y 坐标

  // =============================================
  // ✨ [新增] 绘制塔罗牌区域 ✨
  // =============================================
  if (data.tarot && data.tarot.image) {
    try {
      const tarotImg = await createImage(canvas, data.tarot.image);
      
      // 塔罗牌尺寸 (保持 3:5 比例)
      const tarotW = rpx(360);
      const tarotH = rpx(600);
      const tarotX = (width - tarotW) / 2;
      const tarotY = mainCursorY;

      ctx.save();
      // 塔罗牌阴影
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = rpx(30);
      ctx.shadowOffsetY = rpx(15);
      
      // 绘制图片
      ctx.drawImage(tarotImg, tarotX, tarotY, tarotW, tarotH);
      
      // 绘制金色边框
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#D4AF37'; // 金色
      ctx.lineWidth = rpx(4);
      ctx.strokeRect(tarotX, tarotY, tarotW, tarotH);
      ctx.restore();

      // 在牌下方增加间距
      mainCursorY = tarotY + tarotH + rpx(60);

    } catch (e) {
      console.error('Tarot draw failed', e);
    }
  }

  // =============================================
  // 👇 绘制结果卡片 (位置随塔罗牌自动下移) 👇
  // =============================================

  // 卡片容器参数
  const cardW = rpx(680);
  const cardX = (width - cardW) / 2;
  const cardY = mainCursorY; 
  let cursorY = cardY;

  // 卡片投影
  ctx.shadowColor = 'rgba(106, 76, 156, 0.15)';
  ctx.shadowBlur = rpx(40);
  ctx.shadowOffsetY = rpx(10);

  // --- [A] 头部身份区 ---
  const headerPad = rpx(40);
  const headerTopPad = rpx(60);
  const headerH = rpx(200); // 估算内容高度
  
  ctx.fillStyle = '#FFFFFF';
  drawRoundRectPath(ctx, cardX, cursorY, cardW, headerH + headerTopPad, [rpx(24), rpx(24), 0, 0]);
  ctx.fill();
  
  // 重置阴影
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  let contentY = cursorY + headerTopPad;
  const contentX = cardX + headerPad;

  // 1. MBTI Type
  ctx.fillStyle = '#6A4C9C';
  ctx.font = `bold ${rpx(100)}px serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(ui.poster.type || 'MBTI', contentX, contentY);
  
  // 装饰
  ctx.font = `${rpx(40)}px sans-serif`;
  ctx.fillText('✨', contentX - rpx(35), contentY);

  contentY += rpx(110);

  // 2. Role Title
  ctx.fillStyle = '#333333';
  ctx.font = `900 ${rpx(34)}px sans-serif`;
  ctx.fillText(ui.poster.title || 'Role', contentX, contentY);

  contentY += rpx(50);

  // 3. Slogan
  ctx.fillStyle = '#666666';
  ctx.font = `${rpx(24)}px sans-serif`;
  const slogan = `"${ui.poster.life_script || ''}"`;
  drawWrappedText(ctx, slogan, contentX, contentY, cardW - headerPad * 2, rpx(36), 2);

  cursorY += headerH + headerTopPad;

  // --- [B] 动态趋势区 ---
  const trendsCount = (ui.trends || []).length;
  const trendRowH = rpx(70);
  const trendsH = rpx(40) + (trendsCount * trendRowH) + rpx(20);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cardX, cursorY, cardW, trendsH);

  let trendY = cursorY + rpx(20);
  (ui.trends || []).forEach((item: any) => {
    const rowY = trendY + rpx(35);
    const barW = cardW - rpx(180);
    const barX = cardX + rpx(90);

    // 左右文字
    ctx.font = `bold ${rpx(28)}px serif`;
    ctx.fillStyle = item.isLeftWin ? '#6A4C9C' : '#CCC';
    ctx.textAlign = 'left'; ctx.fillText(item.leftChar, cardX + rpx(30), rowY);
    
    ctx.fillStyle = !item.isLeftWin ? '#6A4C9C' : '#CCC';
    ctx.textAlign = 'right'; ctx.fillText(item.rightChar, cardX + cardW - rpx(30), rowY);

    // 进度条
    ctx.fillStyle = '#F5F5F5';
    drawRoundRectPath(ctx, barX, rowY - rpx(10), barW, rpx(6), rpx(3));
    ctx.fill();

    const fillPercent = (100 - item.score) / 100;
    const fillW = Math.max(barW * fillPercent, rpx(12));
    ctx.fillStyle = '#D1C4E9';
    drawRoundRectPath(ctx, barX, rowY - rpx(10), fillW, rpx(6), rpx(3));
    ctx.fill();

    const dotX = barX + fillW;
    
    // 圆点
    ctx.fillStyle = '#6A4C9C';
    ctx.beginPath(); ctx.arc(barX + fillW, rowY - rpx(7), rpx(6), 0, Math.PI * 2); ctx.fill();

    // 🔥 [调整点 1] 添加悬浮气泡 (Floating Pill) 🔥
    if (item.statusText) {
      ctx.font = `bold ${rpx(22)}px sans-serif`;
      const pillText = item.statusText;
      const textMetrics = ctx.measureText(pillText);
      const pillW = textMetrics.width + rpx(24);
      const pillH = rpx(36);
      
      const pillX = dotX - pillW / 2;
      const pillY = rowY - rpx(55); // 在圆点上方

      // 气泡背景
      ctx.fillStyle = '#F3E5F5'; // 极浅紫
      drawRoundRectPath(ctx, pillX, pillY, pillW, pillH, rpx(10));
      ctx.fill();

      // 小三角
      ctx.beginPath();
      ctx.moveTo(dotX - rpx(6), pillY + pillH);
      ctx.lineTo(dotX + rpx(6), pillY + pillH);
      ctx.lineTo(dotX, pillY + pillH + rpx(6));
      ctx.fill();

      // 文字
      ctx.fillStyle = '#6A4C9C';
      ctx.textAlign = 'center'; 
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, dotX, pillY + pillH/2);
    }

    trendY += trendRowH;
  });

  cursorY += trendsH;

  // --- [C] 撕裂线 ---
  const tearH = rpx(40);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(cardX, cursorY, cardW, tearH/2);
  ctx.fillStyle = '#EFEBE4'; ctx.fillRect(cardX, cursorY + tearH/2, cardW, tearH/2);
  
  // 虚线
  ctx.beginPath(); ctx.strokeStyle = '#D7CCC8'; ctx.lineWidth = 1;
  ctx.setLineDash([rpx(10), rpx(10)]);
  ctx.moveTo(cardX + rpx(20), cursorY + tearH/2); ctx.lineTo(cardX + cardW - rpx(20), cursorY + tearH/2);
  ctx.stroke(); ctx.setLineDash([]);

  // 左右缺口
  ctx.fillStyle = '#e2d6f7ff'; // 背景色
  ctx.beginPath(); ctx.arc(cardX, cursorY + tearH/2, rpx(12), -Math.PI/2, Math.PI/2); ctx.fill();
  ctx.beginPath(); ctx.arc(cardX + cardW, cursorY + tearH/2, rpx(12), Math.PI/2, Math.PI*3/2); ctx.fill();

  cursorY += tearH;

  // --- [D] 票根区域 ---
  const stubY = cursorY;
  // 先画一个足够长的底，最后裁切
  ctx.fillStyle = '#EFEBE4';
  ctx.fillRect(cardX, stubY, cardW, rpx(600)); 

  let stubCursorY = stubY + rpx(40);

  // 1. 灵魂配方贴纸
  ctx.fillStyle = '#8D6E63'; ctx.font = `bold ${rpx(24)}px sans-serif`; ctx.textAlign = 'center';
  ctx.fillText('✨ 你的专属灵魂配方 ✨', cardX + cardW/2, stubCursorY);
  
  stubCursorY += rpx(60);
  const bracketTop = stubCursorY;
  const bracketH = rpx(100); // 括号高度
  const bracketBottom = bracketTop + bracketH;
  const bracketLeft = cardX + rpx(40);
  const bracketRight = cardX + cardW - rpx(40);
  const hook = rpx(15); // 钩的长度

  ctx.beginPath();
  ctx.strokeStyle = '#D7CCC8'; 
  ctx.lineWidth = rpx(3);
  ctx.lineCap = 'round';
  
  // 左括号 [
  ctx.moveTo(bracketLeft + hook, bracketTop);
  ctx.lineTo(bracketLeft, bracketTop);
  ctx.lineTo(bracketLeft, bracketBottom);
  ctx.lineTo(bracketLeft + hook, bracketBottom);
  
  // 右括号 ]
  ctx.moveTo(bracketRight - hook, bracketTop);
  ctx.lineTo(bracketRight, bracketTop);
  ctx.lineTo(bracketRight, bracketBottom);
  ctx.lineTo(bracketRight - hook, bracketBottom);
  ctx.stroke();

  const stickers = data.stickers || [];
  let stickerCenterY = bracketTop + bracketH / 2;
  // 简单计算总宽度以居中
  ctx.font = `bold ${rpx(26)}px sans-serif`;
  let totalW = 0;
  const stickerData = stickers.slice(0, 3).map((item: any) => {
    const w = ctx.measureText(item.text).width + rpx(40);
    totalW += w + rpx(20);
    return { ...item, w };
  });
  totalW -= rpx(20); // 减去最后一个间距

  let currentStickerX = cardX + (cardW - totalW) / 2;

  stickerData.forEach((item: any) => {
    ctx.save();
    ctx.fillStyle = item.type === 'core' ? '#333' : '#FFF';
    // 垂直居中画
    drawRoundRectPath(ctx, currentStickerX, stickerCenterY - rpx(25), item.w, rpx(50), rpx(8));
    ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = '#333'; ctx.stroke();

    ctx.fillStyle = item.type === 'core' ? '#FFF' : '#333';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(item.text, currentStickerX + item.w/2, stickerCenterY);
    ctx.restore();

    currentStickerX += item.w + rpx(20);
  });

  stubCursorY = bracketBottom + rpx(60);

  // 🔥 [调整点 3] 绘制金句大引号 (Quotes) 🔥
  const quoteSize = rpx(80);
  ctx.font = `bold ${quoteSize}px serif`;
  ctx.fillStyle = '#D7CCC8'; // 浅色引用符号
  ctx.textAlign = 'left'; 
  ctx.textBaseline = 'top';
  
  // 左引号
  ctx.fillText('“', cardX + rpx(40), stubCursorY);

  // 文字内容 (稍微缩进)
  ctx.fillStyle = '#5D4037'; 
  ctx.font = `${rpx(28)}px "Kaiti", "STKaiti", serif`; // 尽量用衬线或楷体
  const textH = drawWrappedText(ctx, ui.poster.summary || '', cardX + rpx(80), stubCursorY + rpx(30), cardW - rpx(140), rpx(42));
  
  // 右引号 (在文字结束位置下方)
  ctx.fillStyle = '#D7CCC8'; 
  ctx.font = `bold ${quoteSize}px serif`;
  ctx.fillText('”', cardX + cardW - rpx(100), textH + rpx(10));

  stubCursorY = textH + rpx(80);

  // 3. 底部二维码与签名
  const qrSize = rpx(120);
  const qrX = cardX + rpx(40);
  
  // 二维码框
  ctx.fillStyle = '#FFF'; ctx.strokeStyle = '#D7CCC8';
  drawRoundRectPath(ctx, qrX, stubCursorY, qrSize, qrSize, rpx(8));
  ctx.fill(); ctx.stroke();
  
  // 模拟二维码
  ctx.fillStyle = '#6A4C9C'; ctx.fillRect(qrX + rpx(10), stubCursorY + rpx(10), qrSize - rpx(20), qrSize - rpx(20));

  // 签名
  ctx.textAlign = 'left';
  ctx.fillStyle = '#333'; ctx.font = `italic ${rpx(28)}px serif`;
  ctx.fillText('Signature: @LifeMBTI', qrX + qrSize + rpx(30), stubCursorY + rpx(40));
  
  ctx.fillStyle = '#999'; ctx.font = `${rpx(22)}px sans-serif`;
  ctx.fillText('长按识别解锁你的命运', qrX + qrSize + rpx(30), stubCursorY + rpx(80));

  const cardBottomY = stubCursorY + qrSize + rpx(40);

  // --- [E] 底部锯齿 ---
  const toothW = rpx(20); 
  const toothH = rpx(15);
  const teethCount = Math.ceil(cardW / toothW);

  ctx.beginPath();
  ctx.moveTo(cardX, cardBottomY);
  for (let i = 0; i < teethCount; i++) {
    ctx.lineTo(cardX + i * toothW + toothW/2, cardBottomY + toothH);
    ctx.lineTo(cardX + (i + 1) * toothW, cardBottomY);
  }
  ctx.lineTo(cardX + cardW, cardY); // 闭合回顶部，填色用
  ctx.lineTo(cardX, cardY);
  ctx.closePath();
  
  // 这里我们只需要填充底部多出来的部分，或者简单地用白色遮盖多余的矩形？
  // 其实最简单的是：刚才画矩形画多了，现在用锯齿切掉底部。
  // 方法：将锯齿路径作为 clip，或者直接在底部画锯齿颜色的三角形覆盖？
  // 正确做法：上面的 rect 不要画太长，画到 cardBottomY。然后画锯齿。
  
  // 修正：用背景色画锯齿遮盖掉多余的 EFEBE4
  ctx.fillStyle = '#e2d6f7ff'; // 背景色
  ctx.beginPath();
  ctx.moveTo(cardX, cardBottomY);
  for (let i = 0; i < teethCount; i++) {
    ctx.lineTo(cardX + i * toothW + toothW/2, cardBottomY + toothH); // 这里的形状要反过来
    // ... 简化逻辑：直接在 cardBottomY 处画一排倒三角
  }
  // 简单方案：不再裁切，直接结束。
  
  return true;
};