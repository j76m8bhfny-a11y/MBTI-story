const Renderer = require('../../libs/ResultRenderer.js');

Page({
  data: {
    ui: null as any,
    loading: true,
    animStage: 'void', // 动画阶段: 'void' -> 'flipping' -> 'docked'
    contentVisible: false // 内容是否显示
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
        // 🎬 启动三幕剧动画
        this.startCeremony();
      });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  startCeremony() {
    //1. 初始阶段：Void (卡片在中心悬浮)

    //2. 翻转阶段 (0.5s后)
    setTimeout(() => {
      this.setData({ animStage: 'flipping' });
      wx.vibrateShort({ type: 'heavy' });
    }, 500);

    //3. 归位阶段 (2.5s后，卡片飞向右上角)
    setTimeout(() => {
      this.setData({ animStage: 'docked' });
    }, 2500);

    //4. 内容显现 (3.0s后，文字淡入)
    setTimeout(() => {
      this.setData({ contentVisible: true });
    }, 3000);
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
