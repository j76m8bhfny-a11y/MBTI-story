import { IAppOption } from '../../app';
const app = getApp<IAppOption>();
Page({
  data: {
    userCode: '',
    dateStr: '',
    images: {} as Record<string, string> // 新增 images 对象
  },
  onLoad() {
    this.generateIdentity();
    this.setData({
      images: app.globalData.preloadImages
    });
  },
  generateIdentity() {
    const randomNum: number = Math.floor(10000 + Math.random() * 90000);
    const now: Date = new Date();
    const dateStr: string = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}`;
    this.setData({ userCode: randomNum.toString(), dateStr });
  },
  onStartTap() {
    console.log('👆 Start button tapped');
    wx.vibrateShort({ type: 'medium' });
    
    wx.reLaunch({
      url: '/pages/transition/index?stage=1',
      success: () => {
        console.log('✅ Navigation success (Fade mode)');
      },
      fail: (err) => {
        console.error('❌ Navigation failed:', err);
      }
    });
  },
  goToNextStage(nextStage: string) {
    // ❌ 原代码：会导致页面栈不断累积，且有滑入动画
    // wx.navigateTo({
    //   url: `/pages/transition/index?stage=${nextStage}`
    // });

    // ✅ 修改后：使用 redirectTo (原地替换)
    // 效果：无滑入动画，且保持页面栈清爽
    wx.redirectTo({
      url: `/pages/transition/index?stage=${nextStage}`
    });
  },
});
