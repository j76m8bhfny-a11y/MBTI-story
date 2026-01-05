import { questions } from '../../data/questions';
import { Answer, MBTIResult } from '../../types';
import { calculateMBTI } from '../../utils/mbti-core';

interface TestPageData {
  currentIndex: number;
  currentQuestion: typeof questions[0];
  rulerValue: number;
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
}

// 常量定义
const SCREEN_WIDTH = 375; // 估算值，用于计算飞出距离
const THRESHOLD = 80; // 触发切换的距离阈值

Page<TestPageData, any>({
  data: {
    currentIndex: 0,
    currentQuestion: questions[0],
    rulerValue: 0,
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
    isAnimating: false
  },

  // 临时变量 (不放在 data 里以优化性能)
  touchStartX: 0,
  currentMoveX: 0,

  onLoad() {
    // 强制初始化一次，让 UI 显示默认文案
    const firstQuestion = questions[0];
    const defaultIndex = 3; // 中间位置
    
    this.setData({
      currentQuestion: firstQuestion,
      progressPercent: 0,
      currentAnswerText: firstQuestion.opts[defaultIndex] || '',
      currentRulerIndex: defaultIndex
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
    
    const moveX = e.touches[0].clientX;
    const diff = moveX - this.touchStartX;
    this.currentMoveX = diff;

    // 旋转角度：移动越远转得越多，最大 15度
    const rotate = diff * 0.05;
    
    this.setData({
      cardTransform: `transform: translateX(${diff}px) rotate(${rotate}deg);`
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

    // 向左滑(diff < 0) -> 下一题(Index+1) -> 往左飞
    // 向右滑(diff > 0) -> 上一题(Index-1) -> 往右飞
    if (diff < 0 && currentIndex < 6) {
      nextIndex = currentIndex + 1;
    } else if (diff > 0 && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    } else {
      // 到了尽头滑不动 -> 回弹
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
      cardTransform: 'transform: translateX(0) rotate(0deg);'
    });
    this.currentMoveX = 0;
  },

  /**
   * 核心：飞出 -> 换字 -> 归位
   */
  flyOutAndSwitch(isRight: boolean, nextIndex: number) {
    this.setData({ isAnimating: true });

    // 1. 飞出屏幕 (Fly Out)
    const flyDist = isRight ? SCREEN_WIDTH : -SCREEN_WIDTH;
    const flyRotate = isRight ? 20 : -20;
    
    this.setData({
      cardTransition: 'transition: transform 0.2s ease-in;', // 加速飞出
      cardTransform: `transform: translateX(${flyDist}px) rotate(${flyRotate}deg); opacity: 0;` // 顺便透明化
    });

    // 2. 动画结束后重置 (Reset & Update)
    setTimeout(() => {
      // 更新数据
      this.updateIndex(nextIndex);
      
      // 瞬间瞬移回原点 (无动画)
      this.setData({
        cardTransition: 'transition: none;',
        cardTransform: 'transform: translateX(0) rotate(0deg); opacity: 0;' // 先保持透明
      }, () => {
        // 3. 下一帧淡入 (Fade In)
        setTimeout(() => {
          this.setData({
            cardTransition: 'transition: opacity 0.2s ease-out;',
            cardTransform: 'transform: translateX(0) rotate(0deg); opacity: 1;'
          });
          // 动画结束锁解除
          this.setData({ isAnimating: false });
          this.currentMoveX = 0;
        }, 50);
      });
    }, 200); // 等待飞出动画完成
  },

  /**
   * 统一更新入口 - 更新索引并同步滑块
   */
  updateIndex(index: number) {
    const options = this.data.currentQuestion.opts || [];
    const answerText = options[index] || '';
    const value = index - 3; // 将索引转换为值 (-3 到 3)
    
    // 只要用户动了，就隐藏提示
    if (!this.data.hasMoved) {
      this.setData({ hasMoved: true });
    }
    
    this.setData({
      currentRulerIndex: index,
      rulerValue: value,
      currentAnswerText: answerText,
      hasAnswered: true
    });
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
      rulerValue: value,
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
      selected_index: rulerValue + 3 // 将 -3~3 转换为 0~6 的索引
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
        currentQuestion: nextQuestion,
        rulerValue: 0,
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
