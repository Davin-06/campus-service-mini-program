const api = require('../../utils/api')
const localData = require('../../utils/local-data')

Page({
  data: {
    post: null,
    comments: [],
    commentText: '',
    liked: false,
    collected: false,
    isLoggedIn: false,
    userId: null,
    robotX: 20,
    robotY: 500
  },

  onLoad(options) {
    const postId = options.id
    if (postId) {
      this.loadPost(postId)
      this.loadComments(postId)
    }
    this.checkLogin()
    this.loadRobotPosition()
  },

  onShow() {
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

  goBack() {
    wx.navigateBack()
  },

  loadPost(postId) {
    const that = this
    wx.showLoading({ title: '加载中...' })

    wx.request({
      url: api.url(`/posts/${postId}`),
      method: 'GET',
      success(res) {
        if (res.data.code === 200 && res.data.data) {
          const post = res.data.data
          that.setData({
            post: {
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
              collects: post.collects || 0,
              time: that.formatTime(post.created_at)
            },
            collected: localData.hasId('postCollections', post.id)
          }, () => {
            localData.addUnique('browseHistory', {
              id: post.id,
              type: 'post',
              title: post.title || '帖子详情',
              desc: post.content || '',
              url: `/pages/post-detail/post-detail?id=${post.id}`
            })
          })
        }
        wx.hideLoading()
      },
      fail() {
        wx.hideLoading()
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  loadComments(postId) {
    const that = this
    wx.request({
      url: api.url(`/comment/list?post_id=${postId}`),
      method: 'GET',
      success(res) {
        if (res.data.code === 200 && res.data.data) {
          const comments = res.data.data.map(comment => ({
            id: comment.id,
            author: comment.nickname || comment.author || '用户',
            avatar: comment.avatar || '/images/avatar1.png',
            content: comment.content,
            likes: comment.likes || 0,
            time: that.formatTime(comment.created_at)
          }))
          that.setData({ comments })
        }
      }
    })
  },

  likePost(e) {
    if (!this.requireLogin()) return

    const postId = e.currentTarget.dataset.id
    const userId = this.data.userId
    const nextLiked = !this.data.liked

    wx.request({
      url: api.url('/post/like'),
      method: 'POST',
      data: {
        post_id: postId,
        user_id: userId || 1
      },
      success: (res) => {
        if (res.data.code === 200) {
          const nextPost = {
            ...this.data.post,
            likes: res.data.data?.likes || Math.max(0, this.data.post.likes + (nextLiked ? 1 : -1))
          }
          this.setData({
            liked: nextLiked,
            post: nextPost
          })
          if (nextLiked) {
            localData.addUnique('likedPosts', nextPost)
          } else {
            localData.removeById('likedPosts', postId)
          }
          wx.showToast({
            title: nextLiked ? '点赞成功' : '取消点赞',
            icon: 'success'
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

  commentPost() {
    if (!this.requireLogin()) return

    wx.showModal({
      title: '评论',
      editable: true,
      placeholderText: '请输入评论内容',
      success: (res) => {
        if (res.confirm && res.content) {
          this.submitCommentDirect(res.content)
        }
      }
    })
  },

  onCommentInput(e) {
    this.setData({ commentText: e.detail.value })
  },

  submitComment() {
    if (!this.requireLogin()) return

    const content = this.data.commentText.trim()
    if (!content) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' })
      return
    }

    this.submitCommentDirect(content)
  },

  submitCommentDirect(content) {
    const postId = this.data.post.id
    const userId = this.data.userId

    wx.request({
      url: api.url('/comment/create'),
      method: 'POST',
      data: {
        post_id: postId,
        user_id: userId || 1,
        content: content,
        parent_id: 0
      },
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({
            commentText: '',
            post: {
              ...this.data.post,
              comments: this.data.post.comments + 1
            }
          })
          this.loadComments(postId)
          wx.showToast({ title: '评论成功', icon: 'success' })
        } else {
          wx.showToast({ title: res.data.message || '评论失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误，评论失败', icon: 'none' })
      }
    })
  },

  collectPost(e) {
    if (!this.requireLogin()) return

    const postId = e.currentTarget.dataset.id
    const currentPost = this.data.post
    const nextCollected = !this.data.collected
    const nextPost = {
      ...currentPost,
      collects: Math.max(0, (currentPost.collects || 0) + (nextCollected ? 1 : -1))
    }

    this.setData({
      collected: nextCollected,
      post: nextPost
    })

    if (nextCollected) {
      localData.addUnique('postCollections', nextPost)
    } else {
      localData.removeById('postCollections', postId)
    }

    wx.showToast({
      title: this.data.collected ? '收藏成功' : '取消收藏',
      icon: 'success'
    })

    wx.request({
      url: api.url('/post/collect'),
      method: 'POST',
      data: {
        post_id: postId,
        user_id: this.data.userId || 1
      }
    })
  },

  sharePost() {
    const post = this.data.post
    wx.showActionSheet({
      itemList: ['复制帖子路径', '提示分享'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.setClipboardData({
            data: `/pages/post-detail/post-detail?id=${post.id}`,
            success: () => wx.showToast({ title: '路径已复制', icon: 'success' })
          })
        } else {
          wx.showModal({
            title: '分享帖子',
            content: `请点击右上角菜单分享《${post.title || '这条帖子'}》`,
            showCancel: false
          })
        }
      }
    })
  },

  onShareAppMessage() {
    const post = this.data.post || {}
    return {
      title: post.title || '校园贴',
      path: `/pages/post-detail/post-detail?id=${post.id || ''}`
    }
  },

  onShareTimeline() {
    const post = this.data.post || {}
    return {
      title: post.title || '校园贴'
    }
  },

  replyComment(e) {
    if (!this.requireLogin()) return

    const author = e.currentTarget.dataset.author
    wx.showModal({
      title: `回复 ${author}`,
      editable: true,
      placeholderText: `@${author} 说点什么...`,
      success: (res) => {
        if (res.confirm && res.content) {
          this.submitCommentDirect(res.content)
        }
      }
    })
  },

  likeComment(e) {
    if (!this.requireLogin()) return

    const commentId = e.currentTarget.dataset.id
    const comments = this.data.comments.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, likes: comment.likes + 1 }
      }
      return comment
    })
    this.setData({ comments })
    wx.showToast({ title: '点赞成功', icon: 'success' })
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
