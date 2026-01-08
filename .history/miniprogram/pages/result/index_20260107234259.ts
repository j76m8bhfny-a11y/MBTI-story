const Renderer = require('../../libs/ResultRenderer.js');

Page({
  data: {
    ui: null as any,
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
      this.setData({
        ui: viewModel,
        loading: false
      }, () => {
        this.startCeremony();
      });
    } catch (err) {
      console.error(err);
    }
  },

  startCeremony() {
    // 1. 翻牌 (1.2s)
    setTimeout(() => { this.setData({ isFlipped: true }); }, 1200);
    // 2. 归位 (3.0s - 稍微延长等待飞行结束)
    setTimeout(() => { this.setData({ animStage: 'docked' }); }, 3000);
  },

  onSaveImage() {
    wx.showToast({ title: '正在冲印...', icon: 'loading' });
    setTimeout(() => { wx.showToast({ title: '已保存到相册', icon: 'success' }); }, 1500);
  }
});
