// 组件属性类型定义
interface RulerSliderProps {
  value?: number; // 当前索引 (0-6)，对应 -3 到 +3 的 7 个选项
  options?: string[]; // 选项文字数组，对应 -3 到 +3 的 7 个选项
}

// 组件数据类型定义
interface RulerSliderData {
  val: number; // 当前刻度索引 (0-6，对应 -3 到 +3)
  isWiggling: boolean; // 是否正在微动
}

Component({
  properties: {
    value: {
      type: Number,
      value: 3 // 默认中心位置
    },
    options: {
      type: Array,
      value: []
    }
  },

  data: {
    val: 3, // 默认中心位置 (索引3对应值0)
    isWiggling: false
  } as RulerSliderData,

  lifetimes: {
    ready() {
      this.triggerWiggle();
    }
  },

  // 注意：移除了之前的 observers: { 'value': ... } 
  // 因为现在由 WXML 里的 change:syncValue 接管了

  methods: {
    /**
     * WXS 实时索引变化回调
     */
    onProjectedIndexChange(e: any) {
      const { index } = e;
      
      // 触发震动反馈（当索引变化时）
      if (index !== this.data.val) {
        this.setData({ val: index });
        wx.vibrateShort({ type: 'light' });
        
        // 抛出实时变化事件
        this.triggerEvent('changing', {
          value: index - 3, // 将索引转换为值 (-3 到 3)
          index: index
        });
      }
    },

    /**
     * 触发滑块入场微动
     */
    triggerWiggle() {
      this.setData({ isWiggling: true });
      
      // 1秒后移除动画 class
      setTimeout(() => {
        this.setData({ isWiggling: false });
      }, 1000);
    }
  }
});
