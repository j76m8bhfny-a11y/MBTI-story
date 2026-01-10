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

  // 定义一些颜色常量，方便统一管理
  private colors = {
    bg: '#FFFDF9', // 米白背景
    primary: '#6A4C9C', // 主紫
    secondary: '#8D6E63', // 深咖
    line: '#EAEAEA',
    cardStub: '#EFEBE4' // 票根背景色
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

  async drawPoster(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // 1. 绘制全局背景 (毛玻璃背景图)
      this.drawGlobalBackground();
      
      // 2. 绘制白色卡片主体 (头部 + 趋势)
      const cardX = 20; // 左右边距
      const cardWidth = this.width - 40;
      const headerHeight = 420; // 头部高度估算
      
      this.drawCardHeader(cardX, 60, cardWidth, headerHeight);

      // 3. 绘制撕裂线 (连接处)
      const tearY = 60 + headerHeight;
      this.drawTearLine(cardX, tearY, cardWidth);

      // 4. 绘制票根 (Card Stub)
      const stubY = tearY + 20; // 撕裂线的高度
      const stubHeight = this.height - stubY - 40; // 留出底部空间
      this.drawCardStub(cardX, stubY, cardWidth, stubHeight);

      // 5. 绘制锯齿底边
      this.drawZigzagBottom(cardX, stubY + stubHeight, cardWidth);

      // 6. 完成绘制
      this.ctx.draw(false, () => {
        setTimeout(() => resolve(true), 300);
      });
    });
  }
  async drawPoster(): Promise<boolean> {
    // 1. 预处理：如果是云链接，先下载为本地路径
    await this.preloadBgImage();

    // 2. 原有的绘制逻辑
    return new Promise((resolve, reject) => {
      // 1. 绘制全局背景
      this.drawGlobalBackground();
      
      // 2. 绘制白色卡片主体
      const cardX = 20; 
      const cardWidth = this.width - 40;
      const headerHeight = 420; 
      
      this.drawCardHeader(cardX, 60, cardWidth, headerHeight);

      // 3. 绘制撕裂线
      const tearY = 60 + headerHeight;
      this.drawTearLine(cardX, tearY, cardWidth);

      // 4. 绘制票根
      const stubY = tearY + 20; 
      const stubHeight = this.height - stubY - 40; 
      this.drawCardStub(cardX, stubY, cardWidth, stubHeight);

      // 5. 绘制锯齿底边
      this.drawZigzagBottom(cardX, stubY + stubHeight, cardWidth);

      // 6. 完成绘制
      this.ctx.draw(false, () => {
        setTimeout(() => resolve(true), 300);
      });
    });
  }

  // 🔥【修改点 2】: 新增预加载图片方法
  private async preloadBgImage() {
    const bgImage = this.ui?.poster?.bg_image;

    // 检查是否包含云存储 ID
    if (bgImage && bgImage.startsWith('cloud://')) {
      try {
        // console.log('正在下载海报背景图...', bgImage);
        const res = await wx.cloud.downloadFile({
          fileID: bgImage
        });
        
        if (res.statusCode === 200) {
          // 关键：将 cloud://ID 替换为本地临时路径 (http://tmp/...)
          // 这样 drawImage 才能正常识别
          this.ui.poster.bg_image = res.tempFilePath;
        }
      } catch (err) {
        console.error('❌ 海报背景图下载失败:', err);
        // 如果下载失败，设为 null，drawGlobalBackground 会自动降级显示纯色背景
        this.ui.poster.bg_image = null;
      }
    }
  }
  /**
   * 1. 全局背景
   */
  private drawGlobalBackground() {
    // 绘制图片背景（如果有）
    if (this.ui?.poster?.bg_image) {
       this.ctx.drawImage(this.ui.poster.bg_image, 0, 0, this.width, this.height);
       // 叠加一层白色半透明，模拟 blur 后的变亮效果
       this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
       this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
       this.ctx.fillStyle = this.colors.bg;
       this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  /**
   * 2. 卡片头部 (身份 + 趋势图)
   */
  private drawCardHeader(x: number, y: number, w: number, h: number) {
    this.ctx.save();
    
    // 绘制圆角矩形背景 (只上面圆角)
    this.ctx.beginPath();
    const r = 12; // 圆角半径
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    this.ctx.lineTo(x + w, y + h); // 底部直角
    this.ctx.lineTo(x, y + h);     // 底部直角
    this.ctx.arc(x + r, y + r, r, Math.PI, -Math.PI / 2);
    this.ctx.closePath();
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
    
    // --- 内容绘制 ---
    const centerX = x + w / 2;
    const padding = 20;

    // MBTI 大字
    this.ctx.fillStyle = this.colors.primary;
    this.ctx.font = 'bold 48px serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(this.ui.poster.type || 'MBTI', x + padding, y + 60);

    // 角色标题
    this.ctx.fillStyle = '#333';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.fillText(this.ui.poster.title || '角色', x + padding, y + 95);

    // Slogan (自动换行)
    this.ctx.fillStyle = '#666';
    this.ctx.font = '12px sans-serif';
    this.drawWrappedText(`"${this.ui.poster.life_script}"`, x + padding, y + 125, w - padding * 2, 18);

    // 绘制趋势图 (Trends)
    this.drawTrends(x + padding, y + 200, w - padding * 2);

    this.ctx.restore();
  }

  /**
   * 绘制趋势图条目
   */
  private drawTrends(x: number, y: number, w: number) {
    const trends = this.ui.trends || [];
    const rowHeight = 35;

    trends.forEach((item: any, i: number) => {
        const rowY = y + i * rowHeight;
        const cy = rowY - 5; // 垂直中心微调

        // 左字
        this.ctx.fillStyle = item.isLeftWin ? this.colors.primary : '#E0E0E0';
        this.ctx.font = item.isLeftWin ? 'bold 16px serif' : '14px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(item.leftChar, x + 10, rowY);

        // 进度条轨道
        const barX = x + 30;
        const barW = w - 60;
        this.ctx.fillStyle = '#F5F5F5';
        this.ctx.beginPath();
        this.roundRect(barX, cy - 3, barW, 6, 3);
        this.ctx.fill();

        // 进度条填充 (计算长度)
        // 注意：item.score 是 0-100，这里我们假设它表示"左边输了多少"或者"右边赢了多少"
        // 简单处理：我们画一个固定长度或者根据 score 画
        // 根据你的 WXML: style="width: {{100 - item.score}}%;"
        const pct = (100 - item.score) / 100;
        const fillW = barW * pct;

        this.ctx.fillStyle = '#D1C4E9';
        this.ctx.beginPath();
        this.roundRect(barX, cy - 3, fillW, 6, 3);
        this.ctx.fill();

        // 圆点
        const dotX = barX + fillW;
        this.ctx.fillStyle = this.colors.primary;
        this.ctx.beginPath();
        this.ctx.arc(dotX, cy, 4, 0, 2 * Math.PI);
        this.ctx.fill();

        // 右字
        this.ctx.fillStyle = !item.isLeftWin ? this.colors.primary : '#E0E0E0';
        this.ctx.font = !item.isLeftWin ? 'bold 16px serif' : '14px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(item.rightChar, x + w - 10, rowY);
    });
  }

  /**
   * 3. 绘制撕裂线 (模拟 notch 效果)
   */
  private drawTearLine(x: number, y: number, w: number) {
    const height = 24;
    
    // 上半部分背景 (接 Header)
    this.ctx.fillStyle = '#FFFFFF'; // 上面是白
    this.ctx.fillRect(x, y, w, height / 2);
    
    // 下半部分背景 (接 Stub)
    this.ctx.fillStyle = this.colors.cardStub; // 下面是米灰
    this.ctx.fillRect(x, y + height / 2, w, height / 2);

    // 绘制左右两个半圆缺口，实现“撕票”效果
    this.ctx.fillStyle = this.colors.bg; // 用全局背景色填充缺口
    // 左缺口
    this.ctx.beginPath();
    this.ctx.arc(x, y + height / 2, 10, 0, 2 * Math.PI);
    this.ctx.fill();
    // 右缺口
    this.ctx.beginPath();
    this.ctx.arc(x + w, y + height / 2, 10, 0, 2 * Math.PI);
    this.ctx.fill();

    // 绘制中间虚线
    this.ctx.strokeStyle = '#D7CCC8';
    this.ctx.setLineDash([4, 4]);
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x + 20, y + height / 2);
    this.ctx.lineTo(x + w - 20, y + height / 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]); // 还原
  }

  /**
   * 4. 绘制票根 (配方 + 签名)
   */
  private drawCardStub(x: number, y: number, w: number, h: number) {
    this.ctx.fillStyle = this.colors.cardStub;
    this.ctx.fillRect(x, y, w, h);

    const centerX = x + w / 2;

    // --- 灵魂配方 (Brackets) ---
    const recipeY = y + 20;
    const bracketW = w * 0.9;
    const bracketX = x + (w - bracketW) / 2;
    const bracketH = 100; // 括号区域高度

    // 绘制括号
    this.ctx.strokeStyle = '#D7CCC8';
    this.ctx.lineWidth = 2;
    const r = 6;
    
    // 左括号 [
    this.ctx.beginPath();
    this.ctx.moveTo(bracketX + 10, recipeY); // 上横
    this.ctx.lineTo(bracketX + r, recipeY); 
    this.ctx.arc(bracketX + r, recipeY + r, r, -Math.PI / 2, Math.PI, true); // 左上角
    this.ctx.lineTo(bracketX, recipeY + bracketH - r); // 竖
    this.ctx.arc(bracketX + r, recipeY + bracketH - r, r, Math.PI, Math.PI / 2, true); // 左下角
    this.ctx.lineTo(bracketX + 10, recipeY + bracketH); // 下横
    this.ctx.stroke();

    // 右括号 ]
    const rightX = bracketX + bracketW;
    this.ctx.beginPath();
    this.ctx.moveTo(rightX - 10, recipeY);
    this.ctx.lineTo(rightX - r, recipeY);
    this.ctx.arc(rightX - r, recipeY + r, r, -Math.PI / 2, 0, false);
    this.ctx.lineTo(rightX, recipeY + bracketH - r);
    this.ctx.arc(rightX - r, recipeY + bracketH - r, r, 0, Math.PI / 2, false);
    this.ctx.lineTo(rightX - 10, recipeY + bracketH);
    this.ctx.stroke();

    // 标题
    this.ctx.fillStyle = this.colors.secondary;
    this.ctx.font = 'bold 10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('✨ 你的专属灵魂配方 ✨', centerX, recipeY + 15);

    // 绘制贴纸 (带旋转)
    this.drawStickers(centerX, recipeY + 50);

    // 金句
    this.ctx.fillStyle = this.colors.secondary;
    this.ctx.font = '12px Kaiti, serif'; // 楷体
    this.ctx.textAlign = 'center';
    this.drawWrappedText(this.ui.poster.summary || '暂无总结', centerX, recipeY + 130, w - 60, 20);

    // 签名
    const sigY = y + h - 40;
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#333';
    this.ctx.font = '12px serif';
    this.ctx.fillText('Signature: @Omega_AI', x + w - 20, sigY);
    this.ctx.fillStyle = '#999';
    this.ctx.font = '10px sans-serif';
    this.ctx.fillText('Date: 2026.01.07', x + w - 20, sigY + 15);
  }

  /**
   * 绘制贴纸 (支持旋转)
   */
  private drawStickers(centerX: number, startY: number) {
    const stickers = this.stickers || [];
    let currentX = centerX - 120; 
    let currentY = startY;

    stickers.forEach((sticker, idx) => {
       const text = sticker.text;
       // 估算宽度
       const textWidth = text.length * 12 + 20;
       const height = 24;

       // 换行简单的逻辑
       if (currentX + textWidth > centerX + 120) {
         currentX = centerX - 120;
         currentY += 35;
       }

       this.ctx.save();
       // 移动到贴纸中心
       const rectCenterX = currentX + textWidth / 2;
       const rectCenterY = currentY + height / 2;
       this.ctx.translate(rectCenterX, rectCenterY);
       
       // 随机旋转 (模拟 CSS 的 randomStyle)
       // Canvas 的旋转单位是弧度。这里简单模拟 -5度 到 5度
       const angle = (Math.random() * 10 - 5) * Math.PI / 180;
       this.ctx.rotate(angle);

       // 绘制背景
       if (sticker.type === 'core') {
         this.ctx.fillStyle = '#2C2C2C';
         this.ctx.fillRect(-textWidth/2, -height/2, textWidth, height);
         this.ctx.fillStyle = '#FFF';
       } else if (sticker.type === 'trait') {
         this.ctx.fillStyle = '#FFF';
         this.ctx.strokeStyle = '#333';
         this.ctx.lineWidth = 1;
         this.ctx.fillRect(-textWidth/2, -height/2, textWidth, height);
         this.ctx.strokeRect(-textWidth/2, -height/2, textWidth, height);
         this.ctx.fillStyle = '#333';
       } else {
         // egg
         this.ctx.fillStyle = '#FFF9E6';
         this.ctx.fillRect(-textWidth/2, -height/2, textWidth, height);
         this.ctx.strokeStyle = '#8D6E63';
         this.ctx.setLineDash([3, 3]);
         this.ctx.strokeRect(-textWidth/2, -height/2, textWidth, height);
         this.ctx.setLineDash([]);
         this.ctx.fillStyle = '#8D6E63';
       }

       // 绘制文字
       this.ctx.font = 'bold 11px sans-serif';
       this.ctx.textAlign = 'center';
       this.ctx.textBaseline = 'middle';
       this.ctx.fillText(text, 0, 0);

       this.ctx.restore();

       currentX += textWidth + 10;
    });
  }

  /**
   * 5. 绘制锯齿底边 (Zigzag)
   */
  private drawZigzagBottom(x: number, y: number, w: number) {
    const toothWidth = 10;
    const toothHeight = 6;
    const teethCount = Math.floor(w / toothWidth);

    this.ctx.fillStyle = this.colors.cardStub;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);

    for (let i = 0; i < teethCount; i++) {
      // 绘制倒三角
      const startX = x + i * toothWidth;
      this.ctx.lineTo(startX + toothWidth / 2, y + toothHeight);
      this.ctx.lineTo(startX + toothWidth, y);
    }
    
    // 闭合路径（虽然 fill 不需要闭合这部分，但为了逻辑完整）
    this.ctx.lineTo(x, y); 
    this.ctx.fill();
  }

  /**
   * 工具：导出图片
   */
  exportToImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvasId: this.canvasId,
        destWidth: this.width * 2,
        destHeight: this.height * 2,
        success: (res: any) => resolve(res.tempFilePath),
        fail: (err: any) => reject(err)
      }, this.context);
    });
  }

  // 工具：画圆角矩形
  private roundRect(x: number, y: number, w: number, h: number, r: number) {
     if (w < 2 * r) r = w / 2;
     if (h < 2 * r) r = h / 2;
     this.ctx.moveTo(x + r, y);
     this.ctx.arcTo(x + w, y, x + w, y + h, r);
     this.ctx.arcTo(x + w, y + h, x, y + h, r);
     this.ctx.arcTo(x, y + h, x, y, r);
     this.ctx.arcTo(x, y, x + w, y, r);
  }

  // 工具：文字自动换行
  private drawWrappedText(text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    if (!text) return;
    const words = text.split('');
    let line = '';
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n];
      const metrics = this.ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        this.ctx.fillText(line, x, y);
        line = words[n];
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    this.ctx.fillText(line, x, y);
  }
}