const app = getApp<IAppOption>();

// 定义首页需要预加载的图片列表
const ASSETS = {
  gamepad: 'cloud://cloud1-2gygzrzj1714d360.636c-cloud1-2gygzrzj1714d360-1394992833/images/home/gamepad.png',
  letter: 'cloud://cloud1-2gygzrzj1714d360.636c-cloud1-2gygzrzj1714d360-1394992833/images/home/letter.png',
  coffee: 'cloud://cloud1-2gygzrzj1714d360.636c-cloud1-2gygzrzj1714d360-1394992833/images/home/coffee.png',
  cat: 'cloud://cloud1-2gygzrzj1714d360.636c-cloud1-2gygzrzj1714d360-1394992833/images/home/cat1.png'
};

Page({
  data: {
    progress: 0
  },

  onLoad() {
    this.preloadAssets();
  },

  async preloadAssets() {
    const keys = Object.keys(ASSETS);
    const total = keys.length;
    let count = 0;

    // 创建下载任务数组
    const tasks = keys.map(async (key) => {
      try {
        // 使用 wx.cloud.downloadFile 下载文件到本地
        const res = await wx.cloud.downloadFile({
          fileID: ASSETS[key as keyof typeof ASSETS]
        });

        if (res.statusCode === 200) {
          // 存入全局变量
          app.globalData.preloadImages[key] = res.tempFilePath;
        }
      } catch (err) {
        console.error(`加载失败: ${key}`, err);
        // 失败时可以保留原云ID作为兜底，或者显示错误占位图
        app.globalData.preloadImages[key] = ASSETS[key as keyof typeof ASSETS];
      } finally {
        // 更新进度条
        count++;
        this.setData({
          progress: Math.floor((count / total) * 100)
        });
      }
    });

    // 等待所有图片处理完成（Promise.all 确保并行下载）
    await Promise.all(tasks);

    // 加载完成，跳转到首页 (使用 reLaunch 关闭加载页)
    wx.reLaunch({
      url: '/pages/home/index'
    });
  }
});