const Renderer = require('../../libs/ResultRenderer.js');

Page({
  data: {
    ui: null
  },

  onLoad() {
    // 读取存储的测试结果
    const resultData = wx.getStorageSync('USER_MBTI_RESULT');

    // 异常处理：若无数据，重新回到首页
    if (!resultData) {
      wx.reLaunch({
        url: '/pages/home/index'
      });
      return;
    }

    // 核心渲染：调用 Renderer 获取 ViewModel
    const viewModel = Renderer.render(resultData);

    // 更新视图
    this.setData({
      ui: viewModel
    });
  },

  onReady() {
    console.log('Result page ready');
  },

  onShow() {
    console.log('Result page show');
  },

  onHide() {
    console.log('Result page hide');
  },

  onUnload() {
    console.log('Result page unload');
  }
});
