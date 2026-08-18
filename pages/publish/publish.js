const api = require('../../utils/api')
const localData = require('../../utils/local-data')

Page({
  data: {
    postType: 'question',
    title: '',
    content: '',
    images: [],
    canPublish: false,
    isLoggedIn: false,
    hasPublished: false,
    robotX: 20,
    robotY: 500
  },

  onLoad() {
    console.log('发帖页面加载')
    this.checkLogin()
    this.restoreDraft()
    this.loadRobotPosition()
  },

  onShow() {
    this.loadRobotPosition()
  },

  onUnload() {
    this.saveDraft()
  },

  goBack() {
    wx.navigateBack()
  },

  checkLogin() {
    const app = getApp()
    const userInfo = app.globalData.userInfo
    this.setData({
      isLoggedIn: !!userInfo?.name
    })
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  restoreDraft() {
    const drafts = localData.getList('postDrafts')
    if (!drafts.length) return

    const draft = drafts[0]
    wx.showModal({
      title: '恢复草稿',
      content: '检测到未发布的草稿，是否恢复？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            postType: draft.postType || 'question',
            title: draft.title || '',
            content: draft.content || '',
            images: draft.images || []
          })
          this.checkCanPublish()
        }
      }
    })
  },

  saveDraft() {
    if (this.data.hasPublished) return
    const { postType, title, content, images } = this.data
    if (!title.trim() && !content.trim() && images.length === 0) return

    localData.addUnique('postDrafts', {
      id: 'latestDraft',
      postType,
      title,
      content,
      images
    }, 'id', 5)
  },

  selectType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      postType: type
    })
    this.checkCanPublish()
  },

  onTitleInput(e) {
    this.setData({
      title: e.detail.value
    })
    this.checkCanPublish()
  },

  onContentInput(e) {
    this.setData({
      content: e.detail.value
    })
    this.checkCanPublish()
  },

  chooseImage() {
    const that = this
    const remaining = 3 - this.data.images.length
    
    if (remaining <= 0) {
      wx.showToast({
        title: '最多上传3张图片',
        icon: 'none'
      })
      return
    }
    
    wx.chooseImage({
      count: remaining,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePaths = res.tempFilePaths
        that.setData({
          images: that.data.images.concat(tempFilePaths)
        })
      }
    })
  },

  getImageBase64(imagePath) {
    return new Promise((resolve, reject) => {
      wx.compressImage({
        src: imagePath,
        quality: 40,
        compressedWidth: 600,
        success: (compressRes) => {
          wx.getFileSystemManager().readFile({
            filePath: compressRes.tempFilePath,
            encoding: 'base64',
            success: res => {
              const ext = imagePath.split('.').pop().toLowerCase()
              let mimeType = 'image/jpeg'
              if (ext === 'png') mimeType = 'image/png'
              else if (ext === 'jpg') mimeType = 'image/jpeg'
              else if (ext === 'jpeg') mimeType = 'image/jpeg'
              else if (ext === 'gif') mimeType = 'image/gif'
              
              const base64 = 'data:' + mimeType + ';base64,' + res.data
              const sizeKB = (res.data.length * 3) / 4 / 1024
              console.log(`图片压缩后大小: ${sizeKB.toFixed(2)} KB`)
              resolve(base64)
            },
            fail: err => {
              console.error('读取压缩图片失败', err)
              resolve('')
            }
          })
        },
        fail: () => {
          wx.getFileSystemManager().readFile({
            filePath: imagePath,
            encoding: 'base64',
            success: res => {
              const ext = imagePath.split('.').pop().toLowerCase()
              let mimeType = 'image/jpeg'
              if (ext === 'png') mimeType = 'image/png'
              else if (ext === 'jpg') mimeType = 'image/jpeg'
              else if (ext === 'jpeg') mimeType = 'image/jpeg'
              else if (ext === 'gif') mimeType = 'image/gif'
              
              const base64 = 'data:' + mimeType + ';base64,' + res.data
              const sizeKB = (res.data.length * 3) / 4 / 1024
              console.log(`图片原始大小: ${sizeKB.toFixed(2)} KB`)
              resolve(base64)
            },
            fail: err => {
              console.error('转换图片失败', err)
              resolve('')
            }
          })
        }
      })
    })
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.images
    images.splice(index, 1)
    this.setData({
      images: images
    })
  },

  checkCanPublish() {
    const { title, content } = this.data
    const canPublish = title.trim().length > 0 && content.trim().length > 0
    this.setData({
      canPublish: canPublish
    })
  },

  publishPost() {
    const { postType, title, content, images } = this.data
    
    if (!title.trim()) {
      wx.showToast({
        title: '请输入标题',
        icon: 'none'
      })
      return
    }

    if (!content.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '发布中...'
    })

    this.uploadImagesAndPublish(images, postType, title.trim(), content.trim())
  },

  async uploadImagesAndPublish(images, postType, title, content) {
    try {
      console.log('开始处理图片...')
      const base64Images = []
      let totalSize = 0
      
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        console.log(`处理第 ${i + 1} 张图片:`, img)
        
        let base64 = ''
        if (img.startsWith('data:')) {
          base64 = img
        } else {
          base64 = await this.getImageBase64(img)
        }
        
        if (base64) {
          const sizeKB = (base64.length * 3) / 4 / 1024
          console.log(`第 ${i + 1} 张图片大小: ${sizeKB.toFixed(2)} KB`)
          totalSize += base64.length
          
          if (totalSize > 5 * 1024 * 1024) {
            console.warn('图片总大小超过5MB，跳过剩余图片')
            wx.showToast({
              title: '图片太大，已跳过部分图片',
              icon: 'none'
            })
            break
          }
          
          base64Images.push(base64)
        }
      }
      
      console.log('图片处理完成，总大小:', (totalSize * 3 / 4 / 1024).toFixed(2), 'KB')

      console.log('准备发送请求，数据大小:', JSON.stringify(base64Images).length, '字节')
      
      const app = getApp()
      const userInfo = app.globalData.userInfo || {}
      const userId = userInfo.id || 1
      const nickname = userInfo.name || '用户'
      const avatar = userInfo.avatar || '/images/default-avatar.png'
      
      wx.request({
        url: api.url('/post/create'),
        method: 'POST',
        data: {
          title: title,
          content: content,
          category: postType,
          images: JSON.stringify(base64Images),
          user_id: userId,
          nickname: nickname,
          avatar: avatar
        },
        success: (res) => {
          console.log('=== 服务器完整响应 ===')
          console.log('statusCode:', res.statusCode)
          console.log('data:', res.data)
          wx.hideLoading()
          
          // 兼容处理：支持 res.data.code 或直接状态码
          if ((res.data && res.data.code === 200) || res.statusCode === 200) {
            localData.removeById('postDrafts', 'latestDraft')
            const nextCount = (wx.getStorageSync('publishedPostCount') || 0) + 1
            wx.setStorageSync('publishedPostCount', nextCount)
            this.setData({ hasPublished: true })
            wx.showToast({
              title: '发布成功',
              icon: 'success'
            })
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          } else {
            wx.showToast({
              title: (res.data && res.data.message) || '发布失败',
              icon: 'none'
            })
          }
        },
        fail(err) {
          console.error('=== 请求失败 ===')
          console.error(err)
          wx.hideLoading()
          wx.showToast({
            title: '网络请求失败',
            icon: 'none'
          })
        }
      })
    } catch (err) {
      console.error('处理出错:', err)
      wx.hideLoading()
      wx.showToast({
        title: '图片处理失败',
        icon: 'none'
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
