function getList(key) {
  const value = wx.getStorageSync(key)
  return Array.isArray(value) ? value : []
}

function setList(key, list) {
  wx.setStorageSync(key, Array.isArray(list) ? list : [])
}

function addUnique(key, item, idKey = 'id', max = 50) {
  const list = getList(key).filter(existing => existing[idKey] !== item[idKey])
  const next = [{ ...item, savedAt: Date.now() }, ...list].slice(0, max)
  setList(key, next)
  return next
}

function removeById(key, id, idKey = 'id') {
  const next = getList(key).filter(item => item[idKey] !== id)
  setList(key, next)
  return next
}

function hasId(key, id, idKey = 'id') {
  return getList(key).some(item => item[idKey] === id)
}

module.exports = {
  getList,
  setList,
  addUnique,
  removeById,
  hasId
}
