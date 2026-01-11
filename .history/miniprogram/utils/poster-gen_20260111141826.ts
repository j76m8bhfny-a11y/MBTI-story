// miniprogram/utils/poster-gen.ts

// 1. 基础工具：绘制圆角矩形路径 (兼容所有机型)
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

// 2. 文字自动换行 (支持最大行数限制)
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
  // 1. 初始化尺寸与缩放 (基于 750rpx 设计稿)
  const dpr = wx.getSystemInfoSync().pixelRatio;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  const scale = width / 750; // 核心缩放因子
  const rpx = (val: number) => val * scale;

  ctx.clearRect(0, 0, width, height);

  // --- [Background] 绘制背景 ---
  ctx.fillStyle = '#FFFDF9';
  ctx.fillRect(0, 0, width, height);

  if (ui.poster?.bg_image) {
    try {
      const bgImg = await createImage(canvas, ui.poster.bg_image);
      // 模拟 mode="aspectFill" 铺满全屏
      const imgR = bgImg.width / bgImg.height;
      const cvsR = width / height;
      let sx=0, sy=0, sw=bgImg.width, sh=bgImg.height;
      if (imgR > cvsR) { sw = sh * cvsR; sx = (bgImg.width - sw)/2; }
      else { sh = sw / cvsR; sy = (bgImg.height - sh)/2; }
      ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, width, height);
      // 叠加半透明蒙层
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'; 
      ctx.fillRect(0, 0, width, height);
    } catch(e) { console.error('BG Load Err', e); }
  }

  let mainCursorY = rpx(60); // 页面顶部起始位置

  // =============================================
  // ✨ [NEW SECTION] 顶部塔罗牌区域 ✨
  // =============================================
  if (data.tarot && data.tarot.image) {
    try {
      const tarotImg = await createImage(canvas, data.tarot.image);
      
      // 设定塔罗牌显示区域
      // 一般塔罗牌比例约为 3:5
      const tarotDisplayW = rpx(360); // 宽度
      const tarotDisplayH = rpx(600); // 高度
      const tarotX = (width - tarotDisplayW) / 2; // 居中
      const tarotY = mainCursorY;

      // 绘制带有阴影和边框的塔罗牌
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = rpx(30);
      ctx.shadowOffsetY = rpx(15);
      
      // 绘制图片 (aspectFit 或 fill 视需求而定，这里用 fill 填满区域)
      // 如果想保持比例，可以算一下 sx, sy
      ctx.drawImage(tarotImg, tarotX, tarotY, tarotDisplayW, tarotDisplayH);
      
      // 绘制一个金色边框增加质感
      ctx.shadowColor = 'transparent'; // 边框不要阴影
      ctx.strokeStyle = '#D4AF37'; // 金色
      ctx.lineWidth = rpx(6);
      ctx.strokeRect(tarotX - rpx(3), tarotY - rpx(3), tarotDisplayW + rpx(6), tarotDisplayH + rpx(6));
      
      ctx.restore();

      // (可选) 在牌下方绘制牌名
      if (data.tarot.name) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#6A4C9C';
        ctx.font = `bold ${rpx(36)}px sans-serif`;
        ctx.fillText(data.tarot.name, width / 2, tarotY + tarotDisplayH + rpx(50));
        mainCursorY += rpx(80); // 增加牌名高度占位
      }

      // 更新主光标位置，往下推移，留出间距
      mainCursorY = tarotY + tarotDisplayH + rpx(80);

    } catch (e) {
      console.error('Tarot draw failed', e);
      // 如果失败，光标不动，直接画下面的卡片
    }
  }


  // =============================================
  // 👇 以下是原有的结果卡片绘制逻辑 (坐标已调整) 👇
  // =============================================

  // --- [Card Container] 卡片参数 ---
  const cardW = rpx(680);
  const cardX = (width - cardW) / 2;
  // 🔥 关键修改：卡片起始Y坐标使用 mainCursorY
  const cardY = mainCursorY; 
  let cursorY = cardY;

  // 绘制卡片投影 
  ctx.shadowColor = 'rgba(106, 76, 156, 0.25)';
  ctx.shadowBlur = rpx(60);
  ctx.shadowOffsetY = rpx(20);

  // --- [A] 头部身份区 (Card Header) ---
  const headerPadding = rpx(40);
  const headerTopPad = rpx(70);
  const headerContentH = rpx(220);
  
  ctx.fillStyle = '#FFFFFF';
  drawRoundRectPath(ctx, cardX, cursorY, cardW, headerContentH + headerTopPad, [rpx(24), rpx(24), 0, 0]);
  ctx.fill();
  
  // 重置阴影
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  let contentY = cursorY + headerTopPad;
  const contentX = cardX + headerPadding;

  // 1. MBTI Type
  ctx.fillStyle = '#6A4C9C';
  ctx.font = `bold ${rpx(100)}px "Didot", serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(ui.poster.type || 'MBTI', contentX, contentY);
  ctx.font = `${rpx(40)}px sans-serif`;
  ctx.fillText('✨', contentX - rpx(35), contentY - rpx(10));

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
  drawWrappedText(ctx, slogan, contentX, contentY, cardW - headerPadding * 2, rpx(36), 2);

  cursorY += headerContentH + headerTopPad;

  // --- [B] 动态趋势区 (Trends Section) ---
  const trendsTopPad = rpx(60); 
  const trendRowH = rpx(80);
  const trendsCount = (ui.trends || []).length;
  const trendsH = trendsTopPad + (trendsCount * trendRowH) + rpx(20);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cardX, cursorY, cardW, trendsH);

  let trendY = cursorY + trendsTopPad;
  
  (ui.trends || []).forEach((item: any) => {
    const rowCenterY = trendY + rpx(20);
    const leftX = cardX + rpx(40);
    const rightX = cardX + cardW - rpx(40);
    const barW = cardW - rpx(200);
    const barX = cardX + rpx(100);

    // 左字
    ctx.font = item.isLeftWin ? `900 ${rpx(40)}px "Didot", serif` : `400 ${rpx(32)}px "Didot", serif`;
    ctx.fillStyle = item.isLeftWin ? '#6A4C9C' : '#E0E0E0';
    ctx.textAlign = 'left'; ctx.fillText(item.leftChar, leftX, rowCenterY - rpx(10));

    // 右字
    ctx.font = !item.isLeftWin ? `900 ${rpx(40)}px "Didot", serif` : `400 ${rpx(32)}px "Didot", serif`;
    ctx.fillStyle = !item.isLeftWin ? '#6A4C9C' : '#E0E0E0';
    ctx.textAlign = 'right'; ctx.fillText(item.rightChar, rightX, rowCenterY - rpx(10));

    // 进度条轨道
    ctx.fillStyle = '#F5F5F5';
    drawRoundRectPath(ctx, barX, rowCenterY, barW, rpx(6), rpx(3));
    ctx.fill();

    // 进度条填充
    const fillPercent = (100 - item.score) / 100;
    const fillW = Math.max(barW * fillPercent, rpx(12));
    ctx.fillStyle = '#D1C4E9';
    drawRoundRectPath(ctx, barX, rowCenterY, fillW, rpx(6), rpx(3));
    ctx.fill();

    // 圆点
    const dotX = barX + fillW;
    ctx.fillStyle = '#6A4C9C';
    ctx.beginPath(); ctx.arc(dotX, rowCenterY + rpx(3), rpx(8), 0, Math.PI * 2); ctx.fill();

    // 悬浮胶囊 Pill
    if (item.statusText) {
        const pillText = item.statusText;
        ctx.font = `bold ${rpx(20)}px sans-serif`;
        const tm = ctx.measureText(pillText);
        const pillW = tm.width + rpx(36); const pillH = rpx(34);
        const pillX = dotX - pillW / 2; const pillY = rowCenterY - rpx(45);

        ctx.fillStyle = '#F3E5F5';
        drawRoundRectPath(ctx, pillX, pillY, pillW, pillH, rpx(12));
        ctx.fill();
        
        ctx.fillStyle = '#6A4C9C'; ctx.textAlign = 'center';
        ctx.fillText(pillText, dotX, pillY + rpx(8));

        ctx.fillStyle = '#F3E5F5';
        ctx.beginPath();
        ctx.moveTo(dotX, pillY + pillH);
        ctx.lineTo(dotX - rpx(8), pillY + pillH);
        ctx.lineTo(dotX, pillY + pillH + rpx(8));
        ctx.lineTo(dotX + rpx(8), pillY + pillH);
        ctx.fill();
    }
    trendY += trendRowH;
  });

  cursorY += trendsH;

  // --- [Divider] 撕裂线 ---
  const tearH = rpx(48);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(cardX, cursorY, cardW, tearH / 2);
  ctx.fillStyle = '#EFEBE4'; ctx.fillRect(cardX, cursorY + tearH/2, cardW, tearH / 2);

  const notchR = rpx(12);
  ctx.fillStyle = '#FFFDF9'; 
  ctx.beginPath(); ctx.arc(cardX, cursorY + tearH/2, notchR, -Math.PI/2, Math.PI/2); ctx.fill();
  ctx.beginPath(); ctx.arc(cardX + cardW, cursorY + tearH/2, notchR, Math.PI/2, Math.PI*3/2); ctx.fill();

  ctx.beginPath(); ctx.strokeStyle = '#D7CCC8'; ctx.lineWidth = 1;
  ctx.setLineDash([rpx(12), rpx(12)]);
  ctx.moveTo(cardX + rpx(30), cursorY + tearH/2); ctx.lineTo(cardX + cardW - rpx(30), cursorY + tearH/2);
  ctx.stroke(); ctx.setLineDash([]);

  cursorY += tearH;

  // --- [C] 票根手记区 (Card Stub) ---
  const stubY = cursorY;
  const stubMinH = rpx(500); 
  ctx.fillStyle = '#EFEBE4';
  ctx.fillRect(cardX, stubY, cardW, stubMinH);

  let stubCursorY = stubY + rpx(20);

  // 1. 灵魂配方
  const recipeW = cardW * 0.92; const recipeX = cardX + (cardW - recipeW)/2;
  ctx.strokeStyle = '#D7CCC8'; ctx.lineWidth = rpx(4);
  const bracketH = rpx(180); const bracketHook = rpx(15);
  
  ctx.beginPath();
  ctx.moveTo(recipeX + bracketHook, stubCursorY); ctx.lineTo(recipeX, stubCursorY);
  ctx.lineTo(recipeX, stubCursorY + bracketH); ctx.lineTo(recipeX + bracketHook, stubCursorY + bracketH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(recipeX + recipeW - bracketHook, stubCursorY); ctx.lineTo(recipeX + recipeW, stubCursorY);
  ctx.lineTo(recipeX + recipeW, stubCursorY + bracketH); ctx.lineTo(recipeX + recipeW - bracketHook, stubCursorY + bracketH);
  ctx.stroke();

  ctx.fillStyle = '#8D6E63'; ctx.font = `800 ${rpx(20)}px sans-serif`; ctx.textAlign = 'center';
  ctx.fillText('✨ 你的专属灵魂配方 ✨', cardX + cardW/2, stubCursorY + rpx(10));

  let stickerY = stubCursorY + rpx(60);
  const stickers = data.stickers || [];
  const stickerGap = rpx(20);
  let totalStickerW = 0;
  stickers.slice(0, 3).forEach((s: any) => {
      ctx.font = `bold ${rpx(22)}px sans-serif`;
      totalStickerW += ctx.measureText(s.text).width + rpx(48) + stickerGap;
  });
  let stickerX = cardX + cardW/2 - totalStickerW/2 + rpx(10);

  stickers.slice(0, 3).forEach((item: any, i: number) => {
    ctx.save();
    const angle = (Math.random() * 8 - 4) * Math.PI / 180;
    ctx.font = `bold ${rpx(22)}px sans-serif`;
    const textW = ctx.measureText(item.text).width + rpx(48); const textH = rpx(44);
    const cx = stickerX + textW/2; const cy = stickerY + textH/2;
    ctx.translate(cx, cy); ctx.rotate(angle); ctx.translate(-cx, -cy);

    if (item.type === 'core') { ctx.fillStyle = '#2C2C2C'; ctx.strokeStyle = 'transparent'; }
    else if (item.type === 'trait') { ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#333333'; }
    else { ctx.fillStyle = '#FFF9E6'; ctx.strokeStyle = '#8D6E63'; }
    
    drawRoundRectPath(ctx, stickerX, stickerY, textW, textH, rpx(6));
    ctx.fill();
    if (item.type !== 'core') { ctx.lineWidth = 1; ctx.stroke(); }

    ctx.fillStyle = item.type === 'core' ? '#FFFFFF' : (item.type === 'egg' ? '#8D6E63' : '#333333');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(item.text, stickerX + textW/2, stickerY + textH/2);
    ctx.restore();
    stickerX += textW + stickerGap;
  });

  stubCursorY += bracketH + rpx(40);

  // 2. 金句
  const noteX = cardX + rpx(40); const noteW = cardW - rpx(80);
  ctx.fillStyle = '#DDDDDD'; ctx.font = `bold ${rpx(80)}px serif`;
  ctx.fillText('“', noteX - rpx(20), stubCursorY);
  ctx.fillStyle = '#62433a'; ctx.font = `${rpx(25)}px "Kaiti SC", serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const textEndH = drawWrappedText(ctx, ui.poster.summary || '', noteX, stubCursorY + rpx(40), noteW, rpx(45));
  stubCursorY = textEndH + rpx(20);
  ctx.fillStyle = '#DDDDDD'; ctx.font = `bold ${rpx(80)}px serif`;
  ctx.fillText('”', noteX + noteW - rpx(20), stubCursorY - rpx(20));
  stubCursorY += rpx(60);

  // 3. 签名区
  ctx.beginPath(); ctx.strokeStyle = '#EAEAEA'; ctx.lineWidth = 1;
  ctx.moveTo(noteX, stubCursorY); ctx.lineTo(noteX + noteW, stubCursorY); ctx.stroke();
  stubCursorY += rpx(20);
  ctx.textAlign = 'right'; ctx.fillStyle = '#333333'; ctx.font = `italic ${rpx(28)}px cursive`;
  ctx.fillText('Signature: @Omega_AI', noteX + noteW, stubCursorY);
  stubCursorY += rpx(30);
  ctx.fillStyle = '#999999'; ctx.font = `${rpx(20)}px sans-serif`;
  ctx.fillText('Date: 2026.01.07', noteX + noteW, stubCursorY);

  // 4. 底部二维码
  stubCursorY += rpx(40);
  const qrSize = rpx(120);
  const qrX = cardX + rpx(40);
  
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#D7CCC8';
  drawRoundRectPath(ctx, qrX, stubCursorY, qrSize, qrSize, rpx(8));
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6A4C9C'; ctx.fillRect(qrX + rpx(40), stubCursorY + rpx(40), rpx(40), rpx(40));

  ctx.textAlign = 'left'; ctx.fillStyle = '#6A4C9C'; ctx.font = `bold ${rpx(22)}px sans-serif`;
  ctx.fillText('长按识别解锁命运', qrX + qrSize + rpx(20), stubCursorY + rpx(40));
  ctx.fillStyle = '#999999'; ctx.font = `${rpx(18)}px sans-serif`;
  ctx.fillText('@Omega_AI 2026', qrX + qrSize + rpx(20), stubCursorY + rpx(70));

  const cardBottomY = stubCursorY + qrSize + rpx(40);

  // --- [Zigzag Bottom] 底部锯齿 ---
  const toothW = rpx(40); const toothH = rpx(20);
  const teethCount = Math.ceil(cardW / toothW);
  ctx.beginPath(); ctx.moveTo(cardX, cardBottomY);
  for (let i = 0; i < teethCount; i++) {
    const x = cardX + i * toothW;
    ctx.lineTo(x + toothW/2, cardBottomY + toothH);
    ctx.lineTo(x + toothW, cardBottomY);
  }
  ctx.closePath(); ctx.fillStyle = '#EFEBE4'; ctx.fill();

  return true;
};