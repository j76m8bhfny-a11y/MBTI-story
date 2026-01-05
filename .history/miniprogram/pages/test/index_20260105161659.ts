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
  startX: number; // 卡片触摸起点
}

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
    startX: 0
  },

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
    this.setData({ startX: e.changedTouches[0].clientX });
  },

  /**
   * 卡片触摸结束 - 判断滑动方向并切换选项
   */
  onCardTouchEnd(e: WechatMiniprogram.TouchEvent) {
    const endX = e.changedTouches[0].clientX;
    const startX = this.data.startX;
    const diff = endX - startX;
    
    // 阈值设为 50px，防止误触
    if (Math.abs(diff) > 50) {
      const currentIndex = this.data.currentRulerIndex;
      let newIndex = currentIndex;

      if (diff > 0) {
        // 向右滑 -> 上一个 (Index - 1)
        newIndex = Math.max(0, currentIndex - 1);
      } else {
        // 向左滑 -> 下一个 (Index + 1)
        newIndex = Math.min(6, currentIndex + 1);
      }

      if (newIndex !== currentIndex) {
        this.updateIndex(newIndex);
      }
    }
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
      this.setData({
        currentIndex: nextIndex,
        currentQuestion: questions[nextIndex],
        rulerValue: 0,
        hasAnswered: false,
        answers: updatedAnswers,
        progressPercent: Math.round((nextIndex / questions.length) * 100),
        currentAnswerText: '',
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
