/**
 * 海报绘制工具类
 * 使用 Canvas 2D API 绘制结果页海报
 */

export interface PosterConfig {
  canvasId: string;
  width: number;
  height: number;
  ui: any;
  stickers: any[];
}

export class PosterPainter {
  private ctx: any;
  private canvasId: string;
  private width: number;
  private height: number;
  private ui: any;
  private stickers: any[];

  constructor(config: PosterConfig) {
    this.canvasId = config.canvasId;
    this.width = config.width;
    this.height = config.height;
    this.ui = config.ui;
    this.stickers = config.stickers;
    
    // 获取 Canvas 上下文
    this.ctx = wx.createCanvasContext(this.canvasId);
  }

  /**
   * 绘制完整海报
   * @param useHighRes 是否使用高清背景图
   * @returns Promise<boolean> 绘制是否成功
   */
  async drawPoster(useHighRes: boolean = true): Promise<boolean> {
    return Promise.race([
      this.drawHighResPoster(),
      this.timeout(4000) // 4秒超时
    ]).catch(() => {
      console.warn('海报绘制超时，降级为纯色背景');
      return this.drawFallbackPoster();
    });
  }

  /**
   * 绘制高清海报（带背景图）
   */
  private async drawHighResPoster(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // 1. 绘制背景图
      this.drawBackground();
      
      // 2. 绘制塔罗牌（顶部居中）
      this.drawTarotCard();
      
      // 3. 绘制内容区域（居中）
      this.drawContent();
      
      // 4. 绘制二维码（底部）
      this.drawQRCode();
      
      // 5. 提交绘制
      this.ctx.draw(false, () => {
        resolve(true);
      }, (err: any) => {
        console.error('绘制失败', err);
        reject(err);
      });
    });
  }

  /**
   * 绘制降级海报（纯色背景）
   */
  private async drawFallbackPoster(): Promise<boolean> {
    return new Promise((resolve) => {
      // 1. 绘制纯色背景
      this.ctx.fillStyle = '#FFFDF9';
      this.ctx.fillRect(0, 0, this.width, this.height);
      
      // 2. 绘制内容
      this.drawContent();
      
      // 3. 绘制二维码
      this.drawQRCode();
      
      // 4. 提交绘制
      this.ctx.draw(false, () => {
        resolve(true);
      });
    });
  }

  /**
   * 绘制背景图
   */
  private drawBackground() {
    // 使用渐变背景
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#6A4C9C');
    gradient.addColorStop(1, '#9575CD');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * 绘制塔罗牌（顶部居中）
   */
  private drawTarotCard() {
    const cardWidth = 240;
    const cardHeight = 360;
    const cardX = (this.width - cardWidth) / 2;
    const cardY = 40;
    
    // 绘制卡片阴影
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.fillRect(cardX + 10, cardY + 10, cardWidth, cardHeight);
    
    // 绘制卡片边框
    this.ctx.strokeStyle = '#D4AF37';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);
    
    // 绘制卡片背景
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
    
    // 绘制 Ω 符号
    this.ctx.fillStyle = '#D4AF37';
    this.ctx.font = 'bold 60px serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Ω', cardX + cardWidth / 2, cardY + cardHeight / 2);
  }

  /**
   * 绘制内容区域（居中）
   */
  private drawContent() {
    const contentY = 420;
    const centerX = this.width / 2;
    const posterData = this.ui?.poster || {};
    
    // 1. MBTI 类型
    this.ctx.fillStyle = '#6A4C9C';
    this.ctx.font = 'bold 50px Didot, serif'; // 注意：尺寸可能需要根据 canvas 缩放调整
    this.ctx.textAlign = 'center';
    this.ctx.fillText(posterData.type || 'MBTI', centerX, contentY);
    
    // 2. 角色标题
    this.ctx.fillStyle = '#333';
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.fillText(posterData.title || '探索者', centerX, contentY + 40);
    
    // 3. 生活脚本
    this.ctx.fillStyle = '#666';
    this.ctx.font = 'italic 14px sans-serif'; // 字号稍微调小一点防止溢出
    this.ctx.fillText(`"${posterData.life_script || ''}"`, centerX, contentY + 70);
    
    // 4. 趋势图
    this.drawTrends(centerX, contentY + 110);
    
    // 5. 贴纸
    this.drawStickers(centerX, contentY + 240);
    
    // 6. 金句
    this.drawQuote(centerX, contentY + 320);
  }

  /**
   * 绘制趋势图
   */
  private drawTrends(centerX: number, startY: number) {
    // 使用真实数据 ui.trends
    const trends = this.ui?.trends || [];
    
    trends.forEach((trend: any, index: number) => {
      const y = startY + index * 30; // 间距调小适配
      const barWidth = 260; // 宽度适配
      const barX = centerX - barWidth / 2;
      
      // 左侧字符
      this.ctx.fillStyle = trend.isLeftWin ? '#6A4C9C' : '#D0D0D0';
      this.ctx.font = 'bold 16px Didot, serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(trend.leftChar, barX - 20, y);
      
      // 进度条背景
      this.ctx.fillStyle = '#F5F5F5';
      this.ctx.fillRect(barX, y - 6, barWidth, 4);
      
      // 进度条前景 (根据 score 计算)
      // 注意：trend.score 通常是 0-100，这里简单处理
      const fillWidth = barWidth * (trend.score / 100); 
      this.ctx.fillStyle = '#D1C4E9';
      // 如果左边赢，进度条从右往左画？这里根据你的业务逻辑调整
      // 假设 score 是左边的分数：
      this.ctx.fillRect(barX, y - 6, fillWidth, 4);
      
      // 右侧字符
      this.ctx.fillStyle = !trend.isLeftWin ? '#6A4C9C' : '#D0D0D0';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(trend.rightChar, barX + barWidth + 20, y);
    });
  }

  /**
   * 绘制贴纸
   */
  private drawStickers(centerX: number, y: number) {
    const stickers = this.stickers || [];
    
    // 简单的自动换行/排版逻辑
    const stickerHeight = 40;
    const spacingX = 15;
    const spacingY = 15;
    let currentX = centerX - 140; // 简单的起始位置估算
    let currentY = y;

    // 如果没有贴纸，直接返回
    if (stickers.length === 0) return;

    stickers.forEach((sticker, index) => {
      // 估算文字宽度 (粗略计算：汉字约22px，英文字符约12px)
      const text = sticker.text || '';
      const textWidth = text.length * 22 + 40; // 左右内边距各20

      // 绘制背景
      // core: 黑底白字, trait: 白底黑字边框, egg: 虚线框
      if (sticker.type === 'core') {
        this.ctx.fillStyle = '#2C2C2C';
        this.ctx.fillRect(currentX, currentY, textWidth, stickerHeight);
      } else if (sticker.type === 'trait') {
        this.ctx.fillStyle = '#FFF';
        this.ctx.fillRect(currentX, currentY, textWidth, stickerHeight);
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(currentX, currentY, textWidth, stickerHeight);
      } else {
        // egg (彩蛋)
        this.ctx.fillStyle = '#FFF9E6';
        this.ctx.fillRect(currentX, currentY, textWidth, stickerHeight);
        this.ctx.strokeStyle = '#8D6E63';
        this.ctx.setLineDash([5, 5]);
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(currentX, currentY, textWidth, stickerHeight);
        this.ctx.setLineDash([]); // 还原虚线设置
      }
      
      // 绘制文字
      this.ctx.fillStyle = sticker.type === 'core' ? '#FFF' : (sticker.type === 'trait' ? '#333' : '#8D6E63');
      this.ctx.font = 'bold 22px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle'; // 垂直居中
      this.ctx.fillText(text, currentX + textWidth / 2, currentY + stickerHeight / 2);

      // 更新下一个贴纸的位置
      currentX += textWidth + spacingX;
      
      // 如果太宽了（超过画布右侧），这就需要换行（这里做个简单限制，只画一行或者画出去就算了，
      // 真正完美的排版需要更复杂的计算，但目前这样够用了）
      if (currentX > this.width - 20) {
          currentX = centerX - 140; 
          currentY += stickerHeight + spacingY;
      }
    });
  }

  /**
   * 绘制金句
   */
  private drawQuote(centerX: number, y: number) {
    const quote = '"你的存在本身就是一种奇迹"';
    
    // 绘制引号
    this.ctx.fillStyle = '#DDD';
    this.ctx.font = '80px serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('"', centerX - 150, y);
    this.ctx.textAlign = 'right';
    this.ctx.fillText('"', centerX + 150, y + 60);
    
    // 绘制文字
    this.ctx.fillStyle = '#5D4037';
    this.ctx.font = '30px Kaiti SC, serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(quote, centerX, y + 40);
    
    // 绘制签名
    this.ctx.fillStyle = '#333';
    this.ctx.font = '28px cursive';
    this.ctx.textAlign = 'right';
    this.ctx.fillText('Signature: @Omega_AI', centerX + 200, y + 80);
    
    this.ctx.fillStyle = '#999';
    this.ctx.font = '20px sans-serif';
    this.ctx.fillText('Date: 2026.01.07', centerX + 200, y + 110);
  }

  /**
   * 绘制二维码（底部）
   */
  private drawQRCode() {
    const qrSize = 120;
    const qrX = (this.width - qrSize) / 2;
    const qrY = this.height - qrSize - 40;
    
    // 绘制二维码边框
    this.ctx.fillStyle = '#FFF';
    this.ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
    
    // 绘制二维码占位
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(qrX, qrY, qrSize, qrSize);
    
    // 绘制提示文字
    this.ctx.fillStyle = '#666';
    this.ctx.font = '16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('扫码查看详情', this.width / 2, qrY + qrSize + 30);
  }

  /**
   * 超时 Promise
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), ms);
    });
  }

  /**
   * 导出为图片
   */
  exportToImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvasId: this.canvasId,
        success: (res: any) => {
          resolve(res.tempFilePath);
        },
        fail: (err: any) => {
          console.error('导出图片失败', err);
          reject(err);
        }
      });
    });
  }
}
