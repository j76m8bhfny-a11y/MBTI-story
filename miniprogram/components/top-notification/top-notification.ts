interface TopNotificationData {
  show: boolean;
  text: string;
}

Component<TopNotificationData>({
  properties: {
    text: {
      type: String,
      value: ''
    },
    duration: {
      type: Number,
      value: 2000
    }
  },

  data: {
    show: false
  },

  methods: {
    /**
     * 显示通知
     */
    showNotification(text?: string) {
      const displayText = text || this.properties.text;
      this.setData({
        text: displayText,
        show: true
      });

      // 自动隐藏
      this._hideTimer = setTimeout(() => {
        this.hideNotification();
      }, this.properties.duration);
    },

    /**
     * 隐藏通知
     */
    hideNotification() {
      this.setData({
        show: false
      });
      if (this._hideTimer) {
        clearTimeout(this._hideTimer);
        this._hideTimer = null;
      }
    }
  },

  lifetimes: {
    detached() {
      if (this._hideTimer) {
        clearTimeout(this._hideTimer);
      }
    }
  },

  _hideTimer: null as number | null
});
