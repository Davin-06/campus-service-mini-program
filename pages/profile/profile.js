const api = require('../../utils/api')
const localData = require('../../utils/local-data')

Page({
  data: {
    userInfo: {
      name: '',
      avatar: '',
      bio: ''
    },
    stats: {
      posts: 0,
      likes: 0,
      comments: 0
    },
    robotX: 20,
    robotY: 500
  },

  onLoad() {
    this.loadUserInfo()
    this.loadRobotPosition()
  },

  onShow() {
    this.loadUserInfo()
    this.loadRobotPosition()
  },

  loadUserInfo() {
    const app = getApp()
    const userInfo = app.globalData.userInfo || {}
    
    this.setData({
      userInfo: userInfo,
      stats: {
        posts: userInfo.postCount || wx.getStorageSync('publishedPostCount') || 0,
        likes: localData.getList('postCollections').length,
        follows: localData.getList('followedUsers').length,
        history: localData.getList('browseHistory').length,
        comments: userInfo.commentCount || 0
      }
    })
  },

  login() {
    const that = this
    
    wx.showLoading({
      title: '登录中...'
    })
    
    wx.login({
      success: (loginRes) => {
        console.log('=== wx.login 成功 ===')
        console.log('code:', loginRes.code)
        
        wx.request({
          url: api.url('/user/login'),
          method: 'POST',
          data: {
            openid: loginRes.code
          },
          success: (loginResult) => {
            console.log('=== 用户登录API响应 ===')
            console.log('statusCode:', loginResult.statusCode)
            console.log('data:', loginResult.data)
            
            wx.hideLoading()
            
            if (loginResult.data && loginResult.data.code === 200) {
              const userData = loginResult.data.data
              const userInfo = {
                id: userData.id,
                name: userData.nickname || '用户',
                avatar: userData.avatar || '',
                bio: '',
                postCount: 12,
                likeCount: 45,
                commentCount: 23
              }
              
              that.setData({ userInfo })
              
              const app = getApp()
              app.globalData.userInfo = userInfo
              
              if (!userData.nickname || !userData.avatar) {
                that.showNicknameModal(userData.id)
              } else {
                wx.showToast({
                  title: '登录成功',
                  icon: 'success'
                })
              }
            } else {
              console.error('登录失败:', loginResult.data)
              that.fallbackLogin()
            }
          },
          fail: (err) => {
            wx.hideLoading()
            console.error('登录API调用失败:', err)
            that.fallbackLogin()
          }
        })
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('微信登录失败:', err)
        that.fallbackLogin()
      }
    })
  },
  
  showNicknameModal(userId) {
    const that = this
    wx.showModal({
      title: '完善资料',
      editable: true,
      placeholderText: '请输入您的昵称',
      success(res) {
        if (res.confirm && res.content) {
          that.updateUserInfo(userId, res.content)
        }
      }
    })
  },
  
  updateUserInfo(userId, nickname) {
    const that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        that.compressAndSaveAvatar(userId, nickname, tempFilePath)
      },
      fail: () => {
        that.saveUserInfo(userId, nickname, '')
      }
    })
  },

  compressAndSaveAvatar(userId, nickname, filePath) {
    const that = this
    wx.compressImage({
      src: filePath,
      quality: 40,
      compressedWidth: 400,
      success: (compressRes) => {
        wx.getFileSystemManager().readFile({
          filePath: compressRes.tempFilePath,
          encoding: 'base64',
          success: res => {
            const ext = filePath.split('.').pop().toLowerCase()
            let mimeType = 'image/jpeg'
            if (ext === 'png') mimeType = 'image/png'
            else if (ext === 'jpg') mimeType = 'image/jpeg'
            else if (ext === 'jpeg') mimeType = 'image/jpeg'
            else if (ext === 'gif') mimeType = 'image/gif'
            
            const base64 = 'data:' + mimeType + ';base64,' + res.data
            that.saveUserInfo(userId, nickname, base64)
          },
          fail: err => {
            console.error('读取压缩图片失败', err)
            that.saveUserInfo(userId, nickname, '')
          }
        })
      },
      fail: () => {
        wx.getFileSystemManager().readFile({
          filePath: filePath,
          encoding: 'base64',
          success: res => {
            const ext = filePath.split('.').pop().toLowerCase()
            let mimeType = 'image/jpeg'
            if (ext === 'png') mimeType = 'image/png'
            else if (ext === 'jpg') mimeType = 'image/jpeg'
            else if (ext === 'jpeg') mimeType = 'image/jpeg'
            else if (ext === 'gif') mimeType = 'image/gif'
            
            const base64 = 'data:' + mimeType + ';base64,' + res.data
            that.saveUserInfo(userId, nickname, base64)
          },
          fail: err => {
            console.error('转换图片失败', err)
            that.saveUserInfo(userId, nickname, '')
          }
        })
      }
    })
  },
  
  saveUserInfo(userId, nickname, avatar) {
    const that = this
    
    wx.request({
      url: api.url('/user/update'),
      method: 'POST',
      data: {
        id: userId,
        nickname: nickname,
        avatar: avatar
      },
      success: (res) => {
        console.log('=== 更新用户信息成功 ===')
        const userInfo = {
          id: userId,
          name: nickname,
          avatar: avatar,
          bio: '',
          postCount: 12,
          likeCount: 45,
          commentCount: 23
        }
        
        that.setData({ userInfo })
        
        const app = getApp()
        app.globalData.userInfo = userInfo
        
        wx.showToast({
          title: '资料完善成功',
          icon: 'success'
        })
      },
      fail: (err) => {
        console.error('更新用户信息失败:', err)
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        })
      }
    })
  },
  
  fallbackLogin() {
    console.log('=== 使用备用登录方式 ===')
    
    const defaultUser = {
      id: 1,
      name: '用户',
      avatar: '',
      bio: '',
      postCount: 12,
      likeCount: 45,
      commentCount: 23
    }
    
    this.setData({ userInfo: defaultUser })
    
    const app = getApp()
    app.globalData.userInfo = defaultUser
    
    wx.showToast({
      title: '登录成功',
      icon: 'success'
    })
  },

  editAvatar() {
    if (!this.data.userInfo.name) {
      this.login()
      return
    }

    const that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        
        // 先在本地显示
        const userInfo = { ...that.data.userInfo, avatar: tempFilePath }
        that.setData({ userInfo })
        const app = getApp()
        app.globalData.userInfo = userInfo
        
        // 转换为base64并保存到数据库
        that.uploadAndSaveAvatar(tempFilePath)
      }
    })
  },

  uploadAndSaveAvatar(filePath) {
    const that = this
    wx.compressImage({
      src: filePath,
      quality: 40,
      compressedWidth: 400,
      success: (compressRes) => {
        wx.getFileSystemManager().readFile({
          filePath: compressRes.tempFilePath,
          encoding: 'base64',
          success: res => {
            const ext = filePath.split('.').pop().toLowerCase()
            let mimeType = 'image/jpeg'
            if (ext === 'png') mimeType = 'image/png'
            else if (ext === 'jpg') mimeType = 'image/jpeg'
            else if (ext === 'jpeg') mimeType = 'image/jpeg'
            else if (ext === 'gif') mimeType = 'image/gif'
            
            const base64 = 'data:' + mimeType + ';base64,' + res.data
            that.saveAvatarToDatabase(base64)
          },
          fail: err => {
            console.error('读取压缩图片失败', err)
            // 尝试直接读取原图
            wx.getFileSystemManager().readFile({
              filePath: filePath,
              encoding: 'base64',
              success: res => {
                const ext = filePath.split('.').pop().toLowerCase()
                let mimeType = 'image/jpeg'
                if (ext === 'png') mimeType = 'image/png'
                else if (ext === 'jpg') mimeType = 'image/jpeg'
                else if (ext === 'jpeg') mimeType = 'image/jpeg'
                else if (ext === 'gif') mimeType = 'image/gif'
                
                const base64 = 'data:' + mimeType + ';base64,' + res.data
                that.saveAvatarToDatabase(base64)
              },
              fail: err => {
                console.error('转换图片失败', err)
                wx.showToast({
                  title: '头像保存失败',
                  icon: 'none'
                })
              }
            })
          }
        })
      },
      fail: () => {
        // 压缩失败，直接读取原图
        wx.getFileSystemManager().readFile({
          filePath: filePath,
          encoding: 'base64',
          success: res => {
            const ext = filePath.split('.').pop().toLowerCase()
            let mimeType = 'image/jpeg'
            if (ext === 'png') mimeType = 'image/png'
            else if (ext === 'jpg') mimeType = 'image/jpeg'
            else if (ext === 'jpeg') mimeType = 'image/jpeg'
            else if (ext === 'gif') mimeType = 'image/gif'
            
            const base64 = 'data:' + mimeType + ';base64,' + res.data
            that.saveAvatarToDatabase(base64)
          },
          fail: err => {
            console.error('转换图片失败', err)
            wx.showToast({
              title: '头像保存失败',
              icon: 'none'
            })
          }
        })
      }
    })
  },

  saveAvatarToDatabase(base64) {
    const that = this
    const userId = that.data.userInfo.id
    
    wx.request({
      url: api.url('/user/update'),
      method: 'POST',
      data: {
        id: userId,
        nickname: that.data.userInfo.name,
        avatar: base64
      },
      success: (res) => {
        if (res.data && res.data.code === 200) {
          // 保存成功，更新本地数据为base64格式
          const userInfo = { ...that.data.userInfo, avatar: base64 }
          that.setData({ userInfo })
          const app = getApp()
          app.globalData.userInfo = userInfo
          
          wx.showToast({
            title: '头像更新成功',
            icon: 'success'
          })
        } else {
          wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
        }
      },
      fail: (err) => {
        console.error('更新用户头像失败', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  editProfile() {
    if (!this.data.userInfo.name) {
      this.login()
      return
    }

    const that = this
    wx.showModal({
      title: '编辑简介',
      editable: true,
      placeholderText: '请输入简介',
      success(res) {
        if (res.confirm && res.content) {
          const userInfo = { ...that.data.userInfo, bio: res.content }
          
          that.setData({ userInfo })
          
          const app = getApp()
          app.globalData.userInfo = userInfo
          
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
        }
      }
    })
  },

  editName() {
    if (!this.data.userInfo.name) {
      this.login()
      return
    }

    const that = this
    wx.showModal({
      title: '编辑昵称',
      editable: true,
      placeholderText: '请输入新的昵称',
      defaultValue: that.data.userInfo.name || '',
      success(res) {
        if (res.confirm && res.content) {
          that.saveNameToDatabase(res.content)
        }
      }
    })
  },

  saveNameToDatabase(newName) {
    const that = this
    const userId = that.data.userInfo.id
    
    wx.showLoading({
      title: '保存中...'
    })
    
    wx.request({
      url: api.url('/user/update'),
      method: 'POST',
      data: {
        id: userId,
        nickname: newName,
        avatar: that.data.userInfo.avatar
      },
      success: (res) => {
        wx.hideLoading()
        if (res.data && res.data.code === 200) {
          const userInfo = { ...that.data.userInfo, name: newName }
          that.setData({ userInfo })
          
          const app = getApp()
          app.globalData.userInfo = userInfo
          
          wx.showToast({
            title: '昵称更新成功',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('更新昵称失败', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  editTag() {
    if (!this.data.userInfo.name) {
      this.login()
      return
    }

    const that = this
    wx.showModal({
      title: '编辑标签',
      editable: true,
      placeholderText: '例如：大二 | 计算机学院',
      defaultValue: that.data.userInfo.tag || '',
      success(res) {
        if (res.confirm && res.content) {
          const userInfo = { ...that.data.userInfo, tag: res.content }
          
          that.setData({ userInfo })
          
          const app = getApp()
          app.globalData.userInfo = userInfo
          
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
        }
      }
    })
  },

  requireLoginForProfile() {
    if (!this.data.userInfo.name) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return false
    }
    return true
  },

  openPostList(tab, filter) {
    if (tab) wx.setStorageSync('pendingPostsTab', tab)
    if (filter) wx.setStorageSync('pendingPostsFilter', filter)
    wx.switchTab({ url: '/pages/posts/posts' })
  },

  showSavedList(title, list, emptyText) {
    if (!list.length) {
      wx.showToast({ title: emptyText, icon: 'none' })
      return
    }

    wx.showActionSheet({
      itemList: list.slice(0, 6).map(item => (item.title || item.content || '未命名').slice(0, 18)),
      success: (res) => {
        const item = list[res.tapIndex]
        if (item.url) {
          wx.navigateTo({ url: item.url })
        } else if (item.id && item.type !== 'news') {
          wx.navigateTo({ url: '/pages/post-detail/post-detail?id=' + item.id })
        } else {
          wx.showModal({
            title: item.title || title,
            content: item.desc || item.content || '暂无详情',
            showCancel: false
          })
        }
      }
    })
  },

  goToMyPosts() {
    if (!this.requireLoginForProfile()) return
    this.openPostList('my')
  },

  goToMyLikes() {
    if (!this.requireLoginForProfile()) return
    this.showSavedList('我的收藏', localData.getList('postCollections'), '暂无收藏')
  },

  goToMyComments() {
    if (!this.requireLoginForProfile()) return
    wx.switchTab({ url: '/pages/messages/messages' })
  },

  goToMyReplies() {
    if (!this.requireLoginForProfile()) return
    wx.switchTab({ url: '/pages/messages/messages' })
  },

  goToLikes() {
    if (!this.requireLoginForProfile()) return
    this.showSavedList('点赞记录', localData.getList('likedPosts'), '暂无点赞记录')
  },

  goToMyFollows() {
    if (!this.requireLoginForProfile()) return
    this.showSavedList('我的关注', localData.getList('followedUsers'), '暂无关注')
  },

  goToSettings() {
    wx.showActionSheet({
      itemList: ['清除缓存', '意见反馈', '关于我们'],
      success: (res) => {
        if (res.tapIndex === 0) this.clearCache()
        if (res.tapIndex === 1) this.goToFeedback()
        if (res.tapIndex === 2) this.goToAbout()
      }
    })
  },

  goToTrash() {
    if (!this.requireLoginForProfile()) return
    this.showSavedList('草稿箱', localData.getList('postDrafts'), '暂无草稿')
  },

  goToNotifications() {
    if (!this.requireLoginForProfile()) return
    wx.switchTab({ url: '/pages/messages/messages' })
  },

  goToHelp() {
    wx.showModal({
      title: '帮助与反馈',
      content: '你可以在首页查看公告和活动，在校园贴发布提问、分享和失物招领，在工具页使用课表、日程、番茄钟和转换工具。遇到问题可通过意见反馈提交。',
      confirmText: '去反馈',
      success: (res) => {
        if (res.confirm) this.goToFeedback()
      }
    })
  },

  goToActivities() {
    this.showSavedList('我的活动', localData.getList('myActivities'), '暂无报名活动')
  },

  goToLost() {
    this.openPostList('latest', 'lost')
  },

  goToSuggestions() {
    this.goToFeedback()
  },

  goToAbout() {
    wx.showModal({
      title: '关于我们',
      content: '学习交流平台 v1.0.0\n\n提供校园新闻、校园贴、消息通知、个人中心和学习工具等一站式服务。',
      showCancel: false
    })
  },

  goToHistory() {
    if (!this.requireLoginForProfile()) return
    this.showSavedList('浏览记录', localData.getList('browseHistory'), '暂无浏览记录')
  },

  goToFeedback() {
    wx.showModal({
      title: '意见反馈',
      editable: true,
      placeholderText: '请描述你遇到的问题或建议',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          localData.addUnique('feedbackList', {
            id: Date.now(),
            title: '意见反馈',
            content: res.content.trim()
          })
          wx.showToast({ title: '已提交', icon: 'success' })
        }
      }
    })
  },

  clearCache() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除收藏、历史、草稿和报名等本地缓存吗？',
      success: (res) => {
        if (res.confirm) {
          ;['postCollections', 'likedPosts', 'browseHistory', 'myActivities', 'postDrafts', 'feedbackList', 'confessions', 'publishedPostCount'].forEach(key => {
            wx.removeStorageSync(key)
          })
          this.loadUserInfo()
          wx.showToast({
            title: '缓存已清除',
            icon: 'success'
          })
        }
      }
    })
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          app.globalData.userInfo = null
          
          this.setData({
            userInfo: {
              name: '',
              avatar: '',
              bio: ''
            }
          })
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
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
