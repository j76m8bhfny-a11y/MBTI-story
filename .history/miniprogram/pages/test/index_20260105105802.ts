import { questions } from '../../data/questions';
import { Answer, MBTIResult } from '../../types';
import { calculateMBTI } from '../../utils/mbti-core';

interface TestPageData {
  currentIndex: number;
  currentQuestion: typeof questions[0];
  rulerValue: number;
  hasAnswered: boolean;
  answers: Answer[];
  progressPercent: number;
  currentAnswerText: string;
  currentEmoji: string;
}

Page<TestPageData, any>({
  data: {
    currentIndex: 0,
    currentQuestion: questions[0],
    rulerValue: 0,
    hasAnswered: false,
    answers: [],
    progressPercent: 0,
    currentAnswerText: '',
    currentEmoji: '😐'
  },

  onLoad() {
    // 强制初始化一次，让 UI 显示默认文案
    const firstQuestion = questions[0];
    const defaultIndex = 3; // 中间位置
    const emojiMap = ['😭', '😢', '😟', '😐', '🙂', '😊', '😎'];
    
    this.setData({
      currentQuestion: firstQuestion,
      currentAnswerText: firstQuestion.opts[defaultIndex] || '',
      currentEmoji: emojiMap[defaultIndex] || '😐'
    });
  },

  onLoad() {
    this.setData({
      currentQuestion: questions[0],
      progressPercent: 0
    });
  },

  /**
   * 刻度尺实时拖动事件
   */
  onRulerChanging(e: WechatMiniprogram.CustomEvent) {
    const index = e.detail.index as number;
    const options = this.data.currentQuestion.opts || [];
    
    // 根据 index 获取对应的 emoji
    const emojiMap = ['😭', '😢', '😟', '😐', '🙂', '😊', '😎'];
    const emoji = emojiMap[index] || '😐';
    const answerText = options[index] || '';
    
    this.setData({
      currentAnswerText: answerText,
      currentEmoji: emoji
    });
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
   * Emoji 变化事件（可选，用于更细粒度的控制）
   */
  onEmojiChange(e: WechatMiniprogram.CustomEvent) {
    const emoji = e.detail.emoji as string;
    this.setData({ currentEmoji: emoji });
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
        currentEmoji: '😐'
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
