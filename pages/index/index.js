const api = require('../../utils/api')
const localData = require('../../utils/local-data')

Page({
  data: {
    banners: ['/images/1.jpg', '/images/2.jpg'],
    autoplay: true,
    interval: 3000,
    circular: true,
    indicatorDots: true,
    currentBannerIndex: 0,
    robotX: 20,
    robotY: 500,
    
    notices: [
      { id: 1, title: '关于开展校园环境卫生整治活动的通知', time: '05-11', top: true },
      { id: 2, title: '图书馆端午节假期开放安排', time: '05-10', top: true }
    ],
    activities: [
      { 
        id: 1, 
        title: '校园十佳歌手大赛',
        desc: '等你来报名！',
        time: '报名时间: 05.10-05.20',
        image: 'https://picsum.photos/seed/campus/600/400'
      }
    ],
    
    showRobotChat: false,
    chatMessages: [],
    chatInput: '',
    chatScrollTop: 0,
    isTyping: false,
    isRecording: false,
    chatPanelX: 60,
    chatPanelY: 200
  },

  onLoad() {
    this.loadRobotPosition()
  },

  onShow() {
    this.loadRobotPosition()
  },

  loadRobotPosition() {
    const app = getApp()
    this.setData({
      robotX: app.globalData.robotPosition.x,
      robotY: app.globalData.robotPosition.y
    })
  },

  onRobotDragEnd(e) {
    const app = getApp()
    const { x, y } = e.detail
    app.saveRobotPosition(x, y)
    this.setData({ robotX: x, robotY: y })
  },

  onRobotTap() {
    console.log('Robot tapped, current showRobotChat:', this.data.showRobotChat)
    this.setData({ 
      showRobotChat: true,
      chatMessages: [
        {
          id: 1,
          type: 'robot',
          content: '你好！我是你的智能助手，有什么可以帮你的吗？'
        }
      ]
    })
    this.scrollToBottom()
  },

  closeRobotChat() {
    this.setData({ showRobotChat: false })
  },

  onChatPanelMove(e) {
    const { x, y } = e.detail
    this.setData({
      chatPanelX: x,
      chatPanelY: y
    })
  },

  onChatInput(e) {
    this.setData({ chatInput: e.detail.value })
  },

  sendMessage() {
    const message = this.data.chatInput.trim()
    if (!message) return

    const newMessages = [...this.data.chatMessages, {
      id: Date.now(),
      type: 'user',
      content: message
    }]

    this.setData({
      chatMessages: newMessages,
      chatInput: '',
      isTyping: true
    })

    this.scrollToBottom()

    this.callAssistantAPI(message, newMessages)
  },

  callAssistantAPI(message, currentMessages) {
    wx.request({
      url: api.url('/assistant/chat'),
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        message,
        messages: currentMessages.slice(-10).map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      },
      success: (res) => {
        if (res.data && res.data.code === 200 && res.data.data && res.data.data.reply) {
          const updatedMessages = [...currentMessages, {
            id: Date.now() + 1,
            type: 'robot',
            content: res.data.data.reply
          }]
          this.setData({
            chatMessages: updatedMessages,
            isTyping: false
          })
          this.scrollToBottom()
        } else {
          this.handleAPIError(res.data?.message || this.getRobotReply(message))
        }
      },
      fail: () => {
        this.handleAPIError(this.getRobotReply(message))
      }
    })
  },

  handleAPIError(errorMsg) {
    const updatedMessages = [...this.data.chatMessages, {
      id: Date.now() + 1,
      type: 'robot',
      content: errorMsg
    }]
    this.setData({
      chatMessages: updatedMessages,
      isTyping: false
    })
    this.scrollToBottom()
  },

  getRobotReply(message) {
    const replies = {
      '你好': '你好呀！有什么我可以帮你的吗？',
      '天气': '今天天气晴朗，适合外出活动！',
      '时间': '现在是 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      '新闻': '我可以帮你查看最新的校园新闻，需要吗？',
      '帮助': '我可以帮你查询校园信息、天气、时间等，请问有什么需要帮助的？',
      '校园': '我们的校园非常美丽，有很多有趣的活动！',
      '课程': '可以帮你查看课表安排哦~',
      '图书馆': '图书馆周一至周五 8:00-22:00 开放',
      '食堂': '食堂提供各种美味的饭菜，欢迎品尝！',
      '活动': '近期有很多精彩的校园活动，快来参加吧！',
      '失物招领': '可以帮你发布或查找失物信息~',
      '帖子': '校园贴功能很丰富，快来发布你的想法吧！',
      '工具': '我们提供计算器、番茄钟等实用工具哦！'
    }

    for (const keyword in replies) {
      if (message.includes(keyword)) {
        return replies[keyword]
      }
    }

    return '抱歉，我还不太理解你的问题。你可以问我关于天气、时间、校园新闻等问题~'
  },

  scrollToBottom() {
    setTimeout(() => {
      this.setData({ chatScrollTop: 99999 })
    }, 100)
  },

  startRecording() {
    this.setData({ isRecording: true })
    wx.showToast({
      title: '正在录音，松开结束',
      icon: 'none',
      duration: 10000
    })
  },

  stopRecording() {
    this.setData({ isRecording: false })
    wx.hideToast()
    
    const voiceMessages = ['你说的我收到了！', '明白你的意思了~', '好的，我理解了！']
    const randomReply = voiceMessages[Math.floor(Math.random() * voiceMessages.length)]
    
    const newMessages = [...this.data.chatMessages, {
      id: Date.now(),
      type: 'user',
      content: '[语音消息]'
    }, {
      id: Date.now() + 1,
      type: 'robot',
      content: randomReply
    }]
    
    this.setData({ chatMessages: newMessages })
    this.scrollToBottom()
  },

  goToNews() {
    wx.switchTab({
      url: '/pages/news/news'
    })
  },

  goToPosts() {
    wx.switchTab({
      url: '/pages/posts/posts'
    })
  },

  goToLost() {
    wx.switchTab({
      url: '/pages/posts/posts'
    })
    setTimeout(() => {
      const pages = getCurrentPages()
      const postsPage = pages[pages.length - 1]
      if (postsPage && postsPage.changeFilter) {
        postsPage.changeFilter({ currentTarget: { dataset: { filter: 'lost' } } })
      }
    }, 300)
  },

  goToCalendar() {
    wx.navigateTo({
      url: '/pages/tools/tools?action=calendar'
    })
  },

  goToBanner() {
    const index = this.data.currentBannerIndex
    if (index === 0) {
      wx.switchTab({
        url: '/pages/news/news'
      })
    } else {
      wx.switchTab({
        url: '/pages/posts/posts'
      })
    }
  },

  onBannerChange(e) {
    this.setData({
      currentBannerIndex: e.detail.current
    })
  },

  goToNotice() {
    const content = this.data.notices.map(item => `${item.top ? '【置顶】' : ''}${item.title}（${item.time}）`).join('\n')
    wx.showModal({
      title: '校园公告',
      content,
      showCancel: false
    })
  },

  goToScenery() {
    wx.previewImage({
      current: this.data.banners[0],
      urls: this.data.banners
    })
  },

  goToConfession() {
    wx.showModal({
      title: '表白墙',
      editable: true,
      placeholderText: '写下一句想说的话',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          localData.addUnique('confessions', {
            id: Date.now(),
            content: res.content.trim()
          })
          wx.showToast({
            title: '已发布',
            icon: 'success'
          })
        }
      }
    })
  },

  goToMore() {
    wx.navigateTo({
      url: '/pages/tools/tools'
    })
  },

  goToActivities() {
    const itemList = this.data.activities.map(item => item.title)
    wx.showActionSheet({
      itemList,
      success: (res) => {
        const activity = this.data.activities[res.tapIndex]
        wx.showModal({
          title: activity.title,
          content: `${activity.desc}\n${activity.time}`,
          confirmText: '报名',
          success: (modalRes) => {
            if (modalRes.confirm) {
              this.joinActivity({ currentTarget: { dataset: { id: activity.id } } })
            }
          }
        })
      }
    })
  },

  joinActivity(e) {
    const id = e?.currentTarget?.dataset?.id || this.data.activities[0]?.id
    const activity = this.data.activities.find(item => item.id === id) || this.data.activities[0]
    if (activity) {
      localData.addUnique('myActivities', activity)
    }
    wx.showToast({
      title: '报名成功',
      icon: 'success'
    })
  }
})
