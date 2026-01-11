import { IAppOption } from '../../app';
const app = getApp<IAppOption>();
Page({
  data: {
    userCode: 'Loading...',
    dateStr: '',
    images: app.globalData.preloadImages || {}
  },
  onLoad() {
    this.generateDate();
    
    // 2. 获取真实用户数量
    this.fetchRealUserCount();
  },
  generateDate() {
    const now: Date = new Date();
    const dateStr: string = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}`;
    this.setData({ dateStr });
  },

  // 新增：调用云函数获取真实数量
  fetchRealUserCount() {
    wx.cloud.callFunction({
      name: 'getUserCount', // 刚才创建的云函数名称
    }).then((res: any) => {
      if (res.result && res.result.success) {
        const count = res.result.total;
        // 格式化数字：例如如果是第 5 个用户，显示为 00005，保持设计感
        // 你可以根据喜好调整 padStart 的长度，这里设为 5 位
        const realCode = count.toString().padStart(5, '0');
        
        this.setData({ userCode: realCode });
      } else {
        // 如果云函数返回逻辑错误，回退到随机数
        this.useRandomFallback();
      }
    }).catch(err => {
      console.error('获取用户数量失败，使用随机数兜底', err);
      this.useRandomFallback();
    });
  },

  useRandomFallback() {
    const randomNum: number = Math.floor(10000 + Math.random() * 90000);
    this.setData({ userCode: randomNum.toString() });
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
