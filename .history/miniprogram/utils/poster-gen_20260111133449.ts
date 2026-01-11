// miniprogram/utils/poster-gen.ts

export const drawPoster = async (canvas: any, ctx: any, data: any, pixelRatio: number) => {
  const width = canvas.width;
  const height = canvas.height;

  // --- 1. 绘制背景 ---
  ctx.fillStyle = '#FFFDF5'; // 柔和的米色背景
  ctx.fillRect(0, 0, width, height);

  // 绘制顶部装饰圆
  ctx.beginPath();
  ctx.arc(width / 2, -100, width * 0.8, 0, 2 * Math.PI);
  ctx.fillStyle = '#FFE4C4'; // 浅杏色
  ctx.fill();

  // --- 2. 绘制标题 ---
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  // 主标题 (MBTI 类型)
  ctx.font = `bold ${60 * pixelRatio}px sans-serif`;
  ctx.fillStyle = '#333333';
  ctx.fillText(data.type, width / 2, 80 * pixelRatio);

  // 副标题 (角色名)
  ctx.font = `bold ${32 * pixelRatio}px sans-serif`;
  ctx.fillStyle = '#666666';
  ctx.fillText(data.name, width / 2, 160 * pixelRatio);

  // --- 3. 绘制标签 (气泡风格) ---
  const tags = data.tags || [];
  const startY = 240 * pixelRatio;
  const gap = 30 * pixelRatio;
  let currentX = width / 2 - ((tags.length - 1) * (100 * pixelRatio + gap)) / 2;

  tags.forEach((tag: string) => {
    // 绘制圆角矩形背景 (简化版，直接画圆或者椭圆)
    ctx.font = `${24 * pixelRatio}px sans-serif`;
    const textWidth = ctx.measureText(tag).width + 40 * pixelRatio;
    
    ctx.fillStyle = '#FFF';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0,0,0,0.05)';
    // 简单绘制一个胶囊背景
    ctx.fillRect(currentX - textWidth/2, startY, textWidth, 50 * pixelRatio);
    ctx.shadowBlur = 0; // 重置阴影

    ctx.fillStyle = '#FF9F43';
    ctx.fillText(tag, currentX, startY + 12 * pixelRatio); // 这里的Y可能需要微调居中
    
    // 如果想要更复杂的圆角矩形，需要单独写一个 helper 函数
    currentX += textWidth + 10 * pixelRatio; // 简单的累加
  });
  
  // --- 4. 绘制核心文案 (自动换行) ---
  const desc = data.desc || "暂无描述";
  ctx.font = `${26 * pixelRatio}px sans-serif`;
  ctx.fillStyle = '#555555';
  ctx.textAlign = 'left';
  
  const contentX = 60 * pixelRatio;
  const contentY = 350 * pixelRatio;
  const maxWidth = width - 120 * pixelRatio;
  const lineHeight = 45 * pixelRatio;

  drawWrappedText(ctx, desc, contentX, contentY, maxWidth, lineHeight);

  // --- 5. 绘制底部二维码区域 ---
  const qrY = height - 280 * pixelRatio;
  
  // 分割线
  ctx.strokeStyle = '#EEEEEE';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40 * pixelRatio, qrY - 40 * pixelRatio);
  ctx.lineTo(width - 40 * pixelRatio, qrY - 40 * pixelRatio);
  ctx.stroke();

  // 绘制二维码占位符 (如果有真实二维码图片路径，需先 canvas.createImage)
  // 这里画一个灰色方块示意
  const qrSize = 160 * pixelRatio;
  const qrX = (width - qrSize) / 2;
  
  ctx.fillStyle = '#EEEEEE';
  ctx.fillRect(qrX, qrY, qrSize, qrSize);
  
  ctx.font = `${20 * pixelRatio}px sans-serif`;
  ctx.fillStyle = '#999999';
  ctx.textAlign = 'center';
  ctx.fillText("长按识别二维码，测测你的灵魂", width / 2, qrY + qrSize + 30 * pixelRatio);

  return true;
};

// 辅助：文字换行处理
function drawWrappedText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split('');
  let line = '';
  
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n];
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}