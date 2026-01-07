const Renderer = require('../../libs/ResultRenderer.js');

Page({
  data: {
    ui: null as any,
    loading: true,

    // 🎭 动画状态机
    animStage: 'void', // 当前阶段: 'void'(混沌) -> 'reveal'(揭晓) -> 'docked'(归位)
    isFlipped: false,  // 牌面翻转控制
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

  // 仪式流程控制器
  startCeremony() {
    // 第一幕：混沌 (0s) - 保持 void 状态，卡片悬浮在中心

    // 第二幕：揭晓 (1.5s后) - 翻转卡牌
    setTimeout(() => {
      this.setData({ isFlipped: true });
      wx.vibrateShort({ type: 'heavy' }); // 触感反馈
    }, 1200);

    // 第三幕：归位 (3.0s后) - 卡牌飞回顶部，票据滑出
    setTimeout(() => {
      this.setData({ animStage: 'docked' });
    }, 2800);
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
