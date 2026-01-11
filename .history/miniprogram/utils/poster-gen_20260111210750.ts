// utils/poster-gen.ts

/**
 * 绘制海报的核心逻辑
 * 包含了：大括号、双引号、进度条气泡、自动换行文字等细节
 */
export const drawPoster = async (
  canvas: any,
  ctx: any,
  drawData: any, // { stickers, tarot: { image, name } }
  uiData: any    // 完整的 UI 数据对象
) => {
  
  const W = canvas.width;
  const H = canvas.height;
  
  // 基础配置
  const PADDING = 60;   // 左右边距
  const CONTENT_W = W - PADDING * 2;
  const PRIMARY_COLOR = '#6A4C9C'; // 主紫色
  const TEXT_COLOR = '#333333';
  const SUB_TEXT_COLOR = '#666666';
  const LINE_COLOR = '#E0E0E0';
  
  // 清空画布 (背景色已在 index.ts 填充，这里不做重复填充，防止覆盖)
  // ctx.fillStyle = '#FFFDF9';
  // ctx.fillRect(0, 0, W, H);

  let currentY = 100; // 当前绘制高度游标

  // ===========================================
  // 1. 绘制头部：MBTI + 身份 + Slogan
  // ===========================================
  
  // 1.1 MBTI 大字 (如 INFP)
  ctx.font = 'bold 160px "Didot", "Times New Roman", serif';
  ctx.fillStyle = PRIMARY_COLOR;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  
  const mbtiText = uiData.poster.type || 'INFP';
  ctx.fillText(mbtiText, PADDING, currentY);
  
  // 装饰星星 ✨
  ctx.font = '60px serif';
  ctx.fillText('✨', PADDING - 40, currentY + 20);

  currentY += 180;

  // 1.2 身份标题 (如 "住在云端的造梦师")
  ctx.font = 'bold 56px sans-serif';
  ctx.fillStyle = TEXT_COLOR;
  ctx.fillText(uiData.poster.title || '', PADDING, currentY);
  
  currentY += 100;

  // 1.3 Slogan (如 "一部充满奇幻色彩...")
  ctx.font = '36px sans-serif';
  ctx.fillStyle = SUB_TEXT_COLOR;
  const slogan = `"${uiData.poster.life_script || ''}"`;
  // 简单换行处理
  wrapText(ctx, slogan, PADDING, currentY, CONTENT_W, 54);
  
  // 更新高度 (估算占了2行)
  currentY += 140;

  // ===========================================
  // 2. 绘制 塔罗牌 (右上角/或根据布局)
  // ===========================================
  // 如果你想让塔罗牌像参考图那样稍微倾斜、浮在右上角
  if (drawData.tarot && drawData.tarot.image) {
    try {
      const tarotImg = canvas.createImage();
      tarotImg.src = drawData.tarot.image;
      
      await new Promise((resolve) => {
        tarotImg.onload = resolve;
        tarotImg.onerror = resolve; // 失败也不卡死
      });

      const cardW = 280;
      const cardH = 460;
      
      ctx.save();
      // 定位到右上角
      ctx.translate(W - PADDING - 180, 120); 
      ctx.rotate(5 * Math.PI / 180); // 旋转 5 度
      
      // 画阴影
      ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
      
      // 画图片
      // 先画一个圆角矩形剪切
      drawRoundedRect(ctx, 0, 0, cardW, cardH, 20);
      ctx.clip();
      ctx.drawImage(tarotImg, 0, 0, cardW, cardH);
      ctx.restore();

    } catch (e) {
      console.error('Canvas塔罗牌绘制失败', e);
    }
  }

  // ===========================================
  // 3. 绘制 维度进度条 (E/I, S/N...)
  // ===========================================
  currentY += 40; // 增加一点间距
  
  const trends = uiData.trends || [];
  const barHeight = 8;
  const barWidth = 400; // 进度条宽度
  const barX = (W - barWidth) / 2; // 居中

  trends.forEach((item: any) => {
    const rowY = currentY + 30; // 这一行的中心Y

    // 3.1 左右字母 (E ... I)
    ctx.font = 'bold 44px "Didot", serif';
    ctx.fillStyle = item.isLeftWin ? PRIMARY_COLOR : '#E0E0E0';
    ctx.textAlign = 'center';
    ctx.fillText(item.leftChar, PADDING + 30, rowY - 15);

    ctx.fillStyle = !item.isLeftWin ? PRIMARY_COLOR : '#E0E0E0';
    ctx.fillText(item.rightChar, W - PADDING - 30, rowY - 15);

    // 3.2 进度条轨道
    ctx.fillStyle = '#F5F5F5';
    drawRoundedRect(ctx, barX, rowY, barWidth, barHeight, barHeight/2);
    ctx.fill();

    // 3.3 进度条填充 (紫色)
    // score 是 0-100，表示右边占比? 还是优势方占比? 
    // 假设 item.score 是优势方的百分比，这里简单处理：
    // 我们假设 score 代表的是 "右边的能量值" (0-100)
    // 但通常 MBTI 数据比较复杂，这里根据你的 WXML 逻辑：
    // style="width: {{100 - item.score}}%;" 看起来 score 是左边的值？
    // 让我们做个简单的映射，假设 dotPosition 是 0(左) 到 1(右)
    let dotPercent = (100 - item.score) / 100; // 根据 WXML 推断
    
    // 绘制填充条 (从左到点)
    ctx.fillStyle = '#D1C4E9'; // 浅紫
    const fillW = barWidth * dotPercent;
    drawRoundedRect(ctx, barX, rowY, fillW, barHeight, barHeight/2);
    ctx.fill();

    // 3.4 圆点
    const dotX = barX + fillW;
    ctx.fillStyle = PRIMARY_COLOR;
    ctx.beginPath();
    ctx.arc(dotX, rowY + barHeight/2, 10, 0, Math.PI * 2);
    ctx.fill();
    // 圆点光晕
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 🔥🔥 3.5 补全缺失：悬浮胶囊 (Floating Pill) 🔥🔥
    if (item.statusText) {
      const pillText = item.statusText;
      ctx.font = 'bold 24px sans-serif';
      const textMetrics = ctx.measureText(pillText);
      const pillW = textMetrics.width + 30;
      const pillH = 44;
      // 气泡在进度条上方
      const pillX = dotX - pillW / 2;
      const pillY = rowY - 60; 

      // 画气泡背景
      ctx.fillStyle = '#F3E5F5'; // 极浅紫
      drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 12);
      ctx.fill();
      
      // 画小三角
      ctx.beginPath();
      ctx.moveTo(dotX - 8, pillY + pillH);
      ctx.lineTo(dotX + 8, pillY + pillH);
      ctx.lineTo(dotX, pillY + pillH + 8);
      ctx.fill();

      // 画文字
      ctx.fillStyle = PRIMARY_COLOR;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, dotX, pillY + pillH/2);
    }

    currentY += 100; // 下一行
  });

  // ===========================================
  // 4. 虚线分割线
  // ===========================================
  currentY += 20;
  ctx.strokeStyle = '#D7CCC8';
  ctx.lineWidth = 2;
  ctx.setLineDash([15, 15]); // 虚线样式
  ctx.beginPath();
  ctx.moveTo(PADDING, currentY);
  ctx.lineTo(W - PADDING, currentY);
  ctx.stroke();
  ctx.setLineDash([]); // 恢复实线

  currentY += 60;

  // ===========================================
  // 5. 灵魂配方区 (带大括号)
  // ===========================================
  
  // 5.1 标题
  ctx.textAlign = 'center';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#8D6E63'; // 深咖色
  ctx.fillText('✨ 你的专属灵魂配方 ✨', W / 2, currentY);
  
  currentY += 50;

  // 🔥🔥 5.2 补全缺失：绘制大括号 [ ] 🔥🔥
  // 括号包裹住贴纸区域
  const bracketTop = currentY - 10;
  const bracketBottom = currentY + 100; // 预估高度
  const bracketLeft = PADDING + 20;
  const bracketRight = W - PADDING - 20;
  const hookSize = 20;

  ctx.beginPath();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#D7CCC8';
  ctx.lineCap = 'round';

  // 左括号 [
  ctx.moveTo(bracketLeft + hookSize, bracketTop);
  ctx.lineTo(bracketLeft, bracketTop);
  ctx.lineTo(bracketLeft, bracketBottom);
  ctx.lineTo(bracketLeft + hookSize, bracketBottom);
  
  // 右括号 ]
  ctx.moveTo(bracketRight - hookSize, bracketTop);
  ctx.lineTo(bracketRight, bracketTop);
  ctx.lineTo(bracketRight, bracketBottom);
  ctx.lineTo(bracketRight - hookSize, bracketBottom);
  
  ctx.stroke();

  // 5.3 绘制贴纸 (Stickers)
  // 简单排版：居中显示
  const stickers = drawData.stickers || [];
  let stickerX = W / 2 - (stickers.length * 160) / 2 + 80; // 简单算一下起始点
  
  stickers.forEach((sticker: any, index: number) => {
    // 简单的贴纸背景
    ctx.save();
    // 稍微随机旋转一下
    const rotateDeg = (index % 2 === 0 ? -3 : 3) * Math.PI / 180;
    
    // 计算当前贴纸位置 (这里简单处理为水平排列，实际可能需要换行逻辑)
    // 如果只有2个贴纸，居中排列
    const centerX = W/2 + (index === 0 ? -90 : 90); 
    const centerY = currentY + 45;

    ctx.translate(centerX, centerY);
    ctx.rotate(rotateDeg);

    // 画黑/白底框
    const isDark = sticker.type === 'core';
    ctx.fillStyle = isDark ? '#333333' : '#FFFFFF';
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    
    drawRoundedRect(ctx, -70, -30, 140, 60, 10);
    ctx.fill();
    if (!isDark) ctx.stroke();

    // 文字
    ctx.fillStyle = isDark ? '#FFFFFF' : '#333333';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sticker.text, 0, 0);

    ctx.restore();
  });

  currentY += 140;

  // ===========================================
  // 6. 总结金句 (带大引号)
  // ===========================================
  
  const summaryText = uiData.poster.summary || "世界或许坚硬，但谢谢你依然愿意做那个柔软的造梦者。";
  const quotePadding = PADDING + 40;
  const quoteWidth = W - quotePadding * 2;
  
  // 🔥🔥 6.1 补全缺失：绘制巨大的引号 🔥🔥
  ctx.fillStyle = '#E0E0E0'; // 浅灰色
  ctx.font = 'bold 120px serif'; // 衬线体
  
  // 左引号 (在文本左上方)
  ctx.fillText('“', quotePadding - 20, currentY); 
  
  // 文本内容
  currentY += 60; // 避开引号
  ctx.font = '34px "Kaiti", "STKaiti", serif'; // 楷体或衬线
  ctx.fillStyle = '#5D4037'; // 深棕色字体
  ctx.textAlign = 'left';
  // 文本换行
  const textHeight = wrapText(ctx, summaryText, quotePadding, currentY, quoteWidth, 56);
  
  // 右引号 (在文本右下方)
  ctx.fillStyle = '#E0E0E0';
  ctx.font = 'bold 120px serif'; 
  // 稍微往下一点
  ctx.fillText('”', W - quotePadding - 60, currentY + textHeight + 40);

  currentY += textHeight + 120;

  // ===========================================
  // 7. 底部签名
  // ===========================================
  
  // 7.1 签名
  ctx.textAlign = 'right';
  ctx.font = 'italic 32px serif';
  ctx.fillStyle = '#333333';
  ctx.fillText('Signature: @Omega_AI', W - PADDING, currentY);
  
  // 7.2 日期
  currentY += 40;
  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#999999';
  ctx.fillText(`Date: 2026.01.07`, W - PADDING, currentY);

  // (如果需要二维码，可以画在左下角，参考图里只有签名)
};

/**
 * 辅助函数：绘制圆角矩形
 */
function drawRoundedRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * 辅助函数：自动换行文字
 * 返回文字总高度
 */
function wrapText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const chars = text.split('');
  let line = '';
  let startY = y;
  
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
  
  return y - startY; // 返回高度差
}