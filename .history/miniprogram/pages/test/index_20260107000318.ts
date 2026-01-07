const questions = require('../../data/questions.js'); 
const LogicCore = require('../../libs/LogicCore.js');
//import { questions } from '../../data/questions';
import { Answer, MBTIResult } from '../../types';
//import { calculateMBTI } from '../../utils/mbti-core';

// ⚠️ 新增：阶段映射配置
const STAGE_MAP: Record<string, { start: number, end: number, nextStage: string | null }> = {
  '1': { start: 0,  end: 9,  nextStage: '2' }, // 0-9 是 10 道题
  '2': { start: 10, end: 19, nextStage: '3' },
  '3': { start: 20, end: 29, nextStage: '4' },
  '4': { start: 30, end: 39, nextStage: null }, // 最后阶段
};

interface TestPageData {
  currentQIndex: number; // ⚠️ 必须叫 currentQIndex，与 WXML 对应
  currentQuestion: typeof questions[0];
  rulerValue: number; // 当前刻度索引 (0-6)，对应 -3 到 +3 的 7 个选项
  currentRulerIndex: number; // 当前刻度索引 (0-6)
  hasAnswered: boolean;
  answers: Answer[];
  progressPercent: number;
  currentAnswerText: string;
  hasMoved: boolean;
  cardTransform: string; // 控制卡片的位移和旋转
  cardTransition: string; // 控制动画过渡时间
  backgroundTransform: string; // 底层卡片缩放
  previewText: string; // 底层卡片展示的预告文字
  isAnimating: boolean; // 动画锁
  isCardSelected: boolean; // 卡片选中状态
  hasInteracted: boolean; // ⚠️ 新增：是否已操作滑块
  isSceneReady: boolean; // ⚠️ 新增：场景是否准备好（用于揭幕）
  currentStage: string; // ⚠️ 新增：当前阶段
}

// 常量定义
const sysInfo = wx.getSystemInfoSync();
const SCREEN_WIDTH = sysInfo.windowWidth;
const FLY_DISTANCE = SCREEN_WIDTH * 1.5; // 屏幕宽度的 1.5 倍，绝对安全
const THRESHOLD = 80; // 触发切换的距离阈值

