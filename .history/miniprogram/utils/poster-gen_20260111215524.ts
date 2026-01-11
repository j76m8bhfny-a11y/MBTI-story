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
  ctx.fillStyle = '#ede8f6ff';
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
      
      // 塔罗牌尺寸 (保持 2:3 比例)
      const tarotW = rpx(400);
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
  const trendsH = rpx(80) + (trendsCount * trendRowH) + rpx(20);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cardX, cursorY, cardW, trendsH);

  let trendY = cursorY + rpx(60);
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
  ctx.fillStyle = '#ede8f6ff'; // 背景色
  ctx.beginPath(); ctx.arc(cardX, cursorY + tearH/2, rpx(12), -Math.PI/2, Math.PI/2); ctx.fill();
  ctx.beginPath(); ctx.arc(cardX + cardW, cursorY + tearH/2, rpx(12), Math.PI/2, Math.PI*3/2); ctx.fill();

  cursorY += tearH;

  // --- [D] 票根区域 ---
  const stubY = cursorY;
  
  // 1. 预先计算动态内容高度，以便先画背景
  //    (我们需要先知道 textHeight 才能确定 cardBottomY)
  const contentWidth = cardW - rpx(140);
  const summaryText = ui.poster.summary || '';
  
  // 模拟计算文字高度 (不绘制)
  let textLines = 0;
  if (summaryText) {
    const chars = summaryText.split('');
    let line = '';
    let currLineCount = 1;
    for (let n = 0; n < chars.length; n++) {
      const testLine = line + chars[n];
      if (ctx.measureText(testLine).width > contentWidth && n > 0) {
        line = chars[n];
        currLineCount++;
      } else {
        line = testLine;
      }
    }
    textLines = currLineCount;
  }
  const lineHeight = rpx(42);
  const textSectionHeight = textLines * lineHeight;

  // 2. 计算各部分布局坐标
  const titleTop = stubY + rpx(40);
  const bracketTop = titleTop + rpx(24) + rpx(40); // 标题高+间距
  const bracketH = rpx(100);
  const quoteTop = bracketTop + bracketH + rpx(60);
  const textTop = quoteTop + rpx(30);
  const qrTop = textTop + textSectionHeight + rpx(80); // 这里的 80 是文字和二维码的间距
  const qrSize = rpx(120);
  
  // 🔥 计算最终底部坐标
  const cardBottomY = qrTop + qrSize + rpx(50);

  // =============================================
  // 🎨 先画票根背景 (带锯齿 + 阴影)
  // =============================================
  ctx.save();
  ctx.fillStyle = '#EFEBE4'; // 票根米色
  // 设置阴影
  ctx.shadowColor = 'rgba(106, 76, 156, 0.15)'; 
  ctx.shadowBlur = rpx(40);
  ctx.shadowOffsetY = rpx(10);

  const toothW = rpx(20); 
  const toothH = rpx(15);
  const teethCount = Math.ceil(cardW / toothW);

  ctx.beginPath();
  ctx.moveTo(cardX, stubY); // A. 左上
  ctx.lineTo(cardX + cardW, stubY); // B. 右上
  ctx.lineTo(cardX + cardW, cardBottomY); // C. 右下

  // D. 底部锯齿 (从右向左)
  for (let i = 0; i < teethCount; i++) {
    const segmentRightX = cardX + cardW - i * toothW;
    ctx.lineTo(segmentRightX - toothW / 2, cardBottomY - toothH); 
    ctx.lineTo(segmentRightX - toothW, cardBottomY); 
  }

  ctx.lineTo(cardX, stubY); // E. 回到左上
  ctx.closePath();
  ctx.fill();
  ctx.restore(); // 恢复无阴影状态

  // =============================================
  // ✍️ 再画内容 (现在画在米色背景之上了)
  // =============================================
  
  // 1. 灵魂配方标题
  ctx.fillStyle = '#8D6E63'; ctx.font = `bold ${rpx(24)}px sans-serif`; ctx.textAlign = 'center';
  ctx.fillText('✨ 你的专属灵魂配方 ✨', cardX + cardW/2, titleTop);
  
  // 2. 绘制大括号 (Bracket)
  const bracketBottom = bracketTop + bracketH;
  const bracketLeft = cardX + rpx(40);
  const bracketRight = cardX + cardW - rpx(40);
  const hook = rpx(15); 

  ctx.beginPath();
  ctx.strokeStyle = '#D7CCC8'; 
  ctx.lineWidth = rpx(3);
  ctx.lineCap = 'round';
  
  // 左括号
  ctx.moveTo(bracketLeft + hook, bracketTop);
  ctx.lineTo(bracketLeft, bracketTop);
  ctx.lineTo(bracketLeft, bracketBottom);
  ctx.lineTo(bracketLeft + hook, bracketBottom);
  
  // 右括号
  ctx.moveTo(bracketRight - hook, bracketTop);
  ctx.lineTo(bracketRight, bracketTop);
  ctx.lineTo(bracketRight, bracketBottom);
  ctx.lineTo(bracketRight - hook, bracketBottom);
  ctx.stroke();

  // 3. 绘制贴纸
  const stickers = data.stickers || [];
  let stickerCenterY = bracketTop + bracketH / 2;
  
  ctx.font = `bold ${rpx(26)}px sans-serif`;
  let totalW = 0;
  const stickerData = stickers.slice(0, 3).map((item: any) => {
    const w = ctx.measureText(item.text).width + rpx(40);
    totalW += w + rpx(20);
    return { ...item, w };
  });
  totalW -= rpx(20); 

  let currentStickerX = cardX + (cardW - totalW) / 2;

  stickerData.forEach((item: any) => {
    ctx.save();
    ctx.fillStyle = item.type === 'core' ? '#333' : '#FFF';
    drawRoundRectPath(ctx, currentStickerX, stickerCenterY - rpx(25), item.w, rpx(50), rpx(8));
    ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = '#333'; ctx.stroke();

    ctx.fillStyle = item.type === 'core' ? '#FFF' : '#333';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(item.text, currentStickerX + item.w/2, stickerCenterY);
    ctx.restore();

    currentStickerX += item.w + rpx(20);
  });

  // 4. 绘制金句大引号
  const quoteSize = rpx(80);
  ctx.font = `bold ${quoteSize}px serif`;
  ctx.fillStyle = '#D7CCC8'; 
  ctx.textAlign = 'left'; 
  ctx.textBaseline = 'top';
  
  // 左引号
  ctx.fillText('“', cardX + rpx(40), quoteTop);

  // 文字内容
  ctx.fillStyle = '#5D4037'; 
  ctx.font = `${rpx(28)}px "Kaiti", "STKaiti", serif`;
  // 这里直接画，因为高度已经算好了
  drawWrappedText(ctx, summaryText, cardX + rpx(80), textTop, contentWidth, lineHeight);
  
  // 右引号
  ctx.fillStyle = '#D7CCC8'; 
  ctx.font = `bold ${quoteSize}px serif`;
  // 计算一下右引号位置：根据文字实际高度
  const actualTextBottom = textTop + textSectionHeight;
  ctx.fillText('”', cardX + cardW - rpx(100), actualTextBottom + rpx(10));

  // 5. 底部二维码与签名
  const qrX = cardX + rpx(50);
  
  ctx.fillStyle = '#FFF'; ctx.strokeStyle = '#D7CCC8';
  drawRoundRectPath(ctx, qrX, qrTop, qrSize, qrSize, rpx(8));
  ctx.fill(); ctx.stroke();
  
  ctx.fillStyle = '#6A4C9C'; 
  ctx.fillRect(qrX + rpx(10), qrTop + rpx(10), qrSize - rpx(20), qrSize - rpx(20));

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#333'; 
  ctx.font = `italic ${rpx(28)}px "Xingkai SC", "STKaiti", "KaiTi", "Kaiti SC", serif`;
  ctx.fillText('Signature: 另一个世界的你', qrX + qrSize + rpx(30), qrTop + rpx(50));
  
  ctx.fillStyle = '#999'; 
  ctx.font = `italic ${rpx(22)}px "Xingkai SC", "STKaiti", "KaiTi", "Kaiti SC", serif`;
  ctx.fillText(`Date: 2026.01.07`, qrX + qrSize + rpx(30), qrTop + rpx(90));

  return true;
};