import { questions } from '../../data/questions';
import { Answer, MBTIResult } from '../../types';
import { calculateMBTI } from '../../utils/mbti-core';

interface TestPageData {
  currentIndex: number;
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
}

// 常量定义
const SCREEN_WIDTH = 375; // 估算值，用于计算飞出距离
const THRESHOLD = 80; // 触发切换的距离阈值

Page<TestPageData, any>({
  data: {
    currentIndex: 0,
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
    isCardSelected: false
  },

  // 临时变量 (不放在 data 里以优化性能)
  touchStartX: 0,
  currentMoveX: 0,

  onLoad() {
    // 强制初始化一次，让 UI 显示默认文案
    const firstQuestion = questions[0];
    const defaultIndex = 3; // 中间位置 (索引3对应值0)
    
    this.setData({
      currentQuestion: firstQuestion,
      progressPercent: 0,
      currentAnswerText: firstQuestion.opts[defaultIndex] || '',
      currentRulerIndex: defaultIndex,
      rulerValue: defaultIndex // 修复：传递索引 (0-6) 而不是值 (-3 到 3)
    });
  },

  /**
   * 卡片触摸开始 - 记录起点
   */
  onCardTouchStart(e: WechatMiniprogram.TouchEvent) {
    if (this.data.isAnimating) return;
    this.touchStartX = e.touches[0].clientX;
    this.setData({
      cardTransition: 'transition: none;' // 拖拽时移除过渡，实现0延迟跟随
    });
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

    // 更新预览文字
    const opts = this.data.currentQuestion.opts || [];
    if (previewIndex !== -1) {
      const nextTxt = opts[previewIndex];
      if (this.data.previewText !== nextTxt) {
        this.setData({ previewText: nextTxt });
      }
      
      // 只有在有效范围内才做视差缩放
      const progress = Math.min(Math.abs(diff) / 200, 1);
      const newScale = 0.95 + (0.05 * progress);
      const newY = 10 - (10 * progress);
      
      this.setData({
        backgroundTransform: `transform: scale(${newScale}) translateY(${newY}rpx);`
      });
    } else {
      // ⚠️ 边界状态：底层卡片不动，或者清空文字
      this.setData({ 
        previewText: '',
        backgroundTransform: 'transform: scale(0.95) translateY(10rpx);' // 保持缩小
      });
    }

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
   * 卡片触摸结束 - 结算
   */
  onCardTouchEnd() {
    if (this.data.isAnimating) return;

    const diff = this.currentMoveX;
    const absDiff = Math.abs(diff);

    // 情况 A: 移动距离不够 -> 回弹复位
    if (absDiff < THRESHOLD) {
      this.resetCard();
      return;
    }

    // 情况 B: 触发切换
    const currentIndex = this.data.currentRulerIndex;
    let nextIndex = currentIndex;
    const maxIndex = 6;

    // 向左滑(diff < 0) -> 下一题(Index+1) -> 往左飞
    // 向右滑(diff > 0) -> 上一题(Index-1) -> 往右飞
    if (diff < 0) {
      // ⚠️ 核心修复：必须严格检查 < 6
      if (currentIndex < maxIndex) {
        nextIndex = currentIndex + 1;
      } else {
        // 如果是最后一题还往左滑，可以做个回弹提示，或者直接去结算
        // 这里简单处理：回弹，不准滑出去变白
        this.resetCard(); 
        return;
      }
    } else if (diff > 0) {
      // ⚠️ 核心修复：必须严格检查 > 0
      if (currentIndex > 0) {
        nextIndex = currentIndex - 1;
      } else {
        this.resetCard();
        return;
      }
    } else {
      this.resetCard();
      return;
    }

    // 执行飞出动画
    this.flyOutAndSwitch(diff > 0, nextIndex);
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
    this.setData({ isAnimating: true });

    // 定义飞出距离 (假设 SCREEN_WIDTH 或直接用 400px)
    const flyDist = isRight ? 400 : -400;
    const flyRotate = isRight ? 20 : -20;

    // A. 顶层卡片飞出
    this.setData({
      cardTransition: 'transition: transform 0.2s ease-in;',
      cardTransform: `transform: translateX(${flyDist}px) rotate(${flyRotate}deg); opacity: 0;`,
      // 视觉欺骗：保持底层卡片最大化，充当"主角"
      backgroundTransform: 'transform: scale(1.0) translateY(0); transition: none;'
    });

    setTimeout(() => {
      // B. 更新真实数据（切换选项）
      this.updateIndex(nextIndex); // 使用已有的 updateIndex 方法

      // C. 顶层卡片瞬间归位 (隐形状态)
      this.setData({
        cardTransition: 'transition: none;',
        cardTransform: 'transform: translateX(0) rotate(0deg); opacity: 0;'
      }, () => {
        
        // D. 顶层卡片淡入 (Fade In)
        setTimeout(() => {
          this.setData({
            cardTransition: 'transition: opacity 0.2s ease-out;',
            cardTransform: 'transform: translateX(0) rotate(0deg); opacity: 1;'
          });

          // E. 【闭环关键】底层卡片悄悄复位，为下一次做准备
          setTimeout(() => {
            this.setData({
              backgroundTransform: 'transform: scale(0.95) translateY(10rpx); transition: transform 0.3s;',
              previewText: ''
            });
            this.setData({ isAnimating: false });
            this.currentMoveX = 0;
          }, 200);

        }, 50);
      });
    }, 200);
  },

  /**
   * 专用动画：切换到下一题
   * @param nextQIndex 下一题的题目索引
   */
  animateToNextQuestion(nextQIndex: number) {
    this.setData({ isAnimating: true });

    // 1. 飞出动画 (固定向左飞，代表去未来)
    this.setData({
      cardTransition: 'transition: transform 0.2s ease-in;',
      cardTransform: 'transform: translateX(-400px) rotate(-20deg); opacity: 0;',
      // 视觉欺骗：底层卡片暂时不动或最大化
      backgroundTransform: 'transform: scale(1.0) translateY(0); transition: none;'
    });

    // 2. 动画结束，更新题目数据
    setTimeout(() => {
      // ⚠️ 关键修正：这里调用的是切题方法，而不是切滑块方法
      this.updateQuestion(nextQIndex);

      // 3. 顶层卡片瞬移归位 (隐形)
      this.setData({
        cardTransition: 'transition: none;',
        cardTransform: 'transform: translateX(0) rotate(0deg); opacity: 0;'
      }, () => {
        
        // 4. 顶层卡片淡入 (Fade In)
        setTimeout(() => {
          this.setData({
            cardTransition: 'transition: opacity 0.2s ease-out;',
            cardTransform: 'transform: translateX(0) rotate(0deg); opacity: 1;'
          });

          // 5. 底层/状态重置
          setTimeout(() => {
            this.setData({
              backgroundTransform: 'transform: scale(0.95) translateY(10rpx); transition: transform 0.3s;',
              previewText: '',
              isAnimating: false,
              isCardSelected: false // 确保高亮取消
            });
          }, 200);
        }, 50);
      });
    }, 200);
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
    
    // ⚠️ 修复：移除 hasAnswered 检查，允许用户随时点击确认
    if (this.data.isAnimating) return;

    // A. 立即变色 (视觉确认)
    this.setData({ isCardSelected: true });
    
    // B. 震动反馈
    wx.vibrateShort({ type: 'medium' });

    // C. 视觉暂留 (Wait 300ms)
    // 让用户看清楚卡片变色了，然后再飞走
    setTimeout(() => {
       console.log('Executing onNextTap after 300ms delay');
       // 执行下一题逻辑
       this.onNextTap();

       // 稍后重置样式
       setTimeout(() => {
         this.setData({ isCardSelected: false });
       }, 500);
    }, 300); // 300ms 停顿
  },

  /**
   * 下一题
   */
  onNextTap() {
    if (this.data.isAnimating) return;
    
    // 获取题目总数
    const maxIndex = questions.length - 1;

    // ⚠️ 边界防御：如果是最后一题，禁止跳转下一题，而是去结算
    if (this.data.currentIndex >= maxIndex) {
      this.goToResult(); // 跳转结算页
      return;
    }

    // ⚠️ 修正：调用切题专用动画
    this.animateToNextQuestion(this.data.currentIndex + 1);
  },

  /**
   * 上一题
   */
  onPrevTap() {
    if (this.data.isAnimating || this.data.currentIndex <= 0) return;
    
    // 简单切换，不飞出
    this.updateQuestion(this.data.currentIndex - 1);
  },

  /**
   * 辅助：更新题目 (修复跳转 Bug)
   */
  updateQuestion(qIndex: number) {
    // 获取题目列表
    const nextQ = questions[qIndex];

    if (!nextQ) return; // 容错

    const defaultRulerIndex = 3; // 强制重置到中间 (Index 3)

    this.setData({
      currentIndex: qIndex,
      currentQuestion: nextQ, // ⚠️ 关键修复：必须更新题目对象，否则文字不会变
      currentRulerIndex: defaultRulerIndex,
      rulerValue: defaultRulerIndex, // 同步给组件
      hasAnswered: false,
      progressPercent: Math.round((qIndex / questions.length) * 100),
      currentAnswerText: nextQ.opts[defaultRulerIndex] || '',
      hasMoved: false,
      previewText: '' // 清理预览文字 (防止闪烁)
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
      hasAnswered: true
    });
  },

  /**
   * 下一题按钮点击事件（带防抖）
   */
  onNext() {
    // 防抖：500ms 内只允许点击一次
    if (this._isDebouncing) {
      return;
    }
    this._isDebouncing = true;

    setTimeout(() => {
      this._isDebouncing = false;
    }, 500);

    // 记录当前题目的答案
    const { currentIndex, rulerValue, answers } = this.data;
    const currentQuestion = questions[currentIndex];

    const newAnswer: Answer = {
      q_id: currentQuestion.id,
      selected_index: rulerValue // 修复：rulerValue 已经是索引 (0-6)，不需要转换
    };

    const updatedAnswers = [...answers, newAnswer];

    // 判断是否还有下一题
    if (currentIndex < questions.length - 1) {
      // 切换到下一题
      const nextIndex = currentIndex + 1;
      const nextQuestion = questions[nextIndex];
      const defaultIndex = 3; // 中间位置
      
      this.setData({
        currentIndex: nextIndex,
        currentQuestion: nextQuestion, // ⚠️ 关键修复：必须更新题目对象
        rulerValue: defaultIndex, // 修复：传递索引 (0-6) 而不是值 (-3 到 3)
        currentRulerIndex: defaultIndex,
        hasAnswered: false,
        answers: updatedAnswers,
        progressPercent: Math.round((nextIndex / questions.length) * 100),
        currentAnswerText: nextQuestion.opts[defaultIndex] || '',
        hasMoved: false
      });
    } else {
      // 所有题目完成，计算 MBTI 结果并跳转到结果页
      const result: MBTIResult = calculateMBTI(updatedAnswers, questions);
      
      // 将结果存储到全局数据或缓存
      wx.setStorageSync('mbtiResult', result);
      wx.setStorageSync('testAnswers', updatedAnswers);

      // 跳转到结果页
      wx.redirectTo({
        url: '/pages/result/index'
      });
    }
  },

  _isDebouncing: false
});
