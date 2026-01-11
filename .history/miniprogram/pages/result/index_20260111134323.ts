const Renderer = require('../../libs/ResultRenderer.js');
import { PosterPainter } from '../../utils/poster-painter';
import { drawPoster } from '../../utils/poster-gen';

Page({
  data: {
    ui: null as any,
    stickers: [] as any[], // 🔥 修改 1: 变量名必须叫 stickers，和 WXML 对应
    loading: true,
    animStage: 'void',
    isFlipped: false,
    isFocused: false, // 沉浸式聚焦模式
    rawResult: null as any,
    showShareModal: false, // 控制弹窗显示
    shareImage: ''         // 存储生成的图片路径
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
    setTimeout(() => { this.setData({ animStage: 'docked' }); }, 2500);
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
    if (this.data.animStage !== 'docked') {
      return; 
    }
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

  
  // 分享配置
  async onShareTap() {
    // 1. 如果已经生成过，直接弹窗
    if (this.data.shareImage) {
      this.setData({ showShareModal: true });
      return;
    }

    wx.showLoading({ title: '正在冲印海报...', mask: true });

    try {
      // 2. 获取 Canvas 节点
      const query = wx.createSelectorQuery();
      query.select('#posterCanvas')
        .fields({ node: true, size: true })
        .exec(async (res) => {
          if (!res[0]) {
            throw new Error('Canvas not found');
          }

          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');

          // 3. 处理高清屏倍率
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          ctx.scale(dpr, dpr);

          // 4. 绘制海报 (传入 ui 数据)
          // 注意：这里用 this.data.ui.poster 作为绘图数据源，你可以根据实际情况调整
          const posterData = {
            type: this.data.ui?.poster?.type || 'MBTI',
            name: this.data.ui?.poster?.title || '测试者',
            tags: (this.data.stickers || []).map((s:any) => s.text).slice(0, 3), // 取前3个标签
            desc: this.data.ui?.poster?.summary || '暂无描述'
          };
          
          await drawPoster(canvas, ctx, posterData, 1);

          // 5. 生成临时图片路径
          wx.canvasToTempFilePath({
            canvas,
            x: 0, y: 0,
            width: res[0].width,
            height: res[0].height,
            destWidth: res[0].width * dpr,
            destHeight: res[0].height * dpr,
            success: (fileRes) => {
              this.setData({
                shareImage: fileRes.tempFilePath,
                showShareModal: true
              });
              wx.hideLoading();
            },
            fail: (err) => {
              console.error('生成图片失败', err);
              wx.hideLoading();
              wx.showToast({ title: '海报生成失败', icon: 'none' });
            }
          });
        });

    } catch (e) {
      console.error(e);
      wx.hideLoading();
      wx.showToast({ title: '发生错误', icon: 'none' });
    }
  },

  // 🔥 新增：关闭弹窗
  closeShareModal() {
    this.setData({ showShareModal: false });
  },

  // 🔥 新增：防止滑动穿透
  preventBubble() {},
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