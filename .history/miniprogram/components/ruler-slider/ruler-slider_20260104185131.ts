// 组件属性类型定义
interface RulerSliderProps {
  value?: number; // 当前值，范围 -3 到 3
}

// 组件数据类型定义
interface RulerSliderData {
  cursorX: number; // 光标位置
  isDragging: boolean; // 是否正在拖动
  trackWidth: number; // 轨道宽度
  startX: number; // 拖动起始X坐标
  currentValue: number; // 当前值
}

Component<RulerSliderProps, RulerSliderData>({
  properties: {
    value: {
      type: Number,
      value: 0
    }
  },

  data: {
    cursorX: 0,
    isDragging: false,
    trackWidth: 0,
    startX: 0,
    currentValue: 0
  },

  lifetimes: {
    attached() {
      this.initRuler();
    }
  },

  methods: {
    /**
     * 初始化刻度尺
     */
    initRuler() {
      const query = this.createSelectorQuery();
      query.select('.slider-track').boundingClientRect();
      query.exec((res: any[]) => {
        if (res && res[0]) {
          const trackWidth = res[0].width;
          this.setData({
            trackWidth,
            currentValue: this.properties.value || 0
          });
          this.updateCursorPosition(this.properties.value || 0);
        }
      });
    },

    /**
     * 更新光标位置
     * @param value 当前值 (-3 到 3)
     */
    updateCursorPosition(value: number) {
      const { trackWidth } = this.data;
      // 将值映射到像素位置
      // -3 -> -trackWidth/2, 0 -> 0, 3 -> trackWidth/2
      const cursorX = (value / 3) * (trackWidth / 2);
      this.setData({ cursorX });
    },

    /**
     * 触摸开始
     */
    handleTouchStart(e: WechatMiniprogram.TouchEvent) {
      const touch = e.touches[0];
      this.setData({
        isDragging: true,
        startX: touch.clientX
      });
    },

    /**
     * 触摸移动
     */
    handleTouchMove(e: WechatMiniprogram.TouchEvent) {
      const { trackWidth, startX } = this.data;
      const touch = e.touches[0];
      
      // 计算偏移量
      const deltaX = touch.clientX - startX;
      
      // 限制范围
      const maxOffset = trackWidth / 2;
      const clampedDelta = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
      
      // 计算对应的值
      const value = Math.round((clampedDelta / maxOffset) * 3);
      
      // 更新光标位置
      this.setData({ cursorX: clampedDelta });
      
      // 触发震动反馈（当值变化时）
      if (value !== this.data.currentValue) {
        this.setData({ currentValue: value });
        wx.vibrateShort({ type: 'light' });
      }
    },

    /**
     * 触摸结束
     */
    handleTouchEnd() {
      const { currentValue } = this.data;
      
      // 磁吸到最近的整数格
      this.setData({
        isDragging: false
      });
      
      // 更新光标位置到吸附位置
      this.updateCursorPosition(currentValue);
      
      // 触发震动反馈
      wx.vibrateShort({ type: 'medium' });
      
      // 触发 change 事件
      this.triggerEvent('change', {
        value: currentValue
      });
    }
  }
});
