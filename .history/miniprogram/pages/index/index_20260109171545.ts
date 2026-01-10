import { decodeSharePayload, SharePayload } from '../../utils/payload-helper';
import { PosterPainter } from '../../utils/poster-painter';

Page({
  data: {
    isGuestMode: false,
    guestData: null as SharePayload | null,
    showResetButton: false
  },

  onLoad(options: any) {
    console.log('Index page loaded with options:', options);
    
    // 检查是否为访客模式
    if (options.mode === 'guest') {
      const payload = decodeSharePayload(options);
      
      if (payload) {
        this.setData({
          isGuestMode: true,
          guestData: payload,
          showResetButton: true
        });
        console.log('访客模式，分享数据:', payload);
      } else {
        console.warn('无效的分享参数，重置为正常模式');
        this.setData({ showResetButton: true });
      }
    } else {
      // 正常模式
      console.log('正常模式');
    }
  },

  onReady() {
    console.log('Index page ready');
  },

  onShow() {
    console.log('Index page show');
  },

  onHide() {
    console.log('Index page hide');
  },

  onUnload() {
    console.log('Index page unload');
  },

  // 重置为正常模式
  onResetToNormal() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },

  // 开始测试（正常模式）
  onStartTest() {
    wx.navigateTo({
      url: '/pages/test/index'
    });
  }
});
