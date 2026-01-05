// 组件属性类型定义
interface RulerSliderProps {
  value?: number; // 当前值，范围 -3 到 3
  options?: string[]; // 选项文字数组，对应 -3 到 +3 的 7 个选项
}

// 组件数据类型定义
interface RulerSliderData {
  cursorLeft: number; // 光标位置（像素）
  val: number; // 当前刻度索引 (0-6，对应 -3 到 +3)
  trackWidth: number; // 轨道宽度
  startX: number; // 拖动起始X坐标
  currentOptionText: string; // 当前选项文字
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
    cursorLeft: 0,
    val: 3, // 默认中心位置 (索引3对应值0)
    trackWidth: 0,
    startX: 0,
    currentOptionText: ''
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
      this.updateCursorPosition(index);
      this.updateOptionText(index);
    },
    'options': function(newOpts: string[]) {
      // 选项变化时更新显示
      const { val } = this.data;
      this.updateOptionText(val);
    }
  },

  methods: {
    /**
     * 初始化刻度尺
     */
    initRuler() {
      const query = this.createSelectorQuery();
      query.select('.ruler-track').boundingClientRect();
      query.exec((res: any[]) => {
        if (res && res[0]) {
          const trackWidth = res[0].width;
          const initialValue = this.properties.value || 0;
          const index = this.valueToIndex(initialValue);
          
          this.setData({
            trackWidth,
            val: index
          });
          this.updateCursorPosition(index);
          this.updateOptionText(index);
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
     * 更新光标位置
     * @param index 刻度索引 (0-6)
     */
    updateCursorPosition(index: number) {
      const { trackWidth } = this.data;
      // 将索引映射到像素位置
      // 0 -> 0, 3 -> trackWidth/2, 6 -> trackWidth
      const cursorLeft = (index / 6) * trackWidth;
      this.setData({ cursorLeft });
    },

    /**
     * 更新选项文字显示
     * @param index 刻度索引 (0-6)
     */
    updateOptionText(index: number) {
      const options = this.properties.options || [];
      if (options.length > 0 && index >= 0 && index < options.length) {
        this.setData({ currentOptionText: options[index] });
      } else {
        this.setData({ currentOptionText: '' });
      }
    },

    /**
     * 触摸开始
     */
    onTouchStart(e: WechatMiniprogram.TouchEvent) {
      const touch = e.touches[0];
      this.setData({
        startX: touch.clientX
      });
    },

    /**
     * 触摸移动
     */
    onTouchMove(e: WechatMiniprogram.TouchEvent) {
      const { trackWidth, startX } = this.data;
      const touch = e.touches[0];
      
      // 计算触摸点相对于轨道左侧的位置
      const query = this.createSelectorQuery();
      query.select('.ruler-track').boundingClientRect();
      query.exec((res: any[]) => {
        if (res && res[0]) {
          const trackRect = res[0];
          const relativeX = touch.clientX - trackRect.left;
          
          // 限制范围
          const clampedX = Math.max(0, Math.min(trackWidth, relativeX));
          
          // 计算对应的索引
          const index = Math.round((clampedX / trackWidth) * 6);
          
          // 更新光标位置
          this.setData({ cursorLeft: clampedX });
          
          // 触发震动反馈（当索引变化时）
          if (index !== this.data.val) {
            this.setData({ val: index });
            this.updateOptionText(index);
            wx.vibrateShort({ type: 'light' });
          }
        }
      });
    },

    /**
     * 触摸结束
     */
    onTouchEnd() {
      const { val } = this.data;
      
      // 磁吸到最近的刻度
      this.updateCursorPosition(val);
      
      // 触发震动反馈
      wx.vibrateShort({ type: 'medium' });
      
      // 触发 change 事件
      const value = this.indexToValue(val);
      this.triggerEvent('change', {
        value: value,
        index: val
      });
    }
  }
});
