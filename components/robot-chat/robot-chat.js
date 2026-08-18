Component({
  properties: {
    showChat: {
      type: Boolean,
      value: false,
      observer: function(newVal, oldVal) {
        console.log('showChat changed from', oldVal, 'to', newVal)
        if (newVal) {
          this.initMessages()
        }
      }
    }
  },

  data: {
    messages: [],
    inputText: '',
    scrollTop: 0,
    isTyping: false,
    isRecording: false
  },

  lifetimes: {
    attached() {
      console.log('Robot chat component attached')
    },
    ready() {
      console.log('Robot chat component ready')
    }
  },

  methods: {
    initMessages() {
      this.setData({
        messages: [{
          id: 1,
          type: 'robot',
          content: '你好！我是你的智能助手，有什么可以帮你的吗？'
        }]
      })
      this.scrollToBottom()
    },

    closeChat() {
      this.triggerEvent('close')
    },

    onInput(e) {
      this.setData({ inputText: e.detail.value })
    },

    sendMessage() {
      const message = this.data.inputText.trim()
      if (!message) return

      const newMessages = [...this.data.messages, {
        id: Date.now(),
        type: 'user',
        content: message
      }]

      this.setData({
        messages: newMessages,
        inputText: '',
        isTyping: true
      })

      this.scrollToBottom()

      setTimeout(() => {
        const reply = this.getReply(message)
        const updatedMessages = [...newMessages, {
          id: Date.now() + 1,
          type: 'robot',
          content: reply
        }]
        this.setData({
          messages: updatedMessages,
          isTyping: false
        })
        this.scrollToBottom()
      }, 1500)
    },

    getReply(message) {
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
        '帖子': '校园帖功能很丰富，快来发布你的想法吧！',
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
        this.setData({ scrollTop: 99999 })
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
      
      const newMessages = [...this.data.messages, {
        id: Date.now(),
        type: 'user',
        content: '[语音消息]'
      }, {
        id: Date.now() + 1,
        type: 'robot',
        content: randomReply
      }]
      
      this.setData({ messages: newMessages })
      this.scrollToBottom()
    }
  }
})