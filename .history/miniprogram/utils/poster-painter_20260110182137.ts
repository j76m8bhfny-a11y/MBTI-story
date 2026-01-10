// miniprogram/utils/poster-painter.ts

export interface PosterConfig {
  canvasId: string;
  width: number;
  height: number;
  ui: any;
  stickers: any[];
  context: any;
}

export class PosterPainter {
  private ctx: any;
  private canvasId: string;
  private width: number;
  private height: number;
  private ui: any;
  private stickers: any[];
  private context: any;

  // 颜色常量 (必须与 CSS index.wxss 保持 100% 一致)
  private colors = {
    bg: '#FFFDF9',        // 全局背景
    white: '#FFFFFF',
    primary: '#6A4C9C',   // 主紫
    primaryLight: '#D1C4E9', // 浅紫进度条
    pillBg: '#F3E5F5',    // 胶囊背景
    secondary: '#8D6E63', // 深咖
    line: '#D7CCC8',      // 虚线颜色
    cardStub: '#EFEBE4',  // 票根背景 (关键：要和 CSS .card-stub 一致)
    textMain: '#333333',
    textSub: '#666666',
    grayText: '#E0E0E0'
  };

  constructor(config: PosterConfig) {
    this.canvasId = config.canvasId;
    this.width = config.width;
    this.height = config.height;
    this.ui = config.ui;
    this.stickers = config.stickers;
    this.context = config.context;
    
    this.ctx = wx.createCanvasContext(this.canvasId, this.context);
  }

  // 预加载逻辑保持不变
  async preloadBgImage() {
    const bgImage = this.ui?.poster?.bg_image;
    if (bgImage && bgImage.startsWith('cloud://')) {
      try {
        const res = await wx.cloud.downloadFile({ fileID: bgImage });
        if (res.statusCode === 200) {
          this.ui.poster.bg_image = res.tempFilePath;
        }
      } catch (err) {
        console.error('海报背景图下载失败', err);
        this.ui.poster.bg_image = null;
      }
    }
  }

  async drawPoster(): Promise<boolean> {
    await this.preloadBgImage();

    return new Promise((resolve) => {
      // 1. 全局背景
      this.drawGlobalBackground();

      // 卡片布局参数
      const cardX = 20; 
      const cardWidth = this.width - 40;
      // 动态计算高度：CSS中 padding 是 70rpx + 内容，这里我们要估算得准一点
      // 头部高度包含：Icon + MBTI(100rpx) + Title + Slogan + Trends
      const headerHeight = 460; 

      // 开启卡片阴影 (模拟 drop-shadow)
      this.ctx.setShadow(0, 10, 30, 'rgba(106, 76, 156, 0.15)');

      // 2. 绘制白色卡片头部
      this.drawCardHeader(cardX, 60, cardWidth, headerHeight);

      // 3. 绘制撕裂线 (连接处)
      // 注意：撕裂线不需要阴影，或者阴影要连贯，这里为了简单先关掉阴影，防止接缝处有黑线
      this.ctx.setShadow(0, 0, 0, 'transparent'); 
      const tearY = 60 + headerHeight;
      this.drawTearLine(cardX, tearY, cardWidth);

      // 4. 绘制票根 (Card Stub)
      const stubY = tearY + 24; // 撕裂线高度是 24
      const stubHeight = this.height - stubY - 50; // 底部留白
      this.drawCardStub(cardX, stubY, cardWidth, stubHeight);

      // 5. 绘制锯齿底边
      this.drawZigzagBottom(cardX, stubY + stubHeight, cardWidth);

      this.ctx.draw(false, () => {
        setTimeout(() => resolve(true), 300);
      });
    });
  }