Page<TestPageData, any>({
  // --- 新增：定时器池，用于存储所有动画延时 ---
  _timerList: [] as number[],

  data: {
    currentQIndex: 0, // ⚠️ 必须叫 currentQIndex，与 WXML 对应
    currentQuestion: questions[0],
    rulerValue: 3, // 修复：传递索引 (0-6) 而不是值 (-3 到 3)
    currentRulerIndex: 3, // 默认中间位置 (索引3对应值0)
    hasAnswered: false,
    answers: [],
    progressPercent: 0,
    currentAnswerText: '',
    hasMoved: false,
    cardTransform: '',
    cardTransition: '',
    backgroundTransform: 'transform: scale(0.95) translateY(10rpx);',
    previewText: '',
    isAnimating: false,
    isCardSelected: false,
    hasInteracted: false, // ⚠️ 新增：是否已操作滑块
    isSceneReady: false, // ⚠️ 新增：场景是否准备好（用于揭幕）
    currentStage: '1' // ⚠️ 新增：默认第一阶段
  },

  // --- 新增：辅助方法 ---
  // 添加定时器
  addTimer(fn: Function, delay: number) {
    const id = setTimeout(() => {
      fn();
      // 执行完后移除自己 (非必须，但好习惯)
    }, delay);
    this._timerList.push(id);
    return id;
  },

  // 清除所有定时器 (强制打断动画)
  clearAllTimers() {
    this._timerList.forEach((id: number) => clearTimeout(id));
    this._timerList = [];
  },

  // 临时变量 (不放在 data 里以优化性能)
  touchStartX: 0,
  currentMoveX: 0,

  onLoad(options: { stage?: string }) {
    // ⚠️ 核心修复：获取阶段参数，设置正确的题目索引
    const stageKey = options.stage || '1';
    const stageConfig = STAGE_MAP[stageKey];
    
    // 根据阶段计算起始题目索引
    const startQIndex = stageConfig ? stageConfig.start : 0;
    
    // 设置当前阶段
    this.setData({ currentStage: stageKey });
    
    // 强制初始化一次，让 UI 显示对应阶段的题目
    const firstQuestion = questions[startQIndex] as any;
    const defaultIndex = 3; // 中间位置 (索引3对应值0)
    
    this.setData({
      currentQIndex: startQIndex, // ⚠️ 关键：设置正确的题目索引
      currentQuestion: firstQuestion,
      progressPercent: Math.round((startQIndex / questions.length) * 100),
      currentAnswerText: firstQuestion.opts[defaultIndex] || '',
      currentRulerIndex: defaultIndex,
      rulerValue: defaultIndex // 修复：传递索引 (0-6) 而不是值 (-3 到 3)
    });
  },

  // 智能揭幕：渲染完成后只需 50ms 缓冲即可淡出
  onReady() {
    setTimeout(() => {
      this.setData({ isSceneReady: true });
    }, 50);
  },

  /**
   * 卡片触摸开始 - 记录起点
   */
  onCardTouchStart(e: WechatMiniprogram.TouchEvent) {
    // 1. ⚡️ 核心：立即杀死所有正在跑的动画定时器
    this.clearAllTimers();

    // 2. ⚡️ 核心：强制重置状态 (无论之前在干嘛，现在听手指的)
    // 即使上一张卡片还没飞完，直接强行重置，让用户感觉"抓住了"新卡片
    this.setData({
      isAnimating: false,           // 强制解锁
      cardTransition: 'transition: none;', // 移除动画惯性，实现跟手
      // 如果上一张还没飞走就被抓住了，这里可能会有点跳变，
      // 但为了流畅性，我们假设用户是想操作当前这张
      cardTransform: 'transform: translateX(0) rotate(0deg); opacity: 1;',
      hasMoved: false
    });

    // 3. 记录坐标
    this.touchStartX = e.touches[0].clientX;
    this.currentMoveX = 0;
  },

  /**
   * 卡片触摸移动 - 实时跟随 + 旋转
   */
  onCardTouchMove(e: WechatMiniprogram.TouchEvent) {
    if (this.data.isAnimating) return;
    
    // 隐藏提示箭头
    if (!this.data.hasMoved) this.setData({ hasMoved: true });

    const moveX = e.touches[0].clientX;
    const diff = moveX - this.touchStartX;
    this.currentMoveX = diff;

    // --- 边界守卫 ---
    const currentIndex = this.data.currentRulerIndex;
    const maxIndex = 6; // 0-6 共7个选项

    let previewIndex = -1;

    // 1. 向左滑 (diff < 0) -> 预览 Index + 1
    if (diff < 0) {
      if (currentIndex < maxIndex) { 
        previewIndex = currentIndex + 1; 
      } else {
        // ⚠️ 已经是最后一个 (Index 6)，禁止预览
        previewIndex = -1; 
      }
    } 
    // 2. 向右滑 (diff > 0) -> 预览 Index - 1
    else if (diff > 0) {
      if (currentIndex > 0) {
        previewIndex = currentIndex - 1;
      } else {
        // ⚠️ 已经是第一个 (Index 0)，禁止预览
        previewIndex = -1;
      }
    }

    // 更新预览文字和背景变换（合并 setData 调用，避免多次渲染）
    const opts = this.data.currentQuestion.opts || [];
    let newPreviewText = '';
    let newBackgroundTransform = 'transform: scale(0.95) translateY(10rpx);';
    
    if (previewIndex !== -1) {
      newPreviewText = opts[previewIndex];
      
      // 只有在有效范围内才做视差缩放
      const progress = Math.min(Math.abs(diff) / 200, 1);
      const newScale = 0.95 + (0.05 * progress);
      const newY = 10 - (10 * progress);
      
      newBackgroundTransform = `transform: scale(${newScale}) translateY(${newY}rpx);`;
    }
    
    // ⚠️ 核心优化：合并 setData 调用，确保渲染同步
    this.setData({
      previewText: newPreviewText,
      backgroundTransform: newBackgroundTransform
    });

    // --- A. 顶层卡片物理跟随 ---
    // 增加阻尼感：如果在边界外拖动，移动距离打折
    let effectiveDiff = diff;
    if ((diff < 0 && currentIndex >= maxIndex) || (diff > 0 && currentIndex <= 0)) {
       effectiveDiff = diff * 0.3; // 阻尼效果
    }

    const rotate = effectiveDiff * 0.05; 
    this.setData({
      cardTransform: `transform: translateX(${effectiveDiff}px) rotate(${rotate}deg);`
    });
  },

  /**
   * 卡片触摸结束 - 结算 (用于切换答案选项)
   */
  onCardTouchEnd() {
    if (this.data.isAnimating) return;

    const diff = this.currentMoveX;
    const absDiff = Math.abs(diff);

    // 1. 移动距离不够 -> 回弹
    if (absDiff < THRESHOLD) {
      // ⚠️ 核心修复：由于 WXML 中使用了 catchtouchend，标准 tap 事件会被阻断
      // 因此我们需要在这里手动检测"点击"行为
      // 如果移动距离极小 (< 5px)，则视为点击，手动触发 onCardTap
      if (absDiff < 5) {
        this.onCardTap();
      } else {
        this.resetCard();
      }
      return;
    }

    // 2. 计算下一个选项索引 (不是题目索引！)
    const currentIndex = this.data.currentRulerIndex;
    let nextOptionIndex = currentIndex;
    const maxIndex = 6; // 0-6

    if (diff < 0) { // 向左滑 -> 选右边的项 (Index + 1)
      if (currentIndex < maxIndex) {
        nextOptionIndex = currentIndex + 1;
      } else {
        this.resetCard(); return;
      }
    } else { // 向右滑 -> 选左边的项 (Index - 1)
      if (currentIndex > 0) {
        nextOptionIndex = currentIndex - 1;
      } else {
        this.resetCard(); return;
      }
    }

    // ⚠️ 修复：调用正确的飞出动画函数
    this.flyOutAndSwitch(diff > 0, nextOptionIndex);
  },

  /**
   * 辅助：回弹复位
   */
  resetCard() {
    this.setData({
      cardTransition: 'transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);', // Q弹效果
      cardTransform: 'transform: translateX(0) rotate(0deg);',
      // 底层卡片缩回去
      backgroundTransform: 'transform: scale(0.95) translateY(10rpx); transition: transform 0.3s;'
    });
    this.currentMoveX = 0;
  },

  /**
   * 核心：飞出切换闭环（用于切换选项）
   */
  flyOutAndSwitch(isRight: boolean, nextIndex: number) {
    // 1. 锁定标记 (虽然会被 touchStart 强解，但流程内需要)
    this.setData({ isAnimating: true });

    // 2. 执行飞出
    const flyDist = isRight ? 1000 : -1000;
    const flyRotate = isRight ? 30 : -30;

    this.setData({
      cardTransition: 'transition: transform 0.2s ease-in, opacity 1.5s ease-in;',
      cardTransform: `transform: translateX(${flyDist}px) rotate(${flyRotate}deg); opacity: 0;`,
      // 保持底层不动
      backgroundTransform: 'transform: scale(1.0) translateY(0); transition: none;'
    });

    // 3. 这里的 setTimeout 改用 addTimer 管理
    // 时间压缩到 200ms (与动画时长一致，不留缓冲，追求极速)
    this.addTimer(() => {
      // 更新数据
      this.updateIndex(nextIndex);

      // 瞬间归位
      this.setData({
        cardTransition: 'transition: none;',
        cardTransform: 'transform: translateX(0) rotate(0deg); opacity: 0;'
      }, () => {
        // 淡入
        this.addTimer(() => {
          this.setData({
            cardTransition: 'transition: opacity 0.15s ease-out;', // 淡入再快一点
            cardTransform: 'transform: translateX(0) rotate(0deg); opacity: 1;',

            // 底层复位
            backgroundTransform: 'transform: scale(0.95) translateY(10rpx); transition: transform 0.3s;',
            previewText: '',

            // 解锁
            isAnimating: false,
            isCardSelected: false
          });
          this.currentMoveX = 0;
        }, 30); // 极短的帧间隔
      });
    }, 200);
  },

  /**
   * ⚠️ 新增：页面级触摸结束 (用于切换上一题/下一题)
   * 绑定在 card-container 上
   */
  onTouchEnd(e: any) {
    // 如果正在动画，或者不是从顶部图片区域开始滑的，忽略
    if (this.data.isAnimating || !this.touchStartX) return;

    const diff = this.currentMoveX;
    const absDiff = Math.abs(diff);

    // 移动距离不够 -> 回弹
    if (absDiff < THRESHOLD) {
      this.resetCard();
      return;
    }

    // 判断是否切换题目
    const isRight = diff > 0;
    const nextQIndex = isRight ? this.data.currentQIndex - 1 : this.data.currentQIndex + 1;

    // 边界检查
    if (nextQIndex < 0 || nextQIndex >= questions.length) {
      this.resetCard();
      return;
    }

    // 调用切题动画
    this.animateQuestionSwitch(isRight, nextQIndex);
  },
  _saveCurrentAnswer() {
    const { currentQIndex, rulerValue, answers } = this.data;
    const currentQuestion = questions[currentQIndex];

    // 构造标准答案对象
    // 注意：rulerValue 此时已经是 0-6 的索引值，直接用即可
    const newAnswer: Answer = {
      q_id: currentQuestion.id,
      selected_index: rulerValue 
    };

    // 复制一份现有的答案数组
    const newAnswers = [...answers];
    
    // 使用“索引覆盖”而不是 push，防止用户回退修改答案时数据错位
    newAnswers[currentQIndex] = newAnswer; 

    // 更新 data
    this.setData({ answers: newAnswers });
    
    // 返回最新数组供后续逻辑使用
    return newAnswers;
  },

  /**
   * ⚠️ 新增：统一处理下一步去向 (无论是滑过去的，还是点过去的)
   */
  handleNextStep(nextQIndex: number) {
    this._saveCurrentAnswer();
    const currentStageStr = this.data.currentStage;
    const stageConfig = STAGE_MAP[currentStageStr];

    // 🛑 核心判断：越界检查
    // 如果下一题的索引 (比如 10) 大于本阶段的结束索引 (比如 9)
    if (stageConfig && nextQIndex > stageConfig.end) {
      
      // A. 触发阶段跳转
      if (stageConfig.nextStage) {
        this.goToNextStage(stageConfig.nextStage);
      } else {
        this.finishAllTests();
      }
      return; // ⛔️ 拦截成功，不再加载题目
    }

    // B. 未越界 -> 正常加载下一题
    this.updateQuestion(nextQIndex);
    
    // C. 归位动画 (新卡片淡入)
    this.resetCardAnimation();
  },

  /**
   * ⚠️ 新增：辅助：重置卡片动画 (抽离出来复用)
   */
  resetCardAnimation() {
    this.setData({
      cardTransition: 'transition: none;',
      cardTransform: 'transform: translateX(0) rotate(0deg); opacity: 0;'
    }, () => {
      // 使用 addTimer 或 setTimeout
      setTimeout(() => {
        this.setData({
          cardTransition: 'transition: opacity 0.2s ease-out;',
          cardTransform: 'transform: translateX(0) rotate(0deg); opacity: 1;',
          backgroundTransform: 'transform: scale(0.95) translateY(10rpx); transition: transform 0.3s;',
          previewText: '',
          isAnimating: false,
          isCardSelected: false,
          hasInteracted: false // 记得重置交互状态
        });
        this.currentMoveX = 0;
      }, 50);
    });
  },

  /**
   * ⚠️ 新增：跳转到下一阶段过场页
   */
  goToNextStage(nextStage: string) {
    wx.redirectTo({
      url: `/pages/transition/index?stage=${nextStage}`
    });
  },

  /**
   * ⚠️ 新增：完成所有测试
   */
  finishAllTests() {
    wx.showLoading({ title: '正在分析灵魂...', mask: true });

    try {
      // 1. 双重保险：确保最后一道题的答案也被存下来了
      const finalAnswers = this._saveCurrentAnswer();

      // 2. 启动计算引擎
      const core = new LogicCore();

      // 3. 注入所有答案
      finalAnswers.forEach((ans: Answer, index: number) => {
        // 容错：防止数组越界
        if (index < questions.length) {
          const qItem = questions[index];
          // 核心调用：传入题目和用户选的 0-6 索引
          core.processAnswer(qItem, ans.selected_index);
        }
      });

      // 4. 获取最终结果
      const rawResult = core.getFinalResult();
      console.log('✅ MBTI计算完成:', rawResult);

      // 5. 存入缓存 (Result页面会读取这个Key)
      wx.setStorageSync('USER_MBTI_RESULT', rawResult);
      
      // 6. 跳转结果页
      wx.hideLoading();
      wx.reLaunch({
        url: '/pages/result/index'
      });

    } catch (err) {
      console.error('❌ 计算崩溃:', err);
      wx.hideLoading();
      wx.showToast({ title: '计算遇到点小问题，请重试', icon: 'none' });
    }
  },

  /**
   * ⚠️ 重构：切换题目专用动画
   * 原 flyOutAndSwitch 改名而来，专门处理 handleNextStep
   */
  animateQuestionSwitch(isRight: boolean, nextQIndex: number) {
    this.setData({ isAnimating: true });

    const flyDist = isRight ? 1000 : -1000;
    const flyRotate = isRight ? 30 : -30;

    this.setData({
      cardTransition: 'transition: transform 0.2s ease-in, opacity 1.5s ease-in;',
      cardTransform: `transform: translateX(${flyDist}px) rotate(${flyRotate}deg); opacity: 0;`,
      backgroundTransform: 'transform: scale(1.0) translateY(0); transition: none;'
    });

    this.addTimer(() => {
      // ⚠️ 这里才是调用 handleNextStep (切题)
      this.handleNextStep(nextQIndex);
    }, 200);
  },

  /**
   * 专用动画：切换到下一题
   * @param nextQIndex 下一题的题目索引
   */
  animateToNextQuestion(nextQIndex: number) {
    // ⚠️ 修改：调用切题专用动画
    this.animateQuestionSwitch(false, nextQIndex);
  },

  /**
   * 统一更新入口 - 更新索引并同步滑块
   */
  updateIndex(index: number) {
    // 强制钳制在 0 - 6 之间
    let safeIndex = Math.max(0, Math.min(index, 6));
    
    const options = this.data.currentQuestion.opts || [];
    const answerText = options[safeIndex] || '';
    
    // 只要用户动了，就隐藏提示
    if (!this.data.hasMoved) {
      this.setData({ hasMoved: true });
    }
    
    this.setData({
      currentRulerIndex: safeIndex,
      rulerValue: safeIndex, // 传递索引 (0-6)
      currentAnswerText: answerText,
      hasAnswered: true
    });
  },

  /**
   * 点击卡片 - 沉浸式交互（增强视觉反馈）
   */
  onCardTap() {
    console.log('Card Tapped! isAnimating:', this.data.isAnimating);
    
    // 1. 基础动画锁
    if (this.data.isAnimating) return;

    // ⚠️ 核心修改：移除拦截逻辑
    // 点击卡片本身就是一种交互，代表用户认可当前滑块的值（哪怕是默认值）
    
    // 2. 标记为已交互 (这样也会点亮底部的下一题按钮)
    if (!this.data.hasInteracted) {
      this.setData({ hasInteracted: true });
    }

    // 3. 夺取控制权（防止连点）
    this.clearAllTimers();
    
    // 4. 立即变色 (视觉确认)
    this.setData({ isCardSelected: true });
    
    // 5. 震动反馈
    wx.vibrateShort({ type: 'medium' });

    // 6. 延迟跳转
    this.addTimer(() => {
       console.log('Executing onNextTap after 150ms delay');
       // 执行下一题逻辑
       this.onNextTap();

       // 稍后重置样式
       setTimeout(() => {
         this.setData({ isCardSelected: false });
       }, 500);
    }, 150); // 稍微缩短一点等待时间，更爽快
  },

  /**
   * 下一题
   */
  onNextTap() {
    if (this.data.isAnimating) return;

    // 这里的拦截依然保留，专门针对直接点底部按钮的情况
    if (!this.data.hasInteracted) {
      wx.vibrateLong();
      wx.showToast({
        title: '请拖动滑块或点击卡片确认', // 文案微调
        icon: 'none',
        duration: 1500
      });
      return;
    }

    // 获取题目总数
    const maxIndex = questions.length - 1;

    // ⚠️ 边界防御：如果是最后一题，禁止跳转下一题，而是去结算
    if (this.data.currentQIndex >= maxIndex) {
      this.goToResult(); // 跳转结算页
      return;
    }

    // ⚠️ 修正：调用切题专用动画
    this.animateToNextQuestion(this.data.currentQIndex + 1);
  },

  /**
   * 上一题
   */
  onPrevTap() {
    if (this.data.isAnimating || this.data.currentQIndex <= 0) return;

    // 简单切换，不飞出
    this.updateQuestion(this.data.currentQIndex - 1);
  },

  /**
   * 辅助：更新题目 (修复跳转 Bug)
   */
  updateQuestion(qIndex: number) {
    // 获取题目列表
    const nextQ = questions[qIndex];

    if (!nextQ) return; // 容错

    const defaultRulerIndex = 3; // 强制重置到中间 (Index 3)

    // ⚠️ 数据拆分：将原始文本拆分为 tag、story、question
    const rawText = nextQ.txt;

    // 1. 提取标签 (正则匹配 【xxx】)
    const tagMatch = rawText.match(/【(.*?)】/);
    const tag = tagMatch ? tagMatch[1] : '场景';

    // 2. 移除标签后的剩余文本
    let content = rawText.replace(/【.*?】/, '');

    // 3. 简单拆分 Story 和 Question (假设最后一句是问题)
    const parts = content.split('，'); // 或根据句号拆分
    const question = parts.pop(); // 取最后一句作为问题
    const story = parts.join('，'); // 剩下的作为情境

    // 构造新的显示对象
    const displayQ = {
      ...nextQ,
      tag: tag,
      story: story,
      question: question
    };

    this.setData({
      currentQIndex: qIndex, // ⚠️ 关键修正：更新正确的变量名
      currentQuestion: displayQ, // ⚠️ 关键修复：必须更新题目对象，否则文字不会变
      currentRulerIndex: defaultRulerIndex,
      rulerValue: defaultRulerIndex, // 同步给组件
      hasAnswered: false,
      progressPercent: Math.round((qIndex / questions.length) * 100),
      currentAnswerText: nextQ.opts[defaultRulerIndex] || '',
      hasMoved: false,
      previewText: '', // 清理预览文字 (防止闪烁)
      hasInteracted: false // ⚠️ 核心：新题目默认未交互
    });
  },

  /**
   * 跳转结算
   */
  goToResult() {
    wx.showToast({ title: '测试完成', icon: 'success' });
    // 实际跳转逻辑
    // wx.navigateTo({ url: '/pages/result/index' });
  },

  /**
   * 刻度尺实时拖动事件
   */
  onRulerChanging(e: WechatMiniprogram.CustomEvent) {
    const index = e.detail.index as number;
    this.updateIndex(index);
  },

  /**
   * 刻度尺值变化事件（松手确认）
   */
  onRulerChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.detail.value as number;
    const index = e.detail.index as number;
    
    this.setData({
      rulerValue: index, // 修复：传递索引 (0-6) 而不是值 (-3 到 3)
      hasAnswered: true,
      hasInteracted: true // ⚠️ 核心：只要动了滑块，就视为已答题
    });
  },

  /**
   * 下一题按钮点击事件（带防抖）
   */
  onNext() {
    // 防抖逻辑
    if (this._isDebouncing) return;
    this._isDebouncing = true;
    setTimeout(() => { this._isDebouncing = false; }, 500);

    const { currentQIndex } = this.data;
    const maxIndex = questions.length - 1;

    if (currentQIndex < maxIndex) {
      // 动画切题 -> 动画结束后会自动调用 handleNextStep -> 自动保存答案
      this.animateToNextQuestion(currentQIndex + 1);
    } else {
      // 已经是最后一题 -> 直接结算
      this.finishAllTests();
    }
  },

  _isDebouncing: false,

  /**
   * ⚠️ 新增：空函数，专门用于阻止事件冒泡
   * 防止滑块区域的触摸事件冒泡到父容器触发切题逻辑
   */
  preventBubble() {
    // Do nothing, just stop propagation
    return;
  }
});