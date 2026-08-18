const api = require('../../utils/api')

Page({
  data: {
    messages: [],
    unreadCount: 0,
    activeTab: 'all',
    tabs: [
      { id: 'all', name: '全部', badge: 0 },
      { id: 'like', name: '点赞', badge: 0 },
      { id: 'comment', name: '评论', badge: 0 },
      { id: 'follow', name: '关注', badge: 0 }
    ],
    filteredMessages: [],
    robotX: 20,
    robotY: 500
  },

  onLoad() {
    this.loadMessages()
    this.loadRobotPosition()
  },

  onShow() {
    this.loadMessages()
    this.clearUnread()
    this.loadRobotPosition()
  },

  loadMessages() {
    const that = this
    
    wx.request({
      url: api.url('/messages/list'),
      method: 'GET',
      success(res) {
        if (res.data && res.data.code === 200 && res.data.data) {
          that.processMessages(res.data.data)
        } else {
          that.loadMockMessages()
        }
      },
      fail() {
        that.loadMockMessages()
      }
    })
  },

  processMessages(data) {
    const messages = data.list || []
    const processedMessages = messages.map(item => ({
      id: item.id,
      type: item.type || 'like',
      avatar: item.avatar || `/images/avatar${(item.id % 4) + 1}.png`,
      nickname: item.nickname || '用户',
      content: item.content || '',
      postTitle: item.post_title || item.postTitle || '',
      commentContent: item.comment_content || item.commentContent || '',
      time: item.time || this.formatTime(item.created_at),
      read: item.read || false
    }))
    
    this.updateMessageData(processedMessages)
  },

  loadMockMessages() {
    const messages = this.getMockMessages()
    this.updateMessageData(messages)
  },

  updateMessageData(messages) {
    const unreadCount = messages.filter(m => !m.read).length
    
    const tabStats = {
      all: unreadCount,
      like: messages.filter(m => m.type === 'like' && !m.read).length,
      comment: messages.filter(m => m.type === 'comment' && !m.read).length,
      follow: messages.filter(m => m.type === 'follow' && !m.read).length
    }

    this.setData({
      messages: messages,
      unreadCount: unreadCount,
      tabs: this.data.tabs.map(tab => ({
        ...tab,
        badge: tabStats[tab.id]
      })),
      filteredMessages: messages
    })
  },

  formatTime(timestamp) {
    if (!timestamp) return '刚刚'
    
    const now = Date.now() / 1000
    const diff = now - (typeof timestamp === 'string' ? parseInt(timestamp) : timestamp)
    
    if (diff < 60) return '刚刚'
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前'
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前'
    return Math.floor(diff / 86400) + '天前'
  },

  getMockMessages() {
    return [
      {
        id: 1,
        type: 'like',
        avatar: '/images/avatar1.png',
        nickname: '张同学',
        content: '赞了你的帖子',
        postTitle: '关于高等数学学习方法的分享',
        time: '刚刚',
        read: false
      },
      {
        id: 2,
        type: 'comment',
        avatar: '/images/avatar2.png',
        nickname: '李同学',
        content: '评论了你的帖子',
        postTitle: '期末复习计划分享',
        commentContent: '这个计划太棒了！',
        time: '5分钟前',
        read: false
      },
      {
        id: 3,
        type: 'follow',
        avatar: '/images/avatar3.png',
        nickname: '王同学',
        content: '关注了你',
        time: '10分钟前',
        read: false
      },
      {
        id: 4,
        type: 'like',
        avatar: '/images/avatar4.png',
        nickname: '赵同学',
        content: '赞了你的帖子',
        postTitle: '英语四级备考经验',
        time: '30分钟前',
        read: true
      },
      {
        id: 5,
        type: 'comment',
        avatar: '/images/avatar1.png',
        nickname: '刘同学',
        content: '评论了你的帖子',
        postTitle: '校园失物招领：蓝色书包',
        commentContent: '找到了！谢谢！',
        time: '1小时前',
        read: true
      },
      {
        id: 6,
        type: 'like',
        avatar: '/images/avatar2.png',
        nickname: '陈同学',
        content: '赞了你的帖子',
        postTitle: '分享一个好用的学习APP',
        time: '2小时前',
        read: true
      },
      {
        id: 7,
        type: 'follow',
        avatar: '/images/avatar4.png',
        nickname: '杨同学',
        content: '关注了你',
        time: '3小时前',
        read: true
      },
      {
        id: 8,
        type: 'comment',
        avatar: '/images/avatar3.png',
        nickname: '黄同学',
        content: '评论了你的帖子',
        postTitle: '讨论：大学应该如何规划时间',
        commentContent: '同意你的观点！',
        time: '5小时前',
        read: true
      }
    ]
  },

  clearUnread() {
    this.setData({
      messages: this.data.messages.map(m => ({ ...m, read: true })),
      unreadCount: 0,
      tabs: this.data.tabs.map(tab => ({ ...tab, badge: 0 }))
    })
  },

  switchTab(e) {
    const tabId = e.currentTarget.dataset.tabId
    this.setData({
      activeTab: tabId
    })
    this.filterMessages(tabId)
  },

  filterMessages(tabId) {
    let filtered = this.data.messages
    if (tabId !== 'all') {
      filtered = this.data.messages.filter(m => m.type === tabId)
    }
    this.setData({
      filteredMessages: filtered
    })
  },

  goToPost(e) {
    const message = e.currentTarget.dataset.message
    if (message.postTitle) {
      wx.showToast({
        title: '查看帖子',
        icon: 'none'
      })
    }
  },

  goToProfile(e) {
    const nickname = e.currentTarget.dataset.nickname
    wx.showToast({
      title: `查看 ${nickname} 的主页`,
      icon: 'none'
    })
  },

  onPullDownRefresh() {
    this.loadMessages()
    wx.stopPullDownRefresh()
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
    wx.showToast({
      title: 'Hello! 我是机器人助手~',
      icon: 'none'
    })
  }
})
