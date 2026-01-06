Page({
  data: {
    userCode: '',
    dateStr: ''
  },
  onLoad() {
    this.generateIdentity();
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
  }
});
