const api = require('../../utils/api')

Page({
  data: {
    currentCategory: 'all',
    loading: false,
    news: [],
    filteredNews: [],
    hasMore: true,
    page: 1,
    pageSize: 20,
    total: 0,
    searchKeyword: '',
    focusSearch: false,
    isSearching: false,
    usingApi: false,
    refreshInterval: null,
    lastRefreshTime: 0,
    robotX: 20,
    robotY: 500
  },

  onLoad() {
    this.loadNews(true)
    this.loadRobotPosition()
  },

  onShow() {
    if (this.data.news.length === 0) {
      this.loadNews(true)
    }
    this.startAutoRefresh()
    this.loadRobotPosition()
  },

  onHide() {
    this.stopAutoRefresh()
  },

  onUnload() {
    this.stopAutoRefresh()
  },

  startAutoRefresh() {
    if (this.data.refreshInterval) return
    this.data.refreshInterval = setInterval(() => {
      this.checkForNewNews()
    }, 30000)
  },

  stopAutoRefresh() {
    if (this.data.refreshInterval) {
      clearInterval(this.data.refreshInterval)
      this.data.refreshInterval = null
    }
  },

  async checkForNewNews() {
    const that = this
    wx.request({
      url: api.url('/news/count'),
      method: 'GET',
      success(res) {
        if (res.data.code === 200 && res.data.data) {
          const total = res.data.data.count
          if (total > that.data.total && that.data.total > 0) {
            const newCount = total - that.data.total
            wx.showToast({
              title: `有${newCount}条新新闻`,
              icon: 'none',
              duration: 3000
            })
            that.setData({ total: total })
          }
        }
      },
      fail() {}
    })
  },

  refreshNews() {
    this.setData({
      page: 1,
      hasMore: true,
      news: [],
      filteredNews: []
    })
    this.loadNews(true)
  },

  onPullDownRefresh() {
    this.setData({
      loading: true,
      page: 1,
      hasMore: true
    })

    this.loadNews(true, () => {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      })
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading && !this.data.isSearching) {
      this.setData({ page: this.data.page + 1 })
      this.loadNews(false)
    }
  },

  loadNews(isFirstLoad, callback) {
    const that = this
    const page = this.data.page
    const pageSize = this.data.pageSize

    wx.showLoading({
      title: isFirstLoad ? '加载中...' : '加载更多...'
    })

    const apiUrl = api.url(`/news/list?page=${page}&page_size=${pageSize}`)

    wx.request({
      url: apiUrl,
      method: 'GET',
      header: {
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      success(res) {
        wx.hideLoading()
        console.log('API返回状态码:', res.statusCode)
        console.log('API返回数据:', res.data)

        if (res.data && res.data.code === 200 && res.data.data) {
          const items = res.data.data.list || []
          console.log('解析到新闻数量:', items.length)
          
          if (items && items.length > 0) {
            const categoryTexts = {
              education: '教育',
              technology: '科技',
              policy: '政策',
              exam: '考试'
            }
            const newsList = items.map((item, index) => {
              const globalIndex = (page - 1) * pageSize + index
              const category = item.category || that.guessCategory(item.title || '')
              return {
                id: item.id || `news_${globalIndex}`,
                index: globalIndex,
                title: item.title || '无标题',
                summary: item.summary || item.content || item.title || '',
                image: item.image || item.pic || '',
                time: that.formatTimeFromStr(item.publish_time),
                views: item.views != null ? item.views : Math.floor(Math.random() * 5000) + 100,
                likes: item.likes != null ? item.likes : Math.floor(Math.random() * 500) + 10,
                source: item.source || '新闻来源',
                url: item.url || item.link || '',
                category: category,
                categoryText: categoryTexts[category] || '其他'
              }
            })

            if (isFirstLoad || page === 1) {
              console.log('设置新闻数据，数量:', newsList.length)
              that.setData({
                news: newsList,
                filteredNews: newsList,
                usingApi: true,
                total: res.data.data.total || newsList.length,
                hasMore: res.data.data.has_more || newsList.length >= pageSize
              }, () => {
                console.log('数据设置成功，filteredNews长度:', that.data.filteredNews.length)
              })
            } else {
              const combinedNews = [...that.data.news, ...newsList]
              that.setData({
                news: combinedNews,
                filteredNews: combinedNews,
                hasMore: res.data.data.has_more || combinedNews.length < (res.data.data.total || combinedNews.length)
              })
            }
          } else {
            console.log('API返回空数据，切换到本地数据')
            that.setData({ hasMore: false })
            if (isFirstLoad) {
              that.loadMockData()
            }
          }
        } else {
          console.log('API返回格式错误或无数据，切换到本地数据')
          if (isFirstLoad) {
            that.loadMockData()
          }
        }
      },
      fail(err) {
        wx.hideLoading()
        console.error('API请求失败:', err)
        console.log('错误信息:', err.errMsg)
        if (isFirstLoad) {
          console.log('切换到本地mock数据')
          that.loadMockData()
        } else {
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          })
        }
      },
      complete() {
        if (callback) setTimeout(callback, 100)
      }
    })
  },

  loadMockData() {
    const mockData = this.generateNewsPage(1, 50)
    this.setData({
      news: mockData,
      filteredNews: mockData,
      usingApi: false,
      total: mockData.length,
      hasMore: false
    })
    wx.showToast({
      title: '使用本地数据',
      icon: 'none'
    })
  },

  generateNewsPage(page, pageSize) {
    const categories = ['education', 'technology', 'policy', 'exam']
    const categoryTexts = {
      education: '教育',
      technology: '科技',
      policy: '政策',
      exam: '考试'
    }
    const sources = ['教育部官网', '科技日报', '教育新闻', '考试中心', '学习周刊', '中国教育报', '新浪教育', '腾讯教育']

    const longContent = [
      '教育部近日发布了《关于深化新时代高等教育评价改革总体方案》，这是我国高等教育领域的又一重要改革举措。方案明确提出，要坚持立德树人，把立德树人成效作为检验高校一切工作的根本标准。要扭转不科学的教育评价导向，坚决克服唯分数、唯升学、唯文凭、唯论文、唯帽子的顽瘴痼疾，提高教育治理能力和水平。方案指出，高等教育评价改革要坚持分类评价，不同类型高校有不同评价标准和办法。要强化高校办学定位，引导不同类型高校科学定位，办出特色和水平。要改进人才评价，把品德、能力、业绩作为评价人才的根本标准，克服学术评价中的"五唯"倾向。此外，方案还强调要完善评价机制，健全综合评价体系，加强评价结果运用，提高评价的科学性、专业性、客观性。要加强组织实施，落实高校办学自主权，激发高校内生动力和办学活力。这一方案的出台，将对我国高等教育事业的发展产生深远影响，推动高等教育质量全面提升。',
      '近年来，人工智能技术在教育领域的应用越来越广泛，正在深刻改变传统的教学模式。智能辅导系统、自适应学习平台、AI批改作业等创新应用层出不穷，为学生提供了更加个性化、高效的学习体验。智能辅导系统能够根据学生的学习情况，提供个性化的学习建议和辅导，帮助学生更好地掌握知识。自适应学习平台则可以根据学生的学习进度和能力水平，动态调整学习内容和难度，实现因材施教。AI批改作业技术更是大大减轻了教师的工作负担，提高了批改效率和准确性。此外，虚拟现实(VR)和增强现实(AR)技术也开始进入课堂，为学生带来更加沉浸式的学习体验。这些新技术的应用，不仅提高了教学效率，也激发了学生的学习兴趣，为教育事业的发展注入了新的活力。',
      '为进一步鼓励和支持大学生创新创业，国家近期出台了一系列新的扶持政策。这些政策涵盖了创业资金支持、创业培训指导、创业场地保障等多个方面，为大学生创业提供了全方位的支持。在资金支持方面，政府设立了大学生创业专项基金，为符合条件的创业项目提供低息贷款和资金补贴。同时，鼓励各类社会资本参与大学生创业投资，拓宽创业融资渠道。在创业指导方面，建立了创业导师制度，为大学生创业者提供一对一的创业指导和咨询服务。此外，各地还建设了一批大学生创业孵化基地和创业园区，为创业者提供办公场地、设备支持和工商注册等一站式服务。这些政策的出台，将进一步激发大学生的创业热情，培养更多优秀的青年创业者。',
      '随着社会的快速发展和科技的不断进步，新时代对人才提出了更高的要求。为适应这一变化，我国各高校正在积极推进课程改革，着力培养具有创新精神和实践能力的复合型人才。课程改革的核心是打破传统学科壁垒，加强跨学科融合。许多高校设立了跨学科专业和课程，鼓励学生跨专业学习，培养综合素养。同时，强化实践教学环节，增加实习、实验、社会实践等实践课程的比重，提高学生的动手能力和解决实际问题的能力。此外，高校还注重培养学生的创新思维和创新能力，开设创新实践课程和创新创业训练项目，鼓励学生参与科研项目和学术活动。这些改革举措将有助于培养更多适应新时代需求的高素质人才。',
      '近年来，我国数字校园建设取得了显著进展，智慧教育正成为教育发展的新趋势。越来越多的高校和中小学开始建设智慧校园，利用信息技术提升教学质量和管理效率。数字校园建设涵盖了智慧教学、智慧管理、智慧服务等多个方面。智慧教学平台可以实现教学资源共享、在线教学、远程互动等功能，打破时间和空间的限制，为学生提供更加灵活的学习方式。智慧管理系统则可以实现校园管理的信息化、智能化，提高管理效率和服务质量。此外，大数据、人工智能等技术也开始应用于教育领域，为个性化学习、精准教学提供了技术支持。数字校园的建设不仅提升了教育质量，也为教育公平提供了新的可能，让优质教育资源能够惠及更多学生。',
      '职业教育是国民教育体系和人力资源开发的重要组成部分，近年来受到了国家的高度重视。为推动职业教育高质量发展，国家出台了《国家职业教育改革实施方案》等一系列政策措施。这些政策明确提出，要把职业教育摆在更加突出的位置，深化职业教育改革，完善职业教育和培训体系。要加强职业院校建设，提升办学质量，优化专业设置，对接产业需求。要推进产教融合、校企合作，鼓励企业参与职业教育，建立实习实训基地。同时，要加强职业教育教师队伍建设，提高教师的专业水平和实践能力。要完善职业教育评价体系，建立职业教育质量认证制度。这些举措将有助于培养更多高素质技术技能人才，为经济社会发展提供有力的人才支撑。',
      '全国大学英语四六级考试是我国规模最大的英语水平考试，近期进行了一系列改革。改革后的考试更加注重考查学生的英语综合应用能力，包括听力理解、阅读理解、写作和翻译等方面。听力部分增加了长对话和短文理解的难度，更加贴近真实的英语交流场景。阅读理解部分增加了篇章长度和难度，要求学生具备更强的阅读能力和理解能力。写作部分要求学生能够根据提示写出结构清晰、内容充实的英语短文。翻译部分则要求学生具备较强的双语转换能力。为适应考试改革，学生需要加强英语基本功的训练，提高英语听说读写能力。可以通过多听英语广播、多看英语电影、多读英语文章等方式来提高英语水平。同时，要注重积累词汇和语法知识，提高英语综合应用能力。',
      '我国高校作为国家科技创新体系的重要组成部分，近年来在科研创新方面取得了显著进展。高校科研投入不断增加，科研平台建设不断完善，科研创新能力持续提升。在基础研究方面，高校承担了大量国家重大科研项目，在数学、物理、化学、生物等基础学科领域取得了一批重要成果。在应用研究方面，高校与企业合作紧密，推动了科技成果转化，为经济社会发展提供了有力支撑。此外，高校还注重培养学生的科研创新能力，鼓励学生参与科研项目和学术活动。许多高校建立了本科生科研训练计划，为学生提供科研实践机会。这些举措不仅提升了高校的科研水平，也为国家培养了大量创新型人才。'
    ]

    const titles = [
      '教育部发布最新教育改革方案，全面提升高等教育质量',
      '人工智能技术在教育领域的创新应用',
      '大学生创业扶持政策再升级，助力青年创新创业',
      '高校课程改革：培养适应新时代需求的复合型人才',
      '数字校园建设加速推进，智慧教育再上新台阶',
      '职业教育迎来发展新机遇，培养高素质技术技能人才',
      '英语四六级考试改革：更加注重综合能力考查',
      '高校科研创新能力持续提升，助力国家创新发展',
      '校园文化建设丰富多彩，营造良好育人环境',
      '新时代大学生核心素养培养路径探索',
      '高校思想政治教育创新方法研究',
      '在线教育发展趋势与挑战分析',
      '大学生心理健康教育现状与对策',
      '产学研合作创新模式研究',
      '高校图书馆数字化建设实践',
      '校园创新创业生态系统构建',
      '大学生社会实践能力培养研究',
      '教育信息化背景下的教学改革',
      '高校教师队伍建设策略分析',
      '职业教育质量提升路径探讨',
      '国际化人才培养模式创新',
      '高校校园安全管理体系建设',
      '大学生就业指导服务优化',
      '教育公平与优质教育资源共享',
      '高校科研成果转化机制研究',
      '智慧校园建设实践与思考',
      '大学生创新创业教育体系构建',
      '高校学风建设长效机制研究',
      '现代信息技术在教学中的应用',
      '高校后勤服务质量提升策略',
      '大学生综合素质评价体系研究',
      '教育评价改革背景下的高校发展',
      '校园文化品牌建设实践',
      '大学生志愿服务长效机制构建',
      '高校课程思政建设路径探索',
      '创新创业教育与专业教育融合',
      '高校国际化办学策略分析',
      '大学生职业规划教育研究',
      '教育大数据应用与实践',
      '高校实验室安全管理体系',
      '大学生科技创新能力培养',
      '现代学徒制人才培养模式',
      '高校继续教育发展策略',
      '校园体育文化建设实践',
      '大学生创业孵化基地建设',
      '高校学术诚信建设研究',
      '教育现代化背景下的学校发展',
      '大学生社会实践创新路径',
      '高校校企合作模式创新',
      '新时代教育评价改革深入推进'
    ]

    const newsList = []

    for (let i = 0; i < pageSize; i++) {
      const globalIndex = i
      const categoryIndex = globalIndex % 4
      const category = categories[categoryIndex]
      const contentIndex = globalIndex % longContent.length

      const newsItem = {
        id: `news_${globalIndex}`,
        index: globalIndex,
        category: category,
        categoryText: categoryTexts[category],
        title: titles[globalIndex] || `教育新闻 ${globalIndex + 1}`,
        source: sources[globalIndex % sources.length],
        content: longContent[contentIndex] + '\n\n' + longContent[(contentIndex + 1) % longContent.length]
      }

      const hoursAgo = globalIndex + 1
      newsList.push({
        ...newsItem,
        summary: newsItem.content.length > 100 ? newsItem.content.substring(0, 100) + '...' : newsItem.content,
        image: `/images/news${globalIndex + 1}.jpg`,
        time: hoursAgo <= 24 ? `${hoursAgo}小时前` : `${Math.floor(hoursAgo / 24)}天前`,
        views: Math.floor(Math.random() * 5000) + 100,
        likes: Math.floor(Math.random() * 500) + 10,
        url: ''
      })
    }

    return newsList
  },

  formatTime(timestamp) {
    const now = Date.now() / 1000
    const diff = now - timestamp

    if (diff < 3600) {
      return Math.floor(diff / 60) + '分钟前'
    } else if (diff < 86400) {
      return Math.floor(diff / 3600) + '小时前'
    } else {
      return Math.floor(diff / 86400) + '天前'
    }
  },

  formatTimeFromStr(timeStr) {
    if (!timeStr) {
      return '刚刚'
    }
    
    const now = new Date()
    let newsTime
    
    if (timeStr.includes('T')) {
      const parts = timeStr.split('T')
      const datePart = parts[0].replace(/-/g, '/')
      const timePart = parts[1] ? parts[1].substring(0, 19) : ''
      newsTime = new Date(datePart + ' ' + timePart)
    } else {
      newsTime = new Date(timeStr.replace(/-/g, '/'))
    }
    
    if (isNaN(newsTime.getTime())) {
      newsTime = new Date()
    }
    
    const diffMs = now - newsTime
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) {
      return '刚刚'
    } else if (diffMinutes < 60) {
      return diffMinutes + '分钟前'
    } else if (diffHours < 24) {
      return diffHours + '小时前'
    } else if (diffDays < 30) {
      return diffDays + '天前'
    } else {
      const d = newsTime
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
  },

  guessCategory(title) {
    const keywords = {
      education: ['教育', '学校', '学生', '老师', '教学', '课程', '考试', '高考', '中考', '报名'],
      technology: ['科技', 'AI', '人工智能', '5G', '互联网', '技术', '软件', '智能', '数据'],
      policy: ['政策', '改革', '规划', '发布', '实施', '通知', '意见', '方案', '制度'],
      exam: ['考试', '备考', '复习', '报名', '分数线', '志愿', '面试', '录取']
    }

    for (const [category, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (title.includes(word)) {
          return category
        }
      }
    }
    return 'education'
  },

  changeCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      currentCategory: category,
      page: 1,
      hasMore: true
    })

    if (category === 'all') {
      this.setData({
        filteredNews: this.data.news
      })
    } else {
      const filtered = this.data.news.filter(item => item.category === category)
      this.setData({
        filteredNews: filtered
      })
    }

    if (this.data.filteredNews.length === 0) {
      this.loadNews(true)
    }
  },

  onSearchInput(e) {
    const value = e.detail.value
    this.setData({
      searchKeyword: value
    })

    if (value.trim()) {
      this.setData({ isSearching: true })
      this.searchNews(value)
    } else {
      this.setData({ isSearching: false })
      this.setData({
        filteredNews: this.data.news
      })
    }
  },

  onSearchConfirm() {
    const keyword = this.data.searchKeyword
    if (keyword.trim()) {
      this.setData({ isSearching: true })
      this.searchNews(keyword)
    }
  },

  clearSearch() {
    this.setData({
      searchKeyword: '',
      isSearching: false,
      filteredNews: this.data.news
    })
  },

  searchNews(keyword) {
    const filtered = this.data.news.filter(item =>
      item.title.includes(keyword) ||
      item.summary.includes(keyword) ||
      item.source.includes(keyword)
    )

    this.setData({
      filteredNews: filtered
    })

    if (filtered.length === 0) {
      wx.showToast({
        title: '未找到相关新闻',
        icon: 'none'
      })
    }
  },

  viewNews(e) {
    const newsId = e.currentTarget.dataset.id
    if (newsId) {
      wx.navigateTo({
        url: `/pages/news-detail/news-detail?newsId=${newsId}`
      })
    }
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
