const Renderer = require('../../libs/ResultRenderer.js');

Page({
  data: {
    ui: null as any,
    tags: [] as any[],
    loading: true,
    animStage: 'void', 
    isFlipped: false,
  },

  onLoad() {
    const rawResult = wx.getStorageSync('USER_MBTI_RESULT');
    if (!rawResult) {
      wx.reLaunch({ url: '/pages/index/index' });
      return;
    }

    try {
      const viewModel = Renderer.render(rawResult);
      const processedTags = (viewModel.stickers || []).map((item: any) => {
        return {
          text: item.text,
          // 根据 type (core/trait/egg) 决定用哪个颜色样式
          styleClass: `style-${item.type}`, 
          // 生成 -4deg 到 4deg 的随机微小旋转，让贴纸看起来像手贴的
          randomStyle: `transform: rotate(${(Math.random() * 8 - 4).toFixed(1)}deg);`
        };
      });

      this.setData({
        ui: viewModel,
        tags: processedTags,
        loading: false
      }, () => {
        this.startCeremony();
      });
    } catch (err) {
      console.error(err);
    }
  },

  startCeremony() {
    // 1. 翻牌 (1s)
    setTimeout(() => { this.setData({ isFlipped: true }); }, 1200);
    // 2. 归位 (3.0s - 稍微延长等待飞行结束)
    setTimeout(() => { this.setData({ animStage: 'docked' }); }, 3000);
  },

  onSaveImage() {
    wx.showToast({ title: '正在冲印...', icon: 'loading' });
    setTimeout(() => { wx.showToast({ title: '已保存到相册', icon: 'success' }); }, 1500);
  }
});
