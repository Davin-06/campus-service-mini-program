App({
  onLaunch() {
    try {
      console.log('小程序启动')
      this.loadRobotPosition()
    } catch (e) {
      console.error('启动异常:', e)
    }
  },
  globalData: {
    // 上线前请替换为已在微信公众平台配置的 HTTPS 合法域名。
    apiBaseUrl: 'http://127.0.0.1:3000/api',
    userInfo: null,
    robotPosition: {
      x: 20,
      y: 500
    }
  },
  loadRobotPosition() {
    try {
      const position = wx.getStorageSync('robotPosition')
      if (position) {
        this.globalData.robotPosition = position
      }
    } catch (e) {
      console.error('加载位置失败:', e)
    }
  },
  saveRobotPosition(x, y) {
    this.globalData.robotPosition = { x, y }
    try {
      wx.setStorageSync('robotPosition', { x, y })
    } catch (e) {
      console.error('保存位置失败:', e)
    }
  }
})
