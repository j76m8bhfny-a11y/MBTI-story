const Renderer = require('../../libs/ResultRenderer.js');
import { PosterPainter } from '../../utils/poster-painter';

Page({
  data: {
    ui: null as any,
    stickers: [] as any[], // 🔥 修改 1: 变量名必须叫 stickers，和 WXML 对应
    loading: true,
    animStage: 'void',
    isFlipped: false,
    isFocused: false, // 沉浸式聚焦模式
    rawResult: null as any
  },

  onLoad() {
    const rawResult = wx.getStorageSync('USER_MBTI_RESULT');
    if (!rawResult) {
      // 如果没有数据，调试期间可以注释掉下面这行，防止无限跳转
      // wx.reLaunch({ url: '/pages/index/index' });
      console.warn("没有找到测试结果数据");
      // return;
    }

    try {
      const viewModel = Renderer.render(rawResult || {}); // 防止空数据报错
      
      // 处理贴纸：生成随机旋转角度
      const processedStickers = (viewModel.stickers || []).map((item: any) => {
        return {
          text: item.text,
          type: item.type, // 保留 type
          styleClass: `style-${item.type}`, 
          // 生成 -4deg 到 4deg 的随机微小旋转
          randomStyle: `transform: rotate(${(Math.random() * 8 - 4).toFixed(1)}deg);`
        };
      });

      this.setData({
        ui: viewModel,
        stickers: processedStickers, // 🔥 修改 2: 这里也要赋值给 stickers
        loading: false
      }, () => {
        this.startCeremony();
      });
    } catch (err) {
      console.error("渲染错误:", err);
    }
  },

  startCeremony() {
    // 1. 翻牌 (1.2s)
    setTimeout(() => { this.setData({ isFlipped: true }); }, 1200);
    // 2. 归位 (3.0s)
    setTimeout(() => { this.setData({ animStage: 'docked' }); }, 4000);
  },
  async autoArchiveToCloud() {
    const { rawResult } = this.data;
    if (!rawResult) return;

    console.log('正在后台自动归档...');
    
    try {
      // 直接调用云函数，不需要传头像ID了
      await wx.cloud.callFunction({
        name: 'saveTestResult',
        data: {
          mbti_result: rawResult?.mbti_result,
          dimension_scores: rawResult?.scores,
          answers_snapshot: [], 
          avatar_file_id: "" // 既然不用头像，传空即可
        }
      });
      console.log('✅ 自动归档成功');
    } catch (err) {
      console.error('❌ 自动归档失败', err);
      // 失败了也不要弹窗打扰用户，自己记录日志即可
    }
  },

  // 进入沉浸式聚焦模式
  onViewTarot() {
    this.setData({ isFocused: true });
    wx.vibrateShort({ type: 'medium' });
  },

  // 退出沉浸式聚焦模式
  onDismissTarot() {
    this.setData({ isFocused: false });
  },

  async onSaveImage() {
    // 简单提示用户长按保存或截屏
    wx.showToast({ title: '长按保存或截屏', icon: 'none' });
  },

  // 选择头像并保存结果
  

  // 分享配置
  onShareAppMessage() {
    return {
      title: this.data.ui?.poster?.life_script || '测测你的灵魂配方',
      path: '/pages/index/index'
    };
  },
  async onChooseAvatar(e: any) {
    const { avatarUrl } = e.detail;
    
    if (!avatarUrl) return;

    wx.showLoading({ title: '正在归档...', mask: true });

    try {
      // 1. 上传头像到云存储
      // 生成随机文件名: avatar_时间戳.png
      const cloudPath = `avatars/user_${Date.now()}.png`;
      
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: avatarUrl, // 临时文件路径
      });

      const fileID = uploadRes.fileID;
      console.log('头像上传成功:', fileID);

      // 2. 调用云函数保存数据
      const { rawResult } = this.data;
      
      await wx.cloud.callFunction({
        name: 'saveTestResult',
        data: {
          mbti_result: rawResult?.mbti_result, // MBTI 类型 (如 INTP)
          dimension_scores: rawResult?.scores, // 维度分数
          answers_snapshot: [], // 简略起见，如果不存具体题目可留空
          avatar_file_id: fileID // 刚才上传的头像 ID
        }
      });

      wx.hideLoading();
      wx.showToast({ title: '归档成功', icon: 'success' });

    } catch (err) {
      console.error('保存失败', err);
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  }
});