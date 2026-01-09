App({
  globalData: {
    openid: null
  },

  onLaunch() {
    console.log('App launched');
    
    // 初始化云环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-2gygzrzj1714d360', // 请替换为您的云开发环境 ID
        traceUser: true
      });
      
      // 静默登录
      this.silentLogin();
    }
  },

  onShow() {
    console.log('App shown');
  },

  onHide() {
    console.log('App hidden');
  },

  // 静默登录
  silentLogin() {
    wx.cloud.callFunction({
      name: 'userHandshake',
      data: {}
    }).then((res: any) => {
      console.log('静默登录成功', res);
      const openid = res.result?.openid || res.result?.OPENID;
      
      // 存储到全局变量
      this.globalData.openid = openid;
      
      // 存储到本地缓存
      wx.setStorageSync('openid', openid);
    }).catch(err => {
      console.error('静默登录失败', err);
    });
  }
});
