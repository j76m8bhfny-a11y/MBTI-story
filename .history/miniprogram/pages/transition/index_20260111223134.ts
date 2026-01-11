interface StageConfig {
  chapter: string;    // 例如: CHAPTER 01
  title: string;      // 例如: 童 年
  subtitle: string;   // 例如: 那时的梦，是彩色的。
  icon?: string;      // 对应阶段的图标路径 (可选)
  bgStyle?: string;   // 动态背景色 (可选)
}

const STAGES: Record<string, StageConfig> = {
  '1': {
    chapter: 'CHAPTER 01',
    title: '童 年',
    subtitle: '世界很大，我们很小。',
    icon: '/assets/images/stage_child.png' // 预留
  },
  '2': {
    chapter: 'CHAPTER 02',
    title: '少 年',
    subtitle: '白衬衫，单车，和写不完的卷子。',
  },
  '3': {
    chapter: 'CHAPTER 03',
    title: '青 春',
    subtitle: '学会了即使难过，也要不动声色。',
  },
  '4': {
    chapter: 'CHAPTER 04',
    title: '职 场',
    subtitle: '你，成为了你想成为的大人吗？',
  },
  '5': {
    chapter: 'CHAPTER 05',
    title: '中 年',
    subtitle: '生活是孩子的哭闹，和未完成的梦想。',
  },
  '6': {
    chapter: 'FINAL CHAPTER',
    title: '晚 年',
    subtitle: '在夕阳下，把故事沏成安静的茶',
  }
};

Page({
  data: {
    stageData: {} as StageConfig,
    opacity: 0, // 控制淡入淡出
    targetStage: '1' // ⚠️ 新增：用于存储目标阶段
  },

  timer: null as number | null,

  onLoad(options: { stage: string }) {
    // 1. 获取阶段参数，默认为第一阶段
    const stageKey = options.stage || '1';
    const config = STAGES[stageKey] || STAGES['1'];

    this.setData({
      stageData: config,
      // ⚠️ 核心修复：把 stage 存到 data 中！
      targetStage: stageKey
    });

    // 2. 启动入场动画 (淡入)
    setTimeout(() => {
      this.setData({ opacity: 1 });
    }, 50);

    // 3. 设定自动跳转定时器 (3.5秒后跳转)
    // 留出 500ms 进场 + 2500ms 阅读 + 500ms 出场
    this.timer = setTimeout(() => {
      this.skipTransition();
    }, 2000);
  },

  // 点击屏幕立即跳过
  onTap() {
    this.skipTransition();
  },

  skipTransition() {
    if (this.timer) clearTimeout(this.timer);

    // 出场动画 (淡出)
    this.setData({ opacity: 0 });

    // 等待淡出动画完成后跳转
    setTimeout(() => {
      // ⚠️ 核心修复：从 data 中读取 targetStage
      const nextStage = this.data.targetStage;
      
      console.log('🎬 Transitioning to Test Stage:', nextStage);

      // 使用 redirectTo，这样用户按返回键不会回到过场页，而是回到上一个逻辑节点（如首页）
      wx.redirectTo({
        // 携带 stage 参数传给答题页，告知答题页从哪里开始加载题目
        url: `/pages/test/index?stage=${nextStage}`
      });
    }, 500); // 与 CSS transition 时间匹配
  }
});
