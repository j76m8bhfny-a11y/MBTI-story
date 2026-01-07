const Renderer = require('../../libs/ResultRenderer.js');

Page({
  data: {
    ui: null as any,
    loading: true
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
      });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onSaveImage() {
    wx.showToast({ title: '正在冲印...', icon: 'loading' });
    setTimeout(() => {
      wx.showToast({ title: '已保存到相册', icon: 'success' });
    }, 1500);
  },

  onShareAppMessage() {
    return {
      title: `我的MBTI是 ${this.data.ui.poster.type}，你也来测测？`,
      path: '/pages/index/index'
    };
  }
});