  private drawGlobalBackground() {
    if (this.ui?.poster?.bg_image) {
       this.ctx.drawImage(this.ui.poster.bg_image, 0, 0, this.width, this.height);
       this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; // 加重一点白色遮罩，模仿 CSS 的 noise+overlay
       this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
       this.ctx.fillStyle = this.colors.bg;
       this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  // === 2. 头部 ===
  private drawCardHeader(x: number, y: number, w: number, h: number) {
    this.ctx.save();
    
    // 背景
    this.ctx.beginPath();
    const r = 12; 
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    this.ctx.lineTo(x + w, y + h); 
    this.ctx.lineTo(x, y + h);     
    this.ctx.arc(x + r, y + r, r, Math.PI, -Math.PI / 2);
    this.ctx.closePath();
    this.ctx.fillStyle = this.colors.white;
    this.ctx.fill();
    
    // 关闭阴影绘制内容，防止文字模糊
    this.ctx.setShadow(0, 0, 0, 'transparent');

    const padding = 20;
    const contentX = x + padding;

    // Sparkle Icon
    this.ctx.fillStyle = this.colors.primary;
    this.ctx.font = '20px serif';
    this.ctx.fillText('✨', contentX - 5, y + 40);

    // MBTI Type (Didot font style -> serif bold)
    this.ctx.fillStyle = this.colors.primary;
    this.ctx.font = 'bold 50px serif'; // 对应 CSS 100rpx
    this.ctx.textAlign = 'left';
    this.ctx.fillText(this.ui.poster.type || 'MBTI', contentX, y + 80);

    // Role Title
    this.ctx.fillStyle = this.colors.textMain;
    this.ctx.font = 'bold 17px sans-serif'; // 对应 CSS 34rpx
    this.ctx.fillText(this.ui.poster.title || '角色', contentX, y + 115);

    // Slogan
    this.ctx.fillStyle = this.colors.textSub;
    this.ctx.font = '12px sans-serif'; // 对应 CSS 24rpx
    this.drawWrappedText(`"${this.ui.poster.life_script}"`, contentX, y + 145, w - padding * 2, 18);

    // Trends Chart
    this.drawTrends(contentX, y + 220, w - padding * 2); // 下移一点给 Slogan 留空间

    this.ctx.restore();
  }

  // === 核心修复：趋势图 + 胶囊 ===
  private drawTrends(x: number, y: number, w: number) {
    const trends = this.ui.trends || [];
    const rowHeight = 45; // 增加行高，给胶囊留位置

    trends.forEach((item: any, i: number) => {
        const rowY = y + i * rowHeight;
        const cy = rowY + 10; // 进度条垂直中心

        // 1. 左右字母
        const leftIsWin = item.isLeftWin;
        // 左字
        this.ctx.fillStyle = leftIsWin ? this.colors.primary : this.colors.grayText;
        this.ctx.font = leftIsWin ? 'bold 20px serif' : '16px serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(item.leftChar, x + 10, cy);

        // 右字
        this.ctx.fillStyle = !leftIsWin ? this.colors.primary : this.colors.grayText;
        this.ctx.font = !leftIsWin ? 'bold 20px serif' : '16px serif';
        this.ctx.fillText(item.rightChar, x + w - 10, cy);

        // 2. 进度条容器
        const barX = x + 35;
        const barW = w - 70;
        const barH = 3; // CSS 是 6rpx -> 3px
        
        // 灰色轨道
        this.ctx.fillStyle = '#F5F5F5';
        this.roundRect(barX, cy - barH/2, barW, barH, barH/2);
        this.ctx.fill();

        // 紫色填充
        // item.score 是输的一方的分数(0-50)？还是赢的百分比？
        // 根据 WXML: style="width: {{100 - item.score}}%;"
        // 假设 item.score 是右边的权重，100-score 是左边的长度
        const pct = (100 - item.score) / 100;
        const fillW = barW * pct;

        this.ctx.fillStyle = this.colors.primaryLight;
        this.roundRect(barX, cy - barH/2, fillW, barH, barH/2);
        this.ctx.fill();

        // 3. 圆点 (Dot)
        const dotX = barX + fillW;
        this.ctx.fillStyle = this.colors.primary;
        this.ctx.beginPath();
        this.ctx.arc(dotX, cy, 4, 0, 2 * Math.PI);
        this.ctx.fill();
        // 圆点白色描边
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // 4. 🔥 绘制胶囊 (Pill) 🔥
        // 胶囊位置：圆点上方，cy - 10(margin) - 10(half height)
        const text = item.statusText;
        this.ctx.font = 'bold 10px sans-serif';
        const metrics = this.ctx.measureText(text);
        const textW = metrics.width;
        const pillW = textW + 16; // padding
        const pillH = 18;
        const pillY = cy - 20; 

        // 计算胶囊 X 坐标 (注意边缘碰撞逻辑)
        let pillX = dotX - pillW / 2;
        let triangleX = dotX; // 三角形尖角始终指向圆点
        
        // 左边界处理
        if (pillX < barX) {
            pillX = barX - 5; // 稍微左移一点，类似 CSS margin-left: -10rpx
        }
        // 右边界处理
        if (pillX + pillW > barX + barW) {
            pillX = barX + barW - pillW + 5;
        }

        // 画胶囊背景
        this.ctx.fillStyle = this.colors.pillBg;
        this.roundRect(pillX, pillY, pillW, pillH, 6);
        this.ctx.fill();

        // 画小三角 (指向圆点)
        this.ctx.beginPath();
        this.ctx.moveTo(triangleX, pillY + pillH + 4); // 尖端
        this.ctx.lineTo(triangleX - 4, pillY + pillH); // 左上
        this.ctx.lineTo(triangleX + 4, pillY + pillH); // 右上
        this.ctx.fill();

        // 画胶囊文字
        this.ctx.fillStyle = this.colors.primary;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(text, pillX + 8, pillY + 3); // +8 是 padding-left
    });
  }

  // === 3. 撕裂线 ===
  private drawTearLine(x: number, y: number, w: number) {
    const height = 24;
    const r = 10; // 缺口半径

    // 上半截：白色
    this.ctx.fillStyle = this.colors.white;
    this.ctx.fillRect(x, y, w, height/2);
    // 下半截：票根色
    this.ctx.fillStyle = this.colors.cardStub;
    this.ctx.fillRect(x, y + height/2, w, height/2);

    // 绘制左右缺口 (用背景色覆盖)
    // 这里要注意：如果背景是复杂的图，这种覆盖法会露馅。
    // 但因为我们前面画了带透明的背景，这里最好是用 globalCompositeOperation = 'destination-out' 擦除，
    // 不过小程序 Canvas 上下文不一定完全支持 complex 模式，且背景有图。
    // 妥协方案：画一个和背景图近似颜色的圆，或者如果不追求透明背景，就画 colors.bg
    this.ctx.fillStyle = this.colors.bg; 
    
    // 左缺口
    this.ctx.beginPath();
    this.ctx.arc(x, y + height/2, r, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // 右缺口
    this.ctx.beginPath();
    this.ctx.arc(x + w, y + height/2, r, 0, 2 * Math.PI);
    this.ctx.fill();

    // 中间虚线
    this.ctx.strokeStyle = this.colors.line;
    this.ctx.setLineDash([4, 4]);
    this.ctx.lineWidth = 2; // 稍微粗一点
    this.ctx.beginPath();
    this.ctx.moveTo(x + r + 5, y + height/2);
    this.ctx.lineTo(x + w - r - 5, y + height/2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  // === 4. 票根区 ===
  private drawCardStub(x: number, y: number, w: number, h: number) {
    this.ctx.fillStyle = this.colors.cardStub;
    this.ctx.fillRect(x, y, w, h);

    const centerX = x + w / 2;
    const recipeY = y + 20;
    
    // 1. 绘制大括号 (模仿 CSS border 样式)
    const bracketW = w * 0.9;
    const bx = x + (w - bracketW) / 2;
    const bh = 110; // 括号高度
    const br = 6;   // 拐角半径

    this.ctx.strokeStyle = this.colors.line;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';

    // 左括号 [
    this.ctx.beginPath();
    this.ctx.moveTo(bx + 8, recipeY); 
    this.ctx.lineTo(bx + br, recipeY);
    this.ctx.arc(bx + br, recipeY + br, br, -Math.PI/2, -Math.PI, true);
    this.ctx.lineTo(bx, recipeY + bh - br);
    this.ctx.arc(bx + br, recipeY + bh - br, br, -Math.PI, -Math.PI*1.5, true); // Math.PI/2
    this.ctx.lineTo(bx + 8, recipeY + bh);
    this.ctx.stroke();

    // 右括号 ]
    const rx = bx + bracketW;
    this.ctx.beginPath();
    this.ctx.moveTo(rx - 8, recipeY);
    this.ctx.lineTo(rx - br, recipeY);
    this.ctx.arc(rx - br, recipeY + br, br, -Math.PI/2, 0, false);
    this.ctx.lineTo(rx, recipeY + bh - br);
    this.ctx.arc(rx - br, recipeY + bh - br, br, 0, Math.PI/2, false);
    this.ctx.lineTo(rx - 8, recipeY + bh);
    this.ctx.stroke();

    // 2. 标题
    this.ctx.fillStyle = this.colors.secondary;
    this.ctx.font = 'bold 10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('✨ 你的专属灵魂配方 ✨', centerX, recipeY + 14);

    // 3. 贴纸
    this.drawStickers(centerX, recipeY + 55);

    // 4. 金句 (Quote)
    const quoteY = recipeY + 140;
    // 引号
    this.ctx.fillStyle = '#DDDDDD';
    this.ctx.font = 'bold 40px serif';
    this.ctx.fillText('“', x + 40, quoteY - 10);
    this.ctx.fillText('”', x + w - 40, quoteY + 20);

    // 文字
    this.ctx.fillStyle = '#62433A';
    this.ctx.font = '13px serif'; // 楷体替代
    // 增加行高
    this.drawWrappedText(this.ui.poster.summary || '', centerX, quoteY, w - 100, 22);

    // 5. 签名
    const sigY = y + h - 30;
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = this.colors.textMain;
    this.ctx.font = 'italic 14px serif';
    this.ctx.fillText('Signature: @Omega_AI', x + w - 30, sigY);
    
    this.ctx.fillStyle = '#999999';
    this.ctx.font = '10px sans-serif';
    this.ctx.fillText('Date: 2026.01.07', x + w - 30, sigY + 16);
  }

  private drawStickers(centerX: number, startY: number) {
    const stickers = this.stickers || [];
    // 简单的排版逻辑：三个一行，或者根据宽度流式
    // 这里为了还原 CSS flex-wrap center，我们手动计算每一行的宽度
    
    let currentLine: any[] = [];
    let currentW = 0;
    const maxW = 260; 
    let lineY = startY;
    const lines = [];

    // 1. 分行逻辑
    stickers.forEach(s => {
      const w = s.text.length * 12 + 24; // 估算宽度
      if (currentW + w > maxW) {
        lines.push({ items: currentLine, totalW: currentW });
        currentLine = [];
        currentW = 0;
      }
      s._width = w; // 暂存宽度
      currentLine.push(s);
      currentW += w + 10; // gap
    });
    if (currentLine.length > 0) lines.push({ items: currentLine, totalW: currentW });

    // 2. 绘制逻辑
    lines.forEach(line => {
      let startX = centerX - (line.totalW - 10) / 2; // 居中起始点
      
      line.items.forEach((s: any) => {
        const itemX = startX + s._width / 2;
        const itemY = lineY;
        
        this.ctx.save();
        this.ctx.translate(itemX, itemY);
        // 解析 randomStyle 里的 rotate，这里直接随机模拟
        const angle = (Math.random() * 6 - 3) * Math.PI / 180;
        this.ctx.rotate(angle);

        // 绘制贴纸矩形
        const hw = s._width / 2;
        const hh = 12; // height/2
        
        if (s.type === 'core') {
          this.ctx.fillStyle = '#2C2C2C';
          this.roundRect(-hw, -hh, s._width, 24, 4);
          this.ctx.fill();
          this.ctx.fillStyle = '#FFFFFF';
        } else if (s.type === 'egg') {
          this.ctx.fillStyle = '#FFF9E6';
          this.roundRect(-hw, -hh, s._width, 24, 4);
          this.ctx.fill();
          // 虚线边框
          this.ctx.strokeStyle = '#8D6E63';
          this.ctx.setLineDash([3, 2]);
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
          this.ctx.setLineDash([]);
          this.ctx.fillStyle = '#8D6E63';
        } else {
          // trait
          this.ctx.fillStyle = '#FFFFFF';
          this.roundRect(-hw, -hh, s._width, 24, 4);
          this.ctx.fill();
          this.ctx.strokeStyle = '#333333';
          this.ctx.stroke();
          this.ctx.fillStyle = '#333333';
        }

        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(s.text, 0, 0);

        this.ctx.restore();

        startX += s._width + 10;
      });

      lineY += 36; // 行高
    });
  }

  // === 5. 锯齿底边 ===
  private drawZigzagBottom(x: number, y: number, w: number) {
    // CSS 中 background-size: 40rpx 20rpx; -> 意味着一个完整的尖角宽 40rpx (20px)，高 20rpx (10px)
    // 但是 CSS gradient 实际上是两个三角形拼的，这里我们画倒三角形
    const toothW = 20; 
    const toothH = 10;
    const count = Math.ceil(w / toothW);

    this.ctx.fillStyle = this.colors.cardStub; // 和票根同色
    this.ctx.beginPath();
    this.ctx.moveTo(x, y); // 起点：票根左下角

    for (let i = 0; i < count; i++) {
        // 画一个向下的尖角
        const thisX = x + i * toothW;
        this.ctx.lineTo(thisX + toothW / 2, y + toothH);
        this.ctx.lineTo(thisX + toothW, y);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  // === 工具函数 ===
  exportToImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvasId: this.canvasId,
        // 🔥 关键：乘以 3 倍像素，保证保存到相册高清
        destWidth: this.width * 3,
        destHeight: this.height * 3,
        fileType: 'png',
        quality: 1,
        success: (res: any) => resolve(res.tempFilePath),
        fail: (err: any) => reject(err)
      }, this.context);
    });
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
     if (w < 2 * r) r = w / 2;
     if (h < 2 * r) r = h / 2;
     this.ctx.beginPath();
     this.ctx.moveTo(x + r, y);
     this.ctx.arcTo(x + w, y, x + w, y + h, r);
     this.ctx.arcTo(x + w, y + h, x, y + h, r);
     this.ctx.arcTo(x, y + h, x, y, r);
     this.ctx.arcTo(x, y, x + w, y, r);
     this.ctx.closePath();
  }

  private drawWrappedText(text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    if (!text) return;
    const words = text.split('');
    let line = '';
    
    // 如果没有内容，直接返回
    if (words.length === 0) return;

    this.ctx.textAlign = 'center'; // 强制居中
    // 稍微复杂的居中换行逻辑：先计算总行数，如果想完全模拟 flexbox 比较麻烦
    // 这里简单处理：每行都居中画
    
    // 先分行
    const lines = [];
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n];
      const metrics = this.ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line);
        line = words[n];
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    // 绘制
    lines.forEach((l, i) => {
        this.ctx.fillText(l, x, y + i * lineHeight);
    });
  }
}