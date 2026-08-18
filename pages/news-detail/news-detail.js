const api = require('../../utils/api')
const localData = require('../../utils/local-data')

Page({
  data: {
    news: null,
    loading: true,
    robotX: 20,
    robotY: 500
  },

  onLoad(options) {
    console.log('新闻详情页加载，参数:', options)
    if (options && options.newsId) {
      this.loadNewsDetail(options.newsId)
    } else {
      this.setData({ loading: false })
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
    }
    this.loadRobotPosition()
  },

  onShow() {
    this.loadRobotPosition()
  },

  loadNewsDetail(newsId) {
    console.log('加载新闻详情，ID:', newsId)
    
    this.setData({ loading: true })

    const apiUrl = api.url(`/news/detail/${newsId}`)

    wx.request({
      url: apiUrl,
      method: 'GET',
      success: (res) => {
        console.log('API返回详情:', res.data)
        if (res.data && res.data.code === 200 && res.data.data) {
          const news = res.data.data
          const content = news.content || news.summary || '暂无内容'
          const paragraphs = content.split(/[。！？\n]+/).filter(p => p.trim()).map(p => p.trim())
          
          const viewNews = {
              id: news.id || newsId,
              title: news.title || '无标题',
              source: news.source || '未知来源',
              time: news.publish_time ? this.formatTime(news.publish_time) : '未知时间',
              content: content,
              paragraphs: paragraphs,
              views: news.views || Math.floor(Math.random() * 5000) + 100,
              likes: news.likes || Math.floor(Math.random() * 500) + 10
          }

          this.setData({
            news: viewNews,
            loading: false
          }, () => {
            localData.addUnique('browseHistory', {
              id: viewNews.id,
              type: 'news',
              title: viewNews.title,
              desc: viewNews.source,
              url: `/pages/news-detail/news-detail?newsId=${viewNews.id}`
            })
          })
        } else {
          this.loadLocalNews(newsId)
        }
      },
      fail: (err) => {
        console.log('API请求失败，使用本地数据:', err)
        this.loadLocalNews(newsId)
      }
    })
  },

  formatTime(dateStr) {
    if (!dateStr) return '未知时间'
    const date = new Date(dateStr.replace(/-/g, '/'))
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
  },

  loadLocalNews(newsId) {
    const newsList = this.getNewsList()
    let targetIndex = parseInt(newsId) || 0
    
    if (typeof newsId === 'string') {
      if (newsId.startsWith('news_')) {
        const parts = newsId.split('_')
        targetIndex = parseInt(parts[parts.length - 1]) || 0
      }
    }

    targetIndex = targetIndex % newsList.length
    const news = newsList[targetIndex]

    console.log('使用本地数据，找到新闻:', news.title)
    
    const content = news.content || ''
    const paragraphs = content.split(/[。！？\n]+/).filter(p => p.trim()).map(p => p.trim())

    const viewNews = {
        id: news.id || newsId,
        title: news.title,
        source: news.source,
        time: news.time,
        content: content,
        paragraphs: paragraphs,
        views: news.views,
        likes: news.likes
    }

    this.setData({
      news: viewNews,
      loading: false
    }, () => {
      localData.addUnique('browseHistory', {
        id: viewNews.id,
        type: 'news',
        title: viewNews.title,
        desc: viewNews.source,
        url: `/pages/news-detail/news-detail?newsId=${viewNews.id}`
      })
    })
  },

  getNewsList() {
    return [
      {
        title: '教育部发布最新教育改革方案',
        source: '教育部官网',
        time: '2小时前',
        views: 2580,
        likes: 320,
        content: '教育部近日发布了《新时代教育评价改革总体方案》，旨在全面提升教育质量，推进素质教育。方案提出，要坚持立德树人，培养德智体美劳全面发展的社会主义建设者和接班人。\n\n改革将聚焦教育公平、质量提升、教师队伍建设等关键领域。此次改革将重点推进以下几个方面：\n\n一是优化教育评价体系，扭转唯分数、唯升学的不良倾向；二是加强教师队伍建设，提高教师待遇；三是推进教育信息化，促进优质教育资源共享。\n\n教育部表示，将通过一系列政策措施，确保教育改革落到实处，让每个孩子都能享受到公平而有质量的教育。'
      },
      {
        title: 'AI技术助力个性化学习',
        source: '科技日报',
        time: '5小时前',
        views: 1890,
        likes: 256,
        content: '人工智能技术在教育领域的应用越来越广泛，正在深刻改变传统的教学模式。智能辅导系统、个性化学习推荐、智慧校园等创新应用层出不穷。\n\n通过大数据分析，系统可以精准了解每个学生的学习情况，提供个性化的学习方案。AI技术能够根据学生的学习进度和特点，自动调整教学内容和难度。\n\n专家表示，AI教育不仅能提高学习效率，还能培养学生的自主学习能力和创新思维。'
      },
      {
        title: '新高考改革政策解读',
        source: '考试中心',
        time: '8小时前',
        views: 3240,
        likes: 412,
        content: '2024年新高考改革即将实施，考生和家长需要关注以下重要变化。首先是选考科目改革，考生可以根据自己的兴趣和特长选择3门选考科目。\n\n其次是综合素质评价将纳入录取参考，注重考查学生的实践能力和创新精神。新高考更加注重学生的全面发展和综合素养。\n\n教育部门提醒广大考生和家长，要及时了解政策变化，做好备考准备。'
      },
      {
        title: '在线教育平台用户突破千万',
        source: '教育新闻',
        time: '12小时前',
        views: 1560,
        likes: 189,
        content: '随着互联网技术的发展，在线教育平台用户规模持续增长，近日突破千万大关。在线教育的优势在于打破了时间和空间的限制，让优质教育资源能够惠及更多学生。\n\n无论是K12教育还是职业培训，在线教育都呈现出快速发展的态势。特别是在偏远地区，在线教育为孩子们打开了一扇通往知识的大门。'
      },
      {
        title: '职业教育迎来发展新机遇',
        source: '中国教育报',
        time: '1天前',
        views: 2100,
        likes: 287,
        content: '职业教育近年来得到了国家的高度重视，迎来了发展的黄金时期。产教融合、校企合作成为职业教育发展的新方向。\n\n许多职业院校与企业建立了深度合作关系，共同培养高素质技术技能人才。职业教育不再是"次等教育"，而是培养大国工匠的重要途径。'
      },
      {
        title: '智慧校园建设全面升级',
        source: '新浪教育',
        time: '1天前',
        views: 1780,
        likes: 234,
        content: '智慧校园建设正在全国各地全面推进，数字化教学资源库建设已基本完成。智慧教室、智能图书馆、校园一卡通等信息化应用广泛普及。\n\n智慧校园不仅提升了教学效率，也为师生提供了更加便捷的学习和生活环境。未来，智慧校园将成为教育信息化的重要标志。'
      },
      {
        title: '义务教育阶段减负政策落实',
        source: '教育部官网',
        time: '2天前',
        views: 4520,
        likes: 567,
        content: '义务教育阶段"双减"政策正在各地稳步推进，取得了显著成效。学校严格控制作业总量和时长，确保学生有足够的时间进行体育锻炼和课外活动。\n\n减负不等于降低教育质量，而是要让学生在轻松愉快的氛围中成长。家长和社会也应转变观念，共同为孩子们创造健康的成长环境。'
      },
      {
        title: '高校创新创业教育取得新进展',
        source: '科技日报',
        time: '2天前',
        views: 1450,
        likes: 178,
        content: '高校创新创业教育近年来取得了显著进展，孵化了众多优秀项目。各高校纷纷建立创新创业学院，开设创新创业课程。\n\n通过创新创业教育，学生的创新精神和实践能力得到了有效培养。许多大学生创业项目已经走向市场，取得了良好的经济效益和社会效益。'
      },
      {
        title: '全国中小学开展素质教育活动',
        source: '教育部官网',
        time: '3天前',
        views: 2890,
        likes: 345,
        content: '全国中小学正在广泛开展素质教育活动，促进学生全面发展。各地学校纷纷开设丰富多彩的课程，包括艺术、体育、科学等多个领域。\n\n素质教育不仅注重知识传授，更注重培养学生的综合素质和核心素养。通过各种活动，学生的视野得到了拓宽，能力得到了提升。'
      },
      {
        title: '5G技术在教育领域的应用',
        source: '科技日报',
        time: '3天前',
        views: 1920,
        likes: 267,
        content: '5G技术正在逐步应用于教育领域，为教育信息化带来新的机遇。通过5G网络，远程教学可以更加流畅，互动更加便捷。\n\n5G技术的低延迟特性使得实时互动教学成为可能，学生可以与老师进行更加顺畅的沟通。未来，5G+教育将成为教育创新的重要方向。'
      },
      {
        title: '教育公平政策落地实施',
        source: '考试中心',
        time: '4天前',
        views: 3100,
        likes: 389,
        content: '教育公平政策正在各地落地实施，让更多孩子享受到优质教育资源。各地通过加强师资建设、改善办学条件、推进教育信息化等措施，缩小地区之间、城乡之间的教育差距。\n\n教育公平是社会公平的重要基础。只有让每个孩子都能接受良好的教育，才能实现真正的社会公平。'
      },
      {
        title: '教育信息化建设全面推进',
        source: '教育新闻',
        time: '5天前',
        views: 1670,
        likes: 212,
        content: '教育信息化建设正在全国范围内全面推进，数字化教学资源日益丰富。各地学校积极建设智慧教室、数字化图书馆等设施。\n\n教育信息化不仅改变了教学方式，也为教育均衡发展提供了技术支撑。通过互联网，优质教育资源可以辐射到偏远地区，让更多孩子受益。'
      }
    ]
  },

  onShareAppMessage() {
    if (this.data.news) {
      return {
        title: this.data.news.title,
        path: `/pages/news-detail/news-detail?newsId=${this.options.newsId}`
      }
    }
    return {}
  },
  
  onScroll(e) {
    const scrollTop = e.detail.scrollTop
    const scrollHeight = e.detail.scrollHeight
    const windowHeight = e.detail.windowHeight
    
    const progress = Math.min(scrollTop / (scrollHeight - windowHeight) * 100, 100)
    
    if (this.progressFill) {
      this.progressFill.style.width = progress + '%'
    }
  },
  
  handleLike() {
    wx.showToast({
      title: '点赞成功',
      icon: 'success'
    })
  },
  
  handleShare() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },
  
  shareToFriend() {
    wx.showToast({
      title: '分享到微信好友',
      icon: 'none'
    })
  },
  
  shareToCircle() {
    wx.showToast({
      title: '分享到朋友圈',
      icon: 'none'
    })
  },
  
  goBack() {
    wx.navigateBack()
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
