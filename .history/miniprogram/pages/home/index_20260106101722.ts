Page({
  data: {
    userCode: '',
    dateStr: ''
  },
  onLoad() {
    this.generateIdentity();
  },
  generateIdentity() {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}`;
    this.setData({ userCode: randomNum.toString(), dateStr });
  },
  onStartTap() {
    wx.vibrateShort({ type: 'medium' });
    wx.navigateTo({ url: '/pages/test/index' }); // 暂时跳转测试页
  }
});
