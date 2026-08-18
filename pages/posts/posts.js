const api = require('../../utils/api')
const localData = require('../../utils/local-data')

Page({
  data: {
    currentTab: 'latest',
    currentFilter: 'all',
    posts: [],
    filteredPosts: [],
    hasMore: true,
    page: 1,
    loading: false,
    usingApi: false,
    isLoggedIn: false,
    userId: null,
    robotX: 20,
    robotY: 500
  },

  onLoad() {
    this.checkLogin()
    this.loadPosts()
    this.loadRobotPosition()
  },

  checkLogin() {
    const app = getApp()
    const userInfo = app.globalData.userInfo
    this.setData({
      isLoggedIn: !!userInfo?.name,
      userId: userInfo?.id || null
    })
  },

  requireLogin() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return false
    }
    return true
  },

  onShow() {
    this.checkLogin()
    this.applyPendingNavigation()
    this.setData({
      page: 1,
      hasMore: true
    })
    if (this.data.currentTab === 'my') {
      this.loadMyPosts()
    } else {
      this.loadPosts()
    }
    this.loadRobotPosition()
  },

  applyPendingNavigation() {
    const pendingTab = wx.getStorageSync('pendingPostsTab')
    const pendingFilter = wx.getStorageSync('pendingPostsFilter')

    if (pendingTab) {
      this.setData({ currentTab: pendingTab })
      wx.removeStorageSync('pendingPostsTab')
    }

    if (pendingFilter) {
      this.setData({ currentFilter: pendingFilter })
      wx.removeStorageSync('pendingPostsFilter')
    }
  },

  onPullDownRefresh() {
    this.setData({
      loading: true,
      page: 1,
      hasMore: true
    })

    this.loadPosts(() => {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      })
    })
  },

  loadPosts(callback) {
    const that = this
    const page = this.data.page

    wx.showLoading({
      title: '加载中...'
    })

    wx.request({
      url: api.url(`/posts?page=${page}&page_size=10`),
      method: 'GET',
      success(res) {
        if (res.data.code === 200 && res.data.data) {
          const posts = res.data.data.list.map(post => ({
            id: post.id,
            author: post.nickname || post.author || '用户',
            avatar: post.avatar || '/images/avatar1.png',
            title: post.title,
            content: post.content,
            images: api.parseJsonArray(post.images),
            type: post.category || 'general',
            typeText: { question: '提问', share: '分享', discussion: '讨论', lost: '失物招领', general: '综合' }[post.category] || '综合',
            likes: post.likes || 0,
            comments: post.comments || 0,
            views: post.views || 0,
            time: that.formatTime(post.created_at),
            isTop: post.is_top === 1,
            liked: false,
            collected: localData.hasId('postCollections', post.id),
            collects: post.collects || 0
          }))

          if (page === 1) {
            that.setData({
              posts: posts,
              filteredPosts: posts,
              usingApi: true
            })
          } else {
            const combinedPosts = [...that.data.posts, ...posts]
            that.setData({
              posts: combinedPosts,
              filteredPosts: that.data.currentFilter === 'all' ? combinedPosts : combinedPosts.filter(p => p.type === that.data.currentFilter)
            })
          }

          if (posts.length < 10) {
            that.setData({ hasMore: false })
          }
        } else {
          const mockPosts = that.generateMockPosts()
          if (page === 1) {
            that.setData({
              posts: mockPosts,
              filteredPosts: mockPosts
            })
          } else {
            const combinedPosts = [...that.data.posts, ...mockPosts]
            that.setData({
              posts: combinedPosts,
              filteredPosts: that.data.currentFilter === 'all' ? combinedPosts : combinedPosts.filter(p => p.type === that.data.currentFilter)
            })
          }
          if (mockPosts.length < 4) {
            that.setData({ hasMore: false })
          }
        }
        setTimeout(() => that.filterPosts(), 0)
        wx.hideLoading()
        if (callback) callback()
      },
      fail() {
        const mockPosts = that.generateMockPosts()
        if (page === 1) {
          that.setData({
            posts: mockPosts,
            filteredPosts: mockPosts
          })
        }
        wx.hideLoading()
        if (callback) callback()
      }
    })
  },

  changeTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })

    if (tab === 'my') {
      if (!this.requireLogin()) {
        this.setData({ currentTab: 'latest' })
        return
      }
      this.loadMyPosts()
    } else {
      this.setData({
        page: 1,
        currentFilter: 'all'
      })
      this.loadPosts()
    }
  },

  loadMyPosts() {
    const userId = this.data.userId
    if (!userId) return

    wx.showLoading({ title: '加载中...' })

    wx.request({
      url: api.url(`/posts?user_id=${userId}&page=1&page_size=50`),
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const posts = res.data.data.list.map(post => ({
            id: post.id,
            author: post.nickname || post.author || '用户',
            avatar: post.avatar || '/images/avatar1.png',
            title: post.title,
            content: post.content,
            images: api.parseJsonArray(post.images),
            type: post.category || 'general',
            typeText: { question: '提问', share: '分享', discussion: '讨论', lost: '失物招领', general: '综合' }[post.category] || '综合',
            likes: post.likes || 0,
            comments: post.comments || 0,
            views: post.views || 0,
            time: this.formatTime(post.created_at),
            isTop: post.is_top === 1,
            liked: false,
            collected: localData.hasId('postCollections', post.id),
            collects: post.collects || 0
          }))

          this.setData({
            filteredPosts: posts,
            posts: posts
          })
        }
        wx.hideLoading()
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  changeFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ currentFilter: filter })
    this.filterPosts()
  },

  filterPosts() {
    const { posts, currentFilter, currentTab } = this.data

    let filtered = currentFilter === 'all' ? posts : posts.filter(post => post.type === currentFilter)

    if (currentTab === 'hot') {
      filtered = [...filtered].sort((a, b) => (b.likes + b.comments * 2 + b.views / 100) - (a.likes + a.comments * 2 + a.views / 100))
    } else if (currentTab === 'follow') {
      const collectedIds = localData.getList('postCollections').map(item => item.id)
      filtered = filtered.filter(post => collectedIds.includes(post.id))
    }

    this.setData({ filteredPosts: filtered })
  },

  viewPost(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?id=${id}`
    })
  },

  likePost(e) {
    if (!this.requireLogin()) return

    const id = e.currentTarget.dataset.id
    const userId = this.data.userId
    const currentPost = this.data.posts.find(post => post.id === id)
    const willLike = !currentPost?.liked

    wx.request({
      url: api.url('/post/like'),
      method: 'POST',
      data: {
        post_id: id,
        user_id: userId || 1
      },
      success: (res) => {
        if (res.data.code === 200) {
          const posts = this.data.posts.map(post => {
            if (post.id === id) {
              return {
                ...post,
                liked: willLike,
                likes: res.data.data?.likes || Math.max(0, post.likes + (willLike ? 1 : -1))
              }
            }
            return post
          })

          if (currentPost) {
            if (willLike) {
              localData.addUnique('likedPosts', currentPost)
            } else {
              localData.removeById('likedPosts', id)
            }
          }

          this.setData({ posts })
          this.filterPosts()

          wx.showToast({
            title: res.data.data?.liked ? '点赞成功' : '取消点赞',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: res.data.message || '操作失败',
            icon: 'none'
          })
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误，操作失败',
          icon: 'none'
        })
      }
    })
  },

  commentPost(e) {
    if (!this.requireLogin()) return

    const id = e.currentTarget.dataset.id
    const userId = this.data.userId

    wx.showModal({
      title: '评论',
      editable: true,
      placeholderText: '请输入评论内容',
      success: (res) => {
        if (res.confirm && res.content) {
          wx.request({
            url: api.url('/comment/create'),
            method: 'POST',
            data: {
              post_id: id,
              user_id: userId || 1,
              content: res.content,
              parent_id: 0
            },
            success: (result) => {
              if (result.data.code === 200) {
                const posts = this.data.posts.map(post => {
                  if (post.id === id) {
                    return {
                      ...post,
                      comments: post.comments + 1
                    }
                  }
                  return post
                })

                this.setData({ posts })
                this.filterPosts()

                wx.showToast({
                  title: '评论成功',
                  icon: 'success'
                })
              } else {
                wx.showToast({
                  title: result.data.message || '评论失败',
                  icon: 'none'
                })
              }
            },
            fail: () => {
              wx.showToast({
                title: '网络错误，评论失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  collectPost(e) {
    if (!this.requireLogin()) return

    const id = e.currentTarget.dataset.id
    const userId = this.data.userId || 1
    const currentPost = this.data.posts.find(post => post.id === id)
    const willCollect = !currentPost?.collected

    const posts = this.data.posts.map(post => {
      if (post.id === id) {
        return {
          ...post,
          collected: willCollect,
          collects: Math.max(0, post.collects + (willCollect ? 1 : -1))
        }
      }
      return post
    })

    if (currentPost) {
      if (willCollect) {
        localData.addUnique('postCollections', currentPost)
      } else {
        localData.removeById('postCollections', id)
      }
    }

    this.setData({ posts })
    this.filterPosts()

    const post = posts.find(p => p.id === id)
    wx.showToast({
      title: post?.collected ? '收藏成功' : '取消收藏',
      icon: 'success'
    })

    wx.request({
      url: api.url('/post/collect'),
      method: 'POST',
      data: {
        post_id: id,
        user_id: userId
      }
    })
  },

  sharePost(e) {
    if (!this.requireLogin()) return

    const id = e.currentTarget.dataset.id
    const post = this.data.posts.find(item => item.id === id)
    wx.showActionSheet({
      itemList: ['复制帖子路径', '提示分享'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.setClipboardData({
            data: `/pages/post-detail/post-detail?id=${id}`,
            success: () => wx.showToast({ title: '路径已复制', icon: 'success' })
          })
        } else {
          wx.showModal({
            title: '分享帖子',
            content: post ? `请点击右上角菜单分享《${post.title || '这条帖子'}》` : '请点击右上角菜单分享这条帖子',
            showCancel: false
          })
        }
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '校园贴',
      path: '/pages/posts/posts'
    }
  },

  onShareTimeline() {
    return {
      title: '校园贴'
    }
  },

  goToPublish() {
    if (!this.requireLogin()) return

    wx.navigateTo({
      url: '/pages/publish/publish'
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 })
      this.loadPosts()
    }
  },

  formatTime(dateString) {
    if (!dateString) return ''

    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`

    return `${date.getMonth() + 1}-${date.getDate()}`
  },

  generateMockPosts() {
    return []
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
