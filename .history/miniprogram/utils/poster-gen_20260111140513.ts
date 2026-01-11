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
  const scale = width / 750; // 核心缩放因子：1 rpx = scale px
  
  // 定义 rpx 转换函数，方便直接使用 CSS 数值
  const rpx = (val: number) => val * scale;

  ctx.clearRect(0, 0, width, height);

  // --- [Background] 绘制背景 ---
  // CSS: background-color: #FFFDF9;
  ctx.fillStyle = '#FFFDF9';
  ctx.fillRect(0, 0, width, height);

  if (ui.poster?.bg_image) {
    try {
      const bgImg = await createImage(canvas, ui.poster.bg_image);
      // 模拟 mode="aspectFill"
      const imgR = bgImg.width / bgImg.height;
      const cvsR = width / height;
      let sx = 0, sy = 0, sw = bgImg.width, sh = bgImg.height;
      if (imgR > cvsR) {
        sw = sh * cvsR; sx = (bgImg.width - sw) / 2;
      } else {
        sh = sw / cvsR; sy = (bgImg.height - sh) / 2;
      }
      ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, width, height);
      
      // CSS: opacity:0.1; filter:blur(50px);
      // Canvas 模糊很耗性能，这里用叠加半透明白层模拟类似效果
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // 0.9 不透明度 = 0.1 图片透明度
      ctx.fillRect(0, 0, width, height);
    } catch(e) { console.error('BG Load Err', e); }
  }

  // --- [Card Container] 卡片参数 ---
  // CSS: width: 680rpx
  const cardW = rpx(680);
  const cardX = (width - cardW) / 2;
  const cardY = rpx(120); // 顶部留白
  let cursorY = cardY;

  // 绘制卡片投影 
  // CSS: filter: drop-shadow(0 20rpx 60rpx rgba(106, 76, 156, 0.25));
  ctx.shadowColor = 'rgba(106, 76, 156, 0.25)';
  ctx.shadowBlur = rpx(60);
  ctx.shadowOffsetY = rpx(20);

  // --- [A] 头部身份区 (Card Header) ---
  // CSS: background: #FFFFFF; border-radius: 24rpx 24rpx 0 0; padding: 70rpx 40rpx ...
  const headerPadding = rpx(40);
  const headerTopPad = rpx(70);
  const headerContentH = rpx(220); // 估算高度
  
  ctx.fillStyle = '#FFFFFF';
  drawRoundRectPath(ctx, cardX, cursorY, cardW, headerContentH + headerTopPad, [rpx(24), rpx(24), 0, 0]);
  ctx.fill();
  
  // 重置阴影（避免文字带阴影）
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  let contentY = cursorY + headerTopPad;
  const contentX = cardX + headerPadding;

  // 1. MBTI Type
  // CSS: font-family: "Didot"; font-size: 100rpx; color: #6A4C9C;
  ctx.fillStyle = '#6A4C9C';
  ctx.font = `bold ${rpx(100)}px "Didot", serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(ui.poster.type || 'MBTI', contentX, contentY);
  
  // 装饰星星 ✨
  ctx.font = `${rpx(40)}px sans-serif`;
  ctx.fillText('✨', contentX - rpx(35), contentY - rpx(10));

  contentY += rpx(110); // line-height adjust

  // 2. Role Title
  // CSS: font-size: 34rpx; font-weight: 900; color: #333;
  ctx.fillStyle = '#333333';
  ctx.font = `900 ${rpx(34)}px sans-serif`;
  ctx.fillText(ui.poster.title || 'Role', contentX, contentY);

  contentY += rpx(50);

  // 3. Slogan
  // CSS: font-size: 24rpx; color: #666;
  ctx.fillStyle = '#666666';
  ctx.font = `${rpx(24)}px sans-serif`;
  // 简单处理引号
  const slogan = `"${ui.poster.life_script || ''}"`;
  drawWrappedText(ctx, slogan, contentX, contentY, cardW - headerPadding * 2, rpx(36), 2);

  cursorY += headerContentH + headerTopPad;

  // --- [B] 动态趋势区 (Trends Section) ---
  // CSS: background: #FFFFFF; padding-top: 80rpx;
  const trendsTopPad = rpx(60); 
  const trendRowH = rpx(80); // 行高
  const trendsCount = (ui.trends || []).length;
  const trendsH = trendsTopPad + (trendsCount * trendRowH) + rpx(20);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cardX, cursorY, cardW, trendsH);

  let trendY = cursorY + trendsTopPad;
  
  (ui.trends || []).forEach((item: any) => {
    const rowCenterY = trendY + rpx(20);
    const leftX = cardX + rpx(40);
    const rightX = cardX + cardW - rpx(40);
    const barW = cardW - rpx(200); // 减去左右文字空间
    const barX = cardX + rpx(100);

    // 左字
    ctx.font = item.isLeftWin ? `900 ${rpx(40)}px "Didot", serif` : `400 ${rpx(32)}px "Didot", serif`;
    ctx.fillStyle = item.isLeftWin ? '#6A4C9C' : '#E0E0E0';
    ctx.textAlign = 'left';
    ctx.fillText(item.leftChar, leftX, rowCenterY - rpx(10));

    // 右字
    ctx.font = !item.isLeftWin ? `900 ${rpx(40)}px "Didot", serif` : `400 ${rpx(32)}px "Didot", serif`;
    ctx.fillStyle = !item.isLeftWin ? '#6A4C9C' : '#E0E0E0';
    ctx.textAlign = 'right';
    ctx.fillText(item.rightChar, rightX, rowCenterY - rpx(10));

    // 进度条轨道
    // CSS: height: 6rpx; background: #F5F5F5;
    ctx.fillStyle = '#F5F5F5';
    drawRoundRectPath(ctx, barX, rowCenterY, barW, rpx(6), rpx(3));
    ctx.fill();

    // 进度条填充 (Assuming item.score is Right Score, fill width = 100 - score)
    // CSS: width: {{100 - item.score}}%
    const fillPercent = (100 - item.score) / 100;
    const fillW = Math.max(barW * fillPercent, rpx(12));
    ctx.fillStyle = '#D1C4E9';
    drawRoundRectPath(ctx, barX, rowCenterY, fillW, rpx(6), rpx(3));
    ctx.fill();

    // 圆点
    const dotX = barX + fillW;
    ctx.fillStyle = '#6A4C9C';
    ctx.beginPath();
    ctx.arc(dotX, rowCenterY + rpx(3), rpx(8), 0, Math.PI * 2);
    ctx.fill();

    // 悬浮胶囊 Pill
    // CSS: bottom: 24rpx; background: #F3E5F5; color: #6A4C9C;
    if (item.statusText) {
        const pillText = item.statusText;
        ctx.font = `bold ${rpx(20)}px sans-serif`;
        const tm = ctx.measureText(pillText);
        const pillW = tm.width + rpx(36);
        const pillH = rpx(34);
        const pillX = dotX - pillW / 2; // 居中于 dot
        const pillY = rowCenterY - rpx(45);

        // 胶囊背景
        ctx.fillStyle = '#F3E5F5';
        drawRoundRectPath(ctx, pillX, pillY, pillW, pillH, rpx(12));
        ctx.fill();
        
        // 胶囊文字
        ctx.fillStyle = '#6A4C9C';
        ctx.textAlign = 'center';
        ctx.fillText(pillText, dotX, pillY + rpx(8));

        // 小三角
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

  // --- [Divider] 撕裂线 (Tear Line) ---
  // CSS: height: 48rpx; background: linear-gradient(...); mask...
  const tearH = rpx(48);
  
  // 上半部分白色
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cardX, cursorY, cardW, tearH / 2);
  // 下半部分米色
  ctx.fillStyle = '#EFEBE4';
  ctx.fillRect(cardX, cursorY + tearH/2, cardW, tearH / 2);

  // 绘制缺口 (Notches) - 直接画背景色圆覆盖
  const notchR = rpx(12);
  ctx.fillStyle = '#FFFDF9'; // 页面背景色
  // 左缺口
  ctx.beginPath();
  ctx.arc(cardX, cursorY + tearH/2, notchR, -Math.PI/2, Math.PI/2);
  ctx.fill();
  // 右缺口
  ctx.beginPath();
  ctx.arc(cardX + cardW, cursorY + tearH/2, notchR, Math.PI/2, Math.PI*3/2);
  ctx.fill();

  // 虚线
  ctx.beginPath();
  ctx.strokeStyle = '#D7CCC8';
  ctx.lineWidth = 1;
  ctx.setLineDash([rpx(12), rpx(12)]);
  ctx.moveTo(cardX + rpx(30), cursorY + tearH/2);
  ctx.lineTo(cardX + cardW - rpx(30), cursorY + tearH/2);
  ctx.stroke();
  ctx.setLineDash([]);

  cursorY += tearH;

  // --- [C] 票根手记区 (Card Stub) ---
  // CSS: background: #EFEBE4; border-radius: 0 0 24rpx 24rpx;
  // 这里先画一个够长的矩形，后面再切
  const stubY = cursorY;
  const stubMinH = rpx(500); 
  
  ctx.fillStyle = '#EFEBE4';
  // 暂时画直角，最后再补锯齿
  ctx.fillRect(cardX, stubY, cardW, stubMinH);

  let stubCursorY = stubY + rpx(20);

  // 1. 灵魂配方 (Recipe Container)
  // CSS: width: 92%; margin: ...
  const recipeW = cardW * 0.92;
  const recipeX = cardX + (cardW - recipeW)/2;
  
  // 绘制大括号 []
  ctx.strokeStyle = '#D7CCC8';
  ctx.lineWidth = rpx(4);
  const bracketH = rpx(180); // 估算
  const bracketHook = rpx(15);
  
  // 左括号
  ctx.beginPath();
  ctx.moveTo(recipeX + bracketHook, stubCursorY); // 上横
  ctx.lineTo(recipeX, stubCursorY); // 左上角
  ctx.lineTo(recipeX, stubCursorY + bracketH); // 左竖
  ctx.lineTo(recipeX + bracketHook, stubCursorY + bracketH); // 下横
  ctx.stroke();

  // 右括号
  ctx.beginPath();
  ctx.moveTo(recipeX + recipeW - bracketHook, stubCursorY);
  ctx.lineTo(recipeX + recipeW, stubCursorY);
  ctx.lineTo(recipeX + recipeW, stubCursorY + bracketH);
  ctx.lineTo(recipeX + recipeW - bracketHook, stubCursorY + bracketH);
  ctx.stroke();

  // 标题
  ctx.fillStyle = '#8D6E63';
  ctx.font = `800 ${rpx(20)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('✨ 你的专属灵魂配方 ✨', cardX + cardW/2, stubCursorY + rpx(10));

  // 贴纸 (Stickers)
  let stickerY = stubCursorY + rpx(60);
  const stickers = data.stickers || [];
  
  // 简易贴纸排版 (一行3个)
  const stickerGap = rpx(20);
  // 计算总宽来居中
  let totalStickerW = 0;
  stickers.slice(0, 3).forEach((s: any) => {
      ctx.font = `bold ${rpx(22)}px sans-serif`;
      totalStickerW += ctx.measureText(s.text).width + rpx(48) + stickerGap;
  });
  
  let stickerX = cardX + cardW/2 - totalStickerW/2 + rpx(10);

  stickers.slice(0, 3).forEach((item: any, i: number) => {
    ctx.save();
    // 随机角度 (这里简单模拟 index.ts 的逻辑)
    const angle = (Math.random() * 8 - 4) * Math.PI / 180;
    
    ctx.font = `bold ${rpx(22)}px sans-serif`;
    const textW = ctx.measureText(item.text).width + rpx(48);
    const textH = rpx(44);
    
    // 移动到贴纸中心旋转
    const cx = stickerX + textW/2;
    const cy = stickerY + textH/2;
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);

    // 背景色 logic
    if (item.type === 'core') {
        ctx.fillStyle = '#2C2C2C'; ctx.strokeStyle = 'transparent';
    } else if (item.type === 'trait') {
        ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#333333';
    } else {
        ctx.fillStyle = '#FFF9E6'; ctx.strokeStyle = '#8D6E63';
    }
    
    drawRoundRectPath(ctx, stickerX, stickerY, textW, textH, rpx(6));
    ctx.fill();
    if (item.type !== 'core') {
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // 文字颜色
    ctx.fillStyle = item.type === 'core' ? '#FFFFFF' : (item.type === 'egg' ? '#8D6E63' : '#333333');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.text, stickerX + textW/2, stickerY + textH/2);

    ctx.restore();
    stickerX += textW + stickerGap;
  });

  stubCursorY += bracketH + rpx(40);

  // 2. 金句 (Note Box)
  const noteX = cardX + rpx(40);
  const noteW = cardW - rpx(80);
  
  // 画引号 “
  ctx.fillStyle = '#DDDDDD';
  ctx.font = `bold ${rpx(80)}px serif`;
  ctx.fillText('“', noteX - rpx(20), stubCursorY);

  // 正文
  ctx.fillStyle = '#62433a';
  ctx.font = `${rpx(25)}px "Kaiti SC", serif`; // 楷体
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const textEndH = drawWrappedText(ctx, ui.poster.summary || '', noteX, stubCursorY + rpx(40), noteW, rpx(45));
  
  stubCursorY = textEndH + rpx(20);

  // 画引号 ”
  ctx.fillStyle = '#DDDDDD';
  ctx.font = `bold ${rpx(80)}px serif`;
  ctx.fillText('”', noteX + noteW - rpx(20), stubCursorY - rpx(20));

  stubCursorY += rpx(60);

  // 3. 签名区 (Signature)
  ctx.beginPath();
  ctx.strokeStyle = '#EAEAEA';
  ctx.lineWidth = 1;
  ctx.moveTo(noteX, stubCursorY);
  ctx.lineTo(noteX + noteW, stubCursorY);
  ctx.stroke();

  stubCursorY += rpx(20);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#333333';
  ctx.font = `italic ${rpx(28)}px cursive`;
  ctx.fillText('Signature: @Omega_AI', noteX + noteW, stubCursorY);
  
  stubCursorY += rpx(30);
  ctx.fillStyle = '#999999';
  ctx.font = `${rpx(20)}px sans-serif`;
  ctx.fillText('Date: 2026.01.07', noteX + noteW, stubCursorY);

  // 4. [New] 底部二维码 (QR Code) - 整合在卡片内
  stubCursorY += rpx(40);
  const qrSize = rpx(120);
  const qrX = cardX + rpx(40); // 放在左下角，和签名对齐
  
  // 画二维码框
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#D7CCC8';
  drawRoundRectPath(ctx, qrX, stubCursorY, qrSize, qrSize, rpx(8));
  ctx.fill();
  ctx.stroke();
  
  // 模拟二维码内容 (点)
  ctx.fillStyle = '#6A4C9C';
  ctx.fillRect(qrX + rpx(40), stubCursorY + rpx(40), rpx(40), rpx(40));

  // 扫码提示
  ctx.textAlign = 'left';
  ctx.fillStyle = '#6A4C9C';
  ctx.font = `bold ${rpx(22)}px sans-serif`;
  ctx.fillText('长按识别解锁命运', qrX + qrSize + rpx(20), stubCursorY + rpx(40));
  
  ctx.fillStyle = '#999999';
  ctx.font = `${rpx(18)}px sans-serif`;
  ctx.fillText('@Omega_AI 2026', qrX + qrSize + rpx(20), stubCursorY + rpx(70));

  const cardBottomY = stubCursorY + qrSize + rpx(40);

  // --- [Zigzag Bottom] 底部锯齿 ---
  // CSS: height: 20rpx; bottom: -20rpx; background size 40rpx 20rpx
  // 逻辑：在 cardBottomY 处画锯齿
  const toothW = rpx(40);
  const toothH = rpx(20);
  const teethCount = Math.ceil(cardW / toothW);

  ctx.beginPath();
  ctx.moveTo(cardX, cardBottomY); // 起点：卡片左下角
  
  for (let i = 0; i < teethCount; i++) {
    const x = cardX + i * toothW;
    // 画一个倒三角 V
    ctx.lineTo(x + toothW/2, cardBottomY + toothH);
    ctx.lineTo(x + toothW, cardBottomY);
  }
  
  ctx.closePath();
  ctx.fillStyle = '#EFEBE4'; // 填充颜色同卡片底色
  ctx.fill();

  return true;
};