// 组件属性类型定义
interface RulerSliderProps {
  value?: number; // 当前值，范围 -3 到 3
  options?: string[]; // 选项文字数组，对应 -3 到 +3 的 7 个选项
}

// 组件数据类型定义
interface RulerSliderData {
  thumbLeft: number; // 滑块位置（像素）
  val: number; // 当前刻度索引 (0-6，对应 -3 到 +3)
  trackWidth: number; // 轨道宽度
  trackRect: any; // 轨道位置信息
  startX: number; // 拖动起始X坐标
  isDragging: boolean; // 是否正在拖动
  thumbEmoji: string; // 滑块上的 emoji
}

Component({
  properties: {
    value: {
      type: Number,
      value: 0
    },
    options: {
      type: Array,
      value: []
    }
  },

  data: {
    thumbLeft: 0,
    val: 3, // 默认中心位置 (索引3对应值0)
    trackWidth: 0,
    trackRect: null,
    startX: 0,
    isDragging: false,
    thumbEmoji: '😐'
  } as RulerSliderData,

  lifetimes: {
    attached() {
      this.initRuler();
    }
  },

  observers: {
    'value': function(newVal: number) {
      // 外部 value 变化时更新内部状态
      const index = this.valueToIndex(newVal);
      this.setData({ val: index });
      this.updateThumbPosition(index);
      this.updateThumbEmoji(index);
    }
  },

  methods: {
    /**
     * 初始化刻度尺
     */
    initRuler() {
      const query = this.createSelectorQuery();
      query.select('.track').boundingClientRect();
      query.exec((res: any[]) => {
        if (res && res[0]) {
          const trackWidth = res[0].width;
          const initialValue = this.properties.value || 0;
          const index = this.valueToIndex(initialValue);
          
          this.setData({
            trackWidth,
            trackRect: res[0],
            val: index
          });
          this.updateThumbPosition(index);
          this.updateThumbEmoji(index);
        }
      });
    },

    /**
     * 将值转换为刻度索引
     * @param value 值 (-3 到 3)
     * @returns 索引 (0 到 6)
     */
    valueToIndex(value: number): number {
      return Math.round(value) + 3;
    },

    /**
     * 将刻度索引转换为值
     * @param index 索引 (0 到 6)
     * @returns 值 (-3 到 3)
     */
    indexToValue(index: number): number {
      return index - 3;
    },

    /**
     * 更新滑块位置
     * @param index 刻度索引 (0-6)
     */
    updateThumbPosition(index: number) {
      const { trackWidth } = this.data;
      // 将索引映射到像素位置
      // 0 -> 0, 3 -> trackWidth/2, 6 -> trackWidth
      const thumbLeft = (index / 6) * trackWidth;
      this.setData({ thumbLeft });
    },

    /**
     * 更新滑块 emoji
     * @param index 刻度索引 (0-6)
     */
    updateThumbEmoji(index: number) {
      const emojiMap = ['😭', '😢', '😟', '😐', '🙂', '😊', '😎'];
      const emoji = emojiMap[index] || '😐';
      this.setData({ thumbEmoji: emoji });
    },

    /**
     * WXS 触摸开始回调
     */
    onTouchStart(e: any) {
      this.setData({
        isDragging: true,
        startX: e.clientX
      });
    },

    /**
     * WXS 实时索引变化回调
     */
    onProjectedIndexChange(e: any) {
      const { index, thumbLeft } = e;
      
      // 更新滑块位置
      this.setData({ thumbLeft });
      
      // 触发震动反馈（当索引变化时）
      if (index !== this.data.val) {
        this.setData({ val: index });
        this.updateThumbEmoji(index);
        wx.vibrateShort({ type: 'light' });
        
        // 抛出实时变化事件
        this.triggerEvent('changing', {
          value: this.indexToValue(index),
          index: index
        });
      }
    },

    /**
     * WXS 触摸结束回调
     */
    onTouchEnd() {
      const { val } = this.data;
      
      // 磁吸到最近的刻度
      this.updateThumbPosition(val);
      
      // 触发震动反馈
      wx.vibrateShort({ type: 'medium' });
      
      // 触发 change 事件
      const value = this.indexToValue(val);
      this.triggerEvent('change', {
        value: value,
        index: val
      });
      
      // 触发 emoji 变化事件
      const emojiMap = ['😭', '😢', '😟', '😐', '🙂', '😊', '😎'];
      this.triggerEvent('emoji-change', {
        emoji: emojiMap[val] || '😐'
      });
      
      this.setData({ isDragging: false });
    }
  }
});
