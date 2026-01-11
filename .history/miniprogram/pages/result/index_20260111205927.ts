const Renderer = require('../../libs/ResultRenderer.js');
import { PosterPainter } from '../../utils/poster-painter';
import { drawPoster } from '../../utils/poster-gen';

const ensureLocalImage = async (src: string) => {
  if (!src) return '';
  
  // 情况 A: 如果是云存储文件 ID (cloud://...)
  if (src.startsWith('cloud://')) {
    try {
      const res = await wx.cloud.downloadFile({ fileID: src });
      return res.tempFilePath; // 返回下载后的本地路径
    } catch (e) {
      console.error('云文件下载失败', src, e);
      return ''; // 失败返回空，防止卡死
    }
  }

  // 情况 B: 如果是网络图片 (http://...)
  if (src.startsWith('http')) {
    try {
      const res = await wx.getImageInfo({ src });
      return res.path;
    } catch (e) {
      return src; // 试着返回原路径作为兜底
    }
  }

  // 情况 C: 本地路径 /assets/...
  return src;
}

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
    if (this.data.shareImage) {
      this.setData({ showShareModal: true });
      return;
    }

    wx.showLoading({ title: '正在冲印海报...', mask: true });

    try {
      // --- 第一步：准备图片路径 ---
      
      // 1. 获取当前 MBTI 类型 (转小写，如 intp)
      // 注意：请确保你的 ui 数据里有 type 字段，如果没有，从 rawResult 获取
      const mbtiType = (this.data.ui?.poster?.type || this.data.rawResult?.mbti_result || 'intp').toLowerCase();
      console.log('当前 MBTI 类型:', mbtiType); // 调试：看看是不是 "t"

      const CLOUD_ROOT = 'cloud://cloud1-2gygzrzj1714d360.636c-cloud1-2gygzrzj1714d360-1394992833/images/subPackages/';
      const tarotCloudId = `${CLOUD_ROOT}bg_${mbtiType}.jpg`;

      console.log('准备加载资源:', { tarotCloudId });
      
      const localTarotPath = await ensureLocalImage(tarotCloudId);
      if (!localTarotPath) {
        throw new Error(`云图片下载失败: ${tarotCloudId}`);
      }

      // 检查下载结果，防止空路径导致 Canvas 报错
      // 3. 获取 Canvas 节点
      const query = wx.createSelectorQuery();
      query.select('#posterCanvas')
        .fields({ node: true, size: true })
        .exec(async (res) => {
          if (!res[0]) {
            wx.hideLoading();
            console.error('Canvas 节点未找到');
            return;
          }

          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getSystemInfoSync().pixelRatio;
          
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          ctx.scale(dpr, dpr);

          ctx.fillStyle = '#FFFDF9'; 
          ctx.fillRect(0, 0, res[0].width, res[0].height);

          // 4. 构造绘图数据
          const drawData = {
            stickers: this.data.stickers,
            tarot: {
              // 如果下载成功用下载的图，失败了用默认图或空
              image: localTarotPath || '/assets/images/default_cover.png', 
              name: this.data.ui?.poster?.title || '命运之牌'
            }
          };

          const uiData = {
            ...this.data.ui,
            poster: {
              ...this.data.ui?.poster,
              bg_image: '' // 传入本地背景图路径
            }
          };

          // 5. 执行绘制
          await drawPoster(canvas, ctx, drawData, uiData);

          // 6. 导出图片
          wx.canvasToTempFilePath({
            canvas,
            x: 0, y: 0,
            width: res[0].width, height: res[0].height,
            destWidth: res[0].width * dpr, destHeight: res[0].height * dpr,
            fileType: 'jpg',
            quality: 0.85,
            success: (fileRes) => {
              this.setData({
                shareImage: fileRes.tempFilePath,
                showShareModal: true
              });
              wx.hideLoading();
            },
            fail: (err) => {
              console.error('导出失败', err);
              wx.hideLoading();
              wx.showToast({ title: '保存失败', icon: 'none' });
            }
          });
        });

    } catch (e) {
      console.error('整体流程失败', e);
      wx.hideLoading();
      wx.showToast({ title: '网络开小差了', icon: 'none' });
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