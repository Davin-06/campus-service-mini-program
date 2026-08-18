Page({
  data: {
    showCalc: false,
    showFormula: false,
    showPomodoro: false,
    showTimer: false,
    showSchedule: false,
    showTimetable: false,
    showConverter: false,
    showCurrency: false,
    showTranslator: false,
    showCalendar: false,
    
    currentYear: 2026,
    currentMonth: 5,
    calendarDays: [],
    selectedDay: null,
    selectedDayActivities: [],
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    activities: [],
    
    translatorInput: '',
    translatorOutput: '',
    translatorFrom: 'zh',
    translatorTo: 'en',

    expression: '',
    result: '0',

    formulaTab: 'math',
    currentFormulas: [],

    pomodoroTime: '25:00',
    pomodoroStatus: '准备开始',
    pomodoroRunning: false,
    pomodoroInterval: null,
    workDuration: 25,
    breakDuration: 5,
    completedPomodoros: 0,
    isWorking: true,
    remainingSeconds: 25 * 60,

    timerDisplay: '00:00:00',
    timerRunning: false,
    timerStatus: '未开始',
    timerSeconds: 0,
    timerMinutes: 0,
    timerHours: 0,
    timerInterval: null,

    schedules: [],
    currentCourses: [],
    timetableDay: 'monday',

    converterType: 'length',
    inputValue: '',
    outputValue: '0',
    fromIndex: 0,
    toIndex: 1,
    fromUnits: [],
    toUnits: [],

    currencies: [],
    currencyInput: '',
    currencyOutput: '0',
    fromCurrencyIndex: 0,
    toCurrencyIndex: 1,
    currentRate: '0',

    showModal: false,
    modalType: 'schedule',
    editingId: null,
    formData: {
      title: '',
      name: '',
      teacher: '',
      classroom: '',
      date: '',
      time: '',
      startTime: '',
      endTime: '',
      notifyEnabled: true
    },
    robotX: 20,
    robotY: 500
  },

  onLoad(options) {
    this.initFormulas()
    this.initConverter()
    this.initCurrency()
    this.initCalendar()
    this.loadData()
    
    if (options && options.action === 'calendar') {
      setTimeout(() => {
        this.showCalendar()
      }, 100)
    }
    this.loadRobotPosition()
  },

  onShow() {
    this.loadRobotPosition()
  },

  goBack() {
    wx.navigateBack({
      delta: 1
    })
  },

  onUnload() {
    if (this.data.pomodoroInterval) clearInterval(this.data.pomodoroInterval)
    if (this.data.timerInterval) clearInterval(this.data.timerInterval)
  },

  loadData() {
    const schedules = wx.getStorageSync('schedules') || []
    const courses = wx.getStorageSync('courses') || []
    this.setData({
      schedules,
      currentCourses: this.getTodayCourses(courses)
    })
  },

  getTodayCourses(courses) {
    return courses.filter(course => course.day === this.data.timetableDay)
  },

  initFormulas() {
    this.formulas = {
      math: [
        { name: '勾股定理', formula: 'a² + b² = c²', description: '直角三角形两直角边的平方和等于斜边的平方' },
        { name: '平方差', formula: 'a² - b² = (a+b)(a-b)', description: '两个数的平方差等于它们的和与差的乘积' },
        { name: '完全平方', formula: '(a±b)² = a² ± 2ab + b²', description: '两项和或差的完全平方公式' },
        { name: '立方和', formula: 'a³ + b³ = (a+b)(a²-ab+b²)', description: '两个数的立方和公式' },
        { name: '立方差', formula: 'a³ - b³ = (a-b)(a²+ab+b²)', description: '两个数的立方差公式' },
        { name: '一元二次方程', formula: 'x = (-b ± √(b²-4ac)) / 2a', description: '求根公式，Δ = b² - 4ac ≥ 0' },
        { name: '两点距离', formula: 'd = √[(x₂-x₁)² + (y₂-y₁)²]', description: '平面上两点间的距离公式' },
        { name: '中点坐标', formula: 'M((x₁+x₂)/2, (y₁+y₂)/2)', description: '两点连线中点坐标公式' },
        { name: '等差数列', formula: 'Sₙ = n(a₁+aₙ)/2 = na₁ + n(n-1)d/2', description: '等差数列前n项和公式' },
        { name: '等比数列', formula: 'Sₙ = a₁(1-qⁿ)/(1-q)', description: '等比数列前n项和公式，q≠1' },
        { name: '对数运算', formula: 'logₐ(MN) = logₐM + logₐN', description: '对数乘法法则' },
        { name: '对数幂运算', formula: 'logₐMⁿ = n logₐM', description: '对数幂运算法则' },
        { name: '换底公式', formula: 'logₐb = log_cb / log_ca', description: '对数换底公式' },
        { name: '指数运算', formula: 'aᵐ × aⁿ = aᵐ⁺ⁿ', description: '同底数幂相乘' },
        { name: '二项式定理', formula: '(a+b)ⁿ = ΣC(n,k)aⁿ⁻ᵏbᵏ', description: '二项式展开公式' }
      ],
      physics: [
        { name: '速度公式', formula: 'v = s / t', description: '速度等于路程除以时间' },
        { name: '加速度公式', formula: 'a = (v₂-v₁) / t', description: '加速度等于速度变化量除以时间' },
        { name: '重力公式', formula: 'G = mg', description: '重力等于质量乘以重力加速度' },
        { name: '牛顿第二定律', formula: 'F = ma', description: '力等于质量乘以加速度' },
        { name: '功的公式', formula: 'W = Fs cosθ', description: '功等于力与位移的乘积乘以夹角余弦' },
        { name: '功率公式', formula: 'P = W / t = Fv', description: '功率等于功除以时间或力与速度的乘积' },
        { name: '动能定理', formula: 'W = ΔEk = ½mv₂² - ½mv₁²', description: '合外力做功等于动能变化量' },
        { name: '万有引力', formula: 'F = Gm₁m₂ / r²', description: '任意两物体间引力的大小' },
        { name: '库仑定律', formula: 'F = kq₁q₂ / r²', description: '两点电荷间静电力的大小' },
        { name: '欧姆定律', formula: 'I = U / R', description: '电流等于电压除以电阻' },
        { name: '电磁感应', formula: 'E = nΔΦ / Δt', description: '感应电动势等于磁通量变化率' },
        { name: '焦耳定律', formula: 'Q = I²Rt', description: '电流通过导体产生的热量' },
        { name: '波速公式', formula: 'v = λf', description: '波速等于波长乘以频率' },
        { name: '折射定律', formula: 'n₁sinθ₁ = n₂sinθ₂', description: '光的折射定律' },
        { name: '理想气体', formula: 'PV = nRT', description: '理想气体状态方程' }
      ],
      chemistry: [
        { name: '摩尔质量', formula: 'n = m / M', description: '物质的量等于质量除以摩尔质量' },
        { name: '气体状态', formula: 'PV = nRT', description: '理想气体状态方程' },
        { name: '溶液浓度', formula: 'c = n / V', description: '物质的量浓度等于溶质物质的量除以溶液体积' },
        { name: '稀释定律', formula: 'c₁V₁ = c₂V₂', description: '稀释前后溶质的物质的量相等' },
        { name: 'pH计算', formula: 'pH = -lg[H⁺]', description: 'pH值等于氢离子浓度的负对数' },
        { name: '反应速率', formula: 'v = Δc / Δt', description: '化学反应速率等于浓度变化量除以时间' },
        { name: '化学平衡', formula: 'K = [C]ᵇ[D]ᵈ / [A]ᵃ[B]ᵈ', description: '平衡常数等于生成物浓度幂之积除以反应物浓度幂之积' },
        { name: '盖斯定律', formula: 'ΔH = ΔH₁ + ΔH₂ + ...', description: '反应热总值等于各步反应热之和' },
        { name: '电子排布', formula: '2n²', description: '第n电子层最多容纳的电子数' },
        { name: '质量守恒', formula: 'm(反应物) = m(生成物)', description: '化学反应前后质量守恒' },
        { name: '电荷守恒', formula: '阳离子电荷数 = 阴离子电荷数', description: '溶液中正负电荷总数相等' },
        { name: '阿伏伽德罗', formula: 'N = n × Nₐ', description: '粒子数等于物质的量乘以阿伏伽德罗常数' },
        { name: '热化学', formula: 'Q = mcΔT', description: '热量等于质量乘以比热容乘以温度变化' },
        { name: '电极电势', formula: 'E = E° + (RT/nF)lnQ', description: '能斯特方程' },
        { name: '溶解度', formula: 'S = (溶质质量/溶剂质量) × 100g', description: '溶解度计算公式' }
      ],
      geometry: [
        { name: '三角形面积', formula: 'S = ½ah', description: '三角形面积等于底乘高的一半' },
        { name: '三角形面积', formula: 'S = √[s(s-a)(s-b)(s-c)]', description: '海伦公式，s = (a+b+c)/2' },
        { name: '平行四边形', formula: 'S = ah', description: '平行四边形面积等于底乘高' },
        { name: '梯形面积', formula: 'S = ½(a+b)h', description: '梯形面积等于上底加下底乘高除以二' },
        { name: '圆形面积', formula: 'S = πr²', description: '圆的面积公式' },
        { name: '圆周长', formula: 'C = 2πr = πd', description: '圆的周长公式' },
        { name: '扇形面积', formula: 'S = (πr²θ) / 360', description: '弧度为θ的扇形面积' },
        { name: '扇形弧长', formula: 'L = (2πrθ) / 360', description: '弧度为θ的扇形弧长' },
        { name: '长方体体积', formula: 'V = abc', description: '长方体体积等于长宽高的乘积' },
        { name: '正方体体积', formula: 'V = a³', description: '正方体体积公式' },
        { name: '圆柱体体积', formula: 'V = πr²h', description: '圆柱体体积公式' },
        { name: '圆锥体体积', formula: 'V = ⅓πr²h', description: '圆锥体体积公式' },
        { name: '球体体积', formula: 'V = ⁴/₃πr³', description: '球体体积公式' },
        { name: '球体表面积', formula: 'S = 4πr²', description: '球体表面积公式' },
        { name: '棱柱体积', formula: 'V = Sh', description: '棱柱体积等于底面积乘高' }
      ],
      probability: [
        { name: '加法公式', formula: 'P(A∪B) = P(A) + P(B) - P(A∩B)', description: '两个事件并集的概率' },
        { name: '乘法公式', formula: 'P(A∩B) = P(A)P(B|A)', description: '两个事件交集的概率' },
        { name: '条件概率', formula: 'P(B|A) = P(A∩B) / P(A)', description: '条件概率公式' },
        { name: '全概率', formula: 'P(B) = ΣP(Aᵢ)P(B|Aᵢ)', description: '全概率公式' },
        { name: '贝叶斯公式', formula: 'P(Aᵢ|B) = P(Aᵢ)P(B|Aᵢ) / ΣP(Aⱼ)P(B|Aⱼ)', description: '贝叶斯公式' },
        { name: '期望公式', formula: 'E(X) = ΣxᵢP(X=xᵢ)', description: '离散随机变量的期望' },
        { name: '方差公式', formula: 'D(X) = E(X²) - [E(X)]²', description: '方差计算公式' },
        { name: '二项分布', formula: 'P(X=k) = C(n,k)pᵏ(1-p)ⁿ⁻ᵏ', description: '二项分布概率公式' },
        { name: '正态分布', formula: 'f(x) = (1/√(2πσ))e^(-(x-μ)²/(2σ²))', description: '正态分布概率密度函数' },
        { name: '泊松分布', formula: 'P(X=k) = (λᵏe^(-λ))/k!', description: '泊松分布概率公式' },
        { name: '样本均值', formula: 'x̄ = (x₁+x₂+...+xₙ)/n', description: '样本均值计算公式' },
        { name: '样本方差', formula: 's² = Σ(xᵢ-x̄)²/(n-1)', description: '样本方差计算公式' },
        { name: '标准差', formula: 'σ = √D(X)', description: '标准差等于方差的平方根' },
        { name: '相关系数', formula: 'r = Cov(X,Y)/(σₓσᵧ)', description: '皮尔逊相关系数' },
        { name: '协方差', formula: 'Cov(X,Y) = E[(X-E(X))(Y-E(Y))]', description: '协方差计算公式' }
      ]
    }
    this.setData({ currentFormulas: this.formulas.math })
  },

  initConverter() {
    this.units = {
      length: [
        { name: '米(m)', value: 1 },
        { name: '厘米(cm)', value: 0.01 },
        { name: '毫米(mm)', value: 0.001 },
        { name: '千米(km)', value: 1000 },
        { name: '英寸(in)', value: 0.0254 },
        { name: '英尺(ft)', value: 0.3048 },
        { name: '码(yd)', value: 0.9144 },
        { name: '英里(mi)', value: 1609.34 }
      ],
      weight: [
        { name: '千克(kg)', value: 1 },
        { name: '克(g)', value: 0.001 },
        { name: '毫克(mg)', value: 0.000001 },
        { name: '吨(t)', value: 1000 },
        { name: '磅(lb)', value: 0.453592 },
        { name: '盎司(oz)', value: 0.0283495 },
        { name: '斤', value: 0.5 },
        { name: '两', value: 0.05 }
      ],
      temp: [
        { name: '摄氏度(℃)', value: 'c' },
        { name: '华氏度(℉)', value: 'f' },
        { name: '开尔文(K)', value: 'k' }
      ],
      area: [
        { name: '平方米(m²)', value: 1 },
        { name: '平方厘米(cm²)', value: 0.0001 },
        { name: '平方毫米(mm²)', value: 0.000001 },
        { name: '平方千米(km²)', value: 1000000 },
        { name: '平方英寸(in²)', value: 0.00064516 },
        { name: '平方英尺(ft²)', value: 0.092903 },
        { name: '公顷(ha)', value: 10000 },
        { name: '亩', value: 666.6667 }
      ],
      volume: [
        { name: '立方米(m³)', value: 1 },
        { name: '立方厘米(cm³)', value: 0.000001 },
        { name: '立方毫米(mm³)', value: 0.000000001 },
        { name: '升(L)', value: 0.001 },
        { name: '毫升(mL)', value: 0.000001 },
        { name: '立方英寸(in³)', value: 0.0000163871 },
        { name: '立方英尺(ft³)', value: 0.0283168 },
        { name: '加仑(gal)', value: 0.00378541 }
      ]
    }
    this.setData({
      fromUnits: this.units.length,
      toUnits: this.units.length
    })
  },

  initCurrency() {
    const currencies = [
      { name: '人民币(CNY)', code: 'CNY', rate: 1 },
      { name: '美元(USD)', code: 'USD', rate: 0.1389 },
      { name: '欧元(EUR)', code: 'EUR', rate: 0.1278 },
      { name: '英镑(GBP)', code: 'GBP', rate: 0.111 },
      { name: '日元(JPY)', code: 'JPY', rate: 21.5 },
      { name: '瑞士法郎(CHF)', code: 'CHF', rate: 0.125 },
      { name: '港币(HKD)', code: 'HKD', rate: 1.08 },
      { name: '澳元(AUD)', code: 'AUD', rate: 0.215 },
      { name: '加元(CAD)', code: 'CAD', rate: 0.192 },
      { name: '新西兰元(NZD)', code: 'NZD', rate: 0.23 }
    ]
    const currentRate = (currencies[0].rate / currencies[1].rate).toFixed(4)
    this.setData({
      currencies: currencies,
      currentRate: currentRate
    })
  },

  calculateRate(from, to) {
    const currencies = this.data.currencies
    if (!currencies || !currencies[from] || !currencies[to]) {
      return '0.0000'
    }
    const fromRate = currencies[from].rate
    const toRate = currencies[to].rate
    return (fromRate / toRate).toFixed(4)
  },

  switchFormulaTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      formulaTab: tab,
      currentFormulas: this.formulas[tab]
    })
  },

  copyFormula(e) {
    const formula = e.currentTarget.dataset.formula
    wx.setClipboardData({
      data: formula,
      success() { wx.showToast({ title: '已复制', icon: 'success' }) }
    })
  },

  switchConverter(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      converterType: type,
      fromUnits: this.units[type],
      toUnits: this.units[type],
      fromIndex: 0,
      toIndex: 1,
      inputValue: '',
      outputValue: '0'
    })
  },

  onConverterInput(e) {
    this.setData({ inputValue: e.detail.value })
    this.convert()
  },

  onFromChange(e) {
    this.setData({ fromIndex: e.detail.value })
    this.convert()
  },

  onToChange(e) {
    this.setData({ toIndex: e.detail.value })
    this.convert()
  },

  convert() {
    const { inputValue, converterType, fromIndex, toIndex } = this.data
    if (!inputValue) {
      this.setData({ outputValue: '0' })
      return
    }

    const num = parseFloat(inputValue)
    if (isNaN(num)) {
      this.setData({ outputValue: '错误' })
      return
    }

    const units = this.units[converterType]
    const from = units[fromIndex]
    const to = units[toIndex]

    let result
    if (converterType === 'temp') {
      result = this.convertTemperature(num, from.value, to.value)
    } else {
      const baseValue = num * from.value
      result = baseValue / to.value
    }

    this.setData({ outputValue: String(Math.round(result * 1000000) / 1000000) })
  },

  convertTemperature(num, from, to) {
    let celsius
    if (from === 'c') celsius = num
    else if (from === 'f') celsius = (num - 32) * 5 / 9
    else if (from === 'k') celsius = num - 273.15

    if (to === 'c') return celsius
    else if (to === 'f') return celsius * 9 / 5 + 32
    else if (to === 'k') return celsius + 273.15
  },

  onCurrencyInput(e) {
    this.setData({ currencyInput: e.detail.value })
    this.convertCurrency()
  },

  onFromCurrencyChange(e) {
    this.setData({ fromCurrencyIndex: e.detail.value })
    this.updateRate()
    this.convertCurrency()
  },

  onToCurrencyChange(e) {
    this.setData({ toCurrencyIndex: e.detail.value })
    this.updateRate()
    this.convertCurrency()
  },

  swapCurrencies() {
    const { fromCurrencyIndex, toCurrencyIndex } = this.data
    this.setData({
      fromCurrencyIndex: toCurrencyIndex,
      toCurrencyIndex: fromCurrencyIndex
    })
    this.updateRate()
    this.convertCurrency()
  },

  updateRate() {
    const { fromCurrencyIndex, toCurrencyIndex } = this.data
    this.setData({
      currentRate: this.calculateRate(fromCurrencyIndex, toCurrencyIndex)
    })
  },

  convertCurrency() {
    const { currencyInput, fromCurrencyIndex, toCurrencyIndex, currencies } = this.data
    if (!currencyInput) {
      this.setData({ currencyOutput: '0' })
      return
    }

    const num = parseFloat(currencyInput)
    if (isNaN(num)) {
      this.setData({ currencyOutput: '错误' })
      return
    }

    const fromRate = currencies[fromCurrencyIndex].rate
    const toRate = currencies[toCurrencyIndex].rate
    const result = num * fromRate / toRate

    this.setData({ currencyOutput: result.toFixed(4) })
  },

  showCalculator() { this.setViewState('showCalc', true) },
  hideCalculator() { this.setData({ showCalc: false }) },

  showFormula() { this.setViewState('showFormula', true); this.switchFormulaTab({ currentTarget: { dataset: { tab: this.data.formulaTab } } }) },
  hideFormula() { this.setData({ showFormula: false }) },

  showPomodoro() { this.setViewState('showPomodoro', true) },
  hidePomodoro() { if (this.data.pomodoroInterval) { clearInterval(this.data.pomodoroInterval); this.setData({ pomodoroRunning: false, pomodoroInterval: null }) }; this.setData({ showPomodoro: false }) },

  showTimer() { this.setViewState('showTimer', true) },
  hideTimer() { if (this.data.timerInterval) { clearInterval(this.data.timerInterval); this.setData({ timerRunning: false, timerInterval: null }) }; this.setData({ showTimer: false }) },

  showSchedule() { this.setViewState('showSchedule', true) },
  showTimetable() { const courses = wx.getStorageSync('courses') || []; this.setViewState('showTimetable', true); this.setData({ currentCourses: this.getTodayCourses(courses) }) },

  showConverter() { this.setViewState('showConverter', true) },
  hideConverter() { this.setData({ showConverter: false }) },

  showCurrency() { 
    if (!this.data.currencies || this.data.currencies.length === 0) {
      this.initCurrency()
    }
    this.setViewState('showCurrency', true) 
  },
  hideCurrency() { this.setData({ showCurrency: false }) },

  setViewState(active, value) {
    const states = ['showCalc', 'showFormula', 'showPomodoro', 'showTimer', 'showSchedule', 'showTimetable', 'showConverter', 'showCurrency', 'showTranslator']
    const data = {}
    states.forEach(s => data[s] = s === active ? value : false)
    this.setData(data)
  },
  
  showTranslator() { this.setViewState('showTranslator', true) },
  hideTranslator() { this.setData({ showTranslator: false }) },
  
  onTranslatorInput(e) {
    this.setData({ translatorInput: e.detail.value })
    if (e.detail.value.trim()) {
      this.translateText()
    } else {
      this.setData({ translatorOutput: '' })
    }
  },
  
  switchTranslatorFrom(e) {
    this.setData({ translatorFrom: e.detail.value })
    this.translateText()
  },
  
  switchTranslatorTo(e) {
    this.setData({ translatorTo: e.detail.value })
    this.translateText()
  },
  
  swapLanguages() {
    const { translatorFrom, translatorTo } = this.data
    this.setData({
      translatorFrom: translatorTo,
      translatorTo: translatorFrom
    })
    this.translateText()
  },
  
  translateText() {
    const { translatorInput, translatorFrom, translatorTo } = this.data
    if (!translatorInput.trim()) return
    
    const result = this.mockTranslate(translatorInput, translatorFrom, translatorTo)
    this.setData({ translatorOutput: result })
  },
  
  mockTranslate(text, from, to) {
    const translations = {
      '你好': { en: 'Hello', ja: 'こんにちは', ko: '안녕하세요', fr: 'Bonjour', de: 'Hallo', es: 'Hola' },
      '谢谢': { en: 'Thank you', ja: 'ありがとう', ko: '감사합니다', fr: 'Merci', de: 'Danke', es: 'Gracias' },
      '再见': { en: 'Goodbye', ja: 'さようなら', ko: '안녕히 가세요', fr: 'Au revoir', de: 'Auf Wiedersehen', es: 'Adiós' },
      '学习': { en: 'Study', ja: '学習', ko: '공부', fr: 'Étude', de: 'Lernen', es: 'Estudio' },
      '学校': { en: 'School', ja: '学校', ko: '학교', fr: 'École', de: 'Schule', es: 'Colegio' },
      '学生': { en: 'Student', ja: '学生', ko: '학생', fr: 'Étudiant', de: 'Student', es: 'Estudiante' },
      '老师': { en: 'Teacher', ja: '先生', ko: '교사', fr: 'Professeur', de: 'Lehrer', es: 'Profesor' },
      '课程': { en: 'Course', ja: 'コース', ko: '과정', fr: 'Cours', de: 'Kurs', es: 'Curso' },
      '考试': { en: 'Exam', ja: '試験', ko: '시험', fr: 'Examen', de: 'Prüfung', es: 'Examen' },
      '作业': { en: 'Homework', ja: '宿題', ko: '숙제', fr: 'Devoir', de: 'Hausaufgabe', es: 'Tarea' },
      '时间': { en: 'Time', ja: '時間', ko: '시간', fr: 'Temps', de: 'Zeit', es: 'Tiempo' },
      '朋友': { en: 'Friend', ja: '友達', ko: '친구', fr: 'Ami', de: 'Freund', es: 'Amigo' },
      '快乐': { en: 'Happy', ja: '幸せ', ko: '행복', fr: 'Heureux', de: 'Glücklich', es: 'Feliz' },
      '爱': { en: 'Love', ja: '愛', ko: '사랑', fr: 'Amour', de: 'Liebe', es: 'Amor' },
      '书': { en: 'Book', ja: '本', ko: '책', fr: 'Livre', de: 'Buch', es: 'Libro' },
      '电脑': { en: 'Computer', ja: 'コンピューター', ko: '컴퓨터', fr: 'Ordinateur', de: 'Computer', es: 'Computadora' },
      '手机': { en: 'Phone', ja: '携帯電話', ko: '핸드폰', fr: 'Téléphone', de: 'Telefon', es: 'Teléfono' },
      '音乐': { en: 'Music', ja: '音楽', ko: '음악', fr: 'Musique', de: 'Musik', es: 'Música' },
      '电影': { en: 'Movie', ja: '映画', ko: '영화', fr: 'Film', de: 'Film', es: 'Película' }
    }
    
    if (from === 'zh' && to === 'en') {
      const trimmedText = text.trim()
      if (translations[trimmedText]) {
        return translations[trimmedText].en
      } else if (/[\u4e00-\u9fa5]/.test(text)) {
        return `[English translation of: ${text}]`
      } else {
        return text
      }
    } else if (from === 'en' && to === 'zh') {
      for (const [chinese, langs] of Object.entries(translations)) {
        if (langs.en.toLowerCase() === text.trim().toLowerCase()) {
          return chinese
        }
      }
      return `[中文翻译: ${text}]`
    } else {
      return `[${this.getLangName(to)} translation of: ${text}]`
    }
  },
  
  getLangName(code) {
    const langs = {
      'zh': '中文',
      'en': 'English',
      'ja': '日本語',
      'ko': '한국어',
      'fr': 'Français',
      'de': 'Deutsch',
      'es': 'Español'
    }
    return langs[code] || code
  },

  adjustWorkTime(e) {
    const action = e.currentTarget.dataset.action
    let duration = this.data.workDuration
    if (action === 'plus' && duration < 60) duration += 5
    else if (action === 'minus' && duration > 5) duration -= 5
    this.setData({ workDuration: duration })
  },

  adjustBreakTime(e) {
    const action = e.currentTarget.dataset.action
    let duration = this.data.breakDuration
    if (action === 'plus' && duration < 30) duration += 5
    else if (action === 'minus' && duration > 1) duration -= 5
    this.setData({ breakDuration: duration })
  },

  togglePomodoro() {
    if (this.data.pomodoroRunning) {
      clearInterval(this.data.pomodoroInterval)
      this.setData({ pomodoroRunning: false, pomodoroStatus: '已暂停' })
    } else {
      this.startPomodoro()
    }
  },

  startPomodoro() {
    const that = this
    let seconds = this.data.remainingSeconds

    const interval = setInterval(() => {
      seconds--
      if (seconds <= 0) that.completePomodoroPhase()
      else that.setData({ remainingSeconds: seconds, pomodoroTime: that.formatTime(seconds) })
    }, 1000)

    this.setData({ pomodoroRunning: true, pomodoroInterval: interval, pomodoroStatus: this.data.isWorking ? '专注工作中' : '休息中' })
  },

  completePomodoroPhase() {
    clearInterval(this.data.pomodoroInterval)

    if (this.data.isWorking) {
      const completed = this.data.completedPomodoros + 1
      this.setData({ completedPomodoros: completed, isWorking: false, remainingSeconds: this.data.breakDuration * 60, pomodoroTime: this.formatTime(this.data.breakDuration * 60) })
      wx.showToast({ title: '工作完成！休息一下吧 🍅', icon: 'none', duration: 3000 })
    } else {
      this.setData({ isWorking: true, remainingSeconds: this.data.workDuration * 60, pomodoroTime: this.formatTime(this.data.workDuration * 60) })
      wx.showToast({ title: '休息结束！继续加油 💪', icon: 'none' })
    }

    this.startPomodoro()
  },

  resetPomodoro() {
    clearInterval(this.data.pomodoroInterval)
    this.setData({ pomodoroRunning: false, pomodoroStatus: '准备开始', pomodoroTime: this.formatTime(this.data.workDuration * 60), remainingSeconds: this.data.workDuration * 60, pomodoroInterval: null, isWorking: true })
  },

  formatTime(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  },

  adjustTimer(e) {
    const { unit, action } = e.currentTarget.dataset
    let hours = this.data.timerHours
    let minutes = this.data.timerMinutes
    let seconds = this.data.timerSeconds

    if (unit === 'hours') {
      if (action === 'plus' && hours < 24) hours++
      else if (action === 'minus' && hours > 0) hours--
    } else if (unit === 'minutes') {
      if (action === 'plus' && minutes < 59) minutes++
      else if (action === 'minus' && minutes > 0) minutes--
    } else if (unit === 'seconds') {
      if (action === 'plus' && seconds < 59) seconds++
      else if (action === 'minus' && seconds > 0) seconds--
    }

    this.setData({ timerHours: hours, timerMinutes: minutes, timerSeconds: seconds, timerDisplay: this.formatTimer(hours, minutes, seconds) })
  },

  formatTimer(h, m, s) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  },

  toggleTimer() {
    if (this.data.timerRunning) {
      clearInterval(this.data.timerInterval)
      this.setData({ timerRunning: false, timerStatus: '已暂停' })
    } else {
      const totalSeconds = this.data.timerHours * 3600 + this.data.timerMinutes * 60 + this.data.timerSeconds
      if (totalSeconds === 0) {
        wx.showToast({ title: '请先设置时间', icon: 'none' })
        return
      }

      const that = this
      let seconds = totalSeconds

      const interval = setInterval(() => {
        seconds--
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = seconds % 60

        if (seconds <= 0) {
          clearInterval(interval)
          that.setData({ timerDisplay: '00:00:00', timerRunning: false, timerStatus: '计时结束', timerInterval: null })
          wx.showToast({ title: '计时结束！', icon: 'success' })
        } else {
          that.setData({ timerHours: h, timerMinutes: m, timerSeconds: s, timerDisplay: that.formatTimer(h, m, s) })
        }
      }, 1000)

      this.setData({ timerRunning: true, timerStatus: '计时中', timerInterval: interval })
    }
  },

  resetTimer() {
    if (this.data.timerInterval) clearInterval(this.data.timerInterval)
    this.setData({ timerSeconds: 0, timerMinutes: 0, timerHours: 0, timerDisplay: '00:00:00', timerRunning: false, timerStatus: '未开始', timerInterval: null })
  },

  addSchedule() {
    this.setData({ showModal: true, modalType: 'schedule', editingId: null, formData: { title: '', date: this.getTodayDate(), time: '09:00', notifyEnabled: true } })
  },

  editSchedule(e) {
    const id = e.currentTarget.dataset.id
    const schedule = this.data.schedules.find(s => s.id === id)
    if (schedule) this.setData({ showModal: true, modalType: 'schedule', editingId: id, formData: { ...schedule } })
  },

  deleteSchedule(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除', content: '确定要删除这个日程吗？',
      success: (res) => {
        if (res.confirm) {
          const schedules = this.data.schedules.filter(s => s.id !== id)
          this.setData({ schedules })
          wx.setStorageSync('schedules', schedules)
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  toggleSchedule(e) {
    const id = e.currentTarget.dataset.id
    const schedules = this.data.schedules.map(s => s.id === id ? { ...s, done: !s.done } : s)
    this.setData({ schedules })
    wx.setStorageSync('schedules', schedules)
  },

  addCourse() {
    this.setData({ showModal: true, modalType: 'course', editingId: null, formData: { name: '', teacher: '', classroom: '', startTime: '08:00', endTime: '09:00', day: this.data.timetableDay } })
  },

  editCourse(e) {
    const id = e.currentTarget.dataset.id
    const courses = wx.getStorageSync('courses') || []
    const course = courses.find(c => c.id === id)
    if (course) this.setData({ showModal: true, modalType: 'course', editingId: id, formData: { ...course } })
  },

  deleteCourse(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除', content: '确定要删除这门课程吗？',
      success: (res) => {
        if (res.confirm) {
          const courses = wx.getStorageSync('courses') || []
          const filtered = courses.filter(c => c.id !== id)
          wx.setStorageSync('courses', filtered)
          this.setData({ currentCourses: this.getTodayCourses(filtered) })
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  switchTimetableDay(e) {
    const day = e.currentTarget.dataset.day
    const courses = wx.getStorageSync('courses') || []
    this.setData({ timetableDay: day, currentCourses: this.getTodayCourses(courses) })
  },

  hideModal() { this.setData({ showModal: false }) },

  onFormInput(e) { this.setData({ [`formData.${e.currentTarget.dataset.field}`]: e.detail.value }) },
  onDateChange(e) { this.setData({ 'formData.date': e.detail.value }) },
  onTimeChange(e) { this.setData({ 'formData.time': e.detail.value }) },
  onStartTimeChange(e) { this.setData({ 'formData.startTime': e.detail.value }) },
  onEndTimeChange(e) { this.setData({ 'formData.endTime': e.detail.value }) },
  onNotifyChange(e) { this.setData({ 'formData.notifyEnabled': e.detail.value }) },

  confirmModal() {
    const { modalType, formData, editingId } = this.data

    if (modalType === 'schedule') {
      if (!formData.title) { wx.showToast({ title: '请输入标题', icon: 'none' }); return }

      const schedules = [...this.data.schedules]
      if (editingId) {
        const index = schedules.findIndex(s => s.id === editingId)
        if (index !== -1) schedules[index] = { ...schedules[index], ...formData }
      } else {
        schedules.push({ id: Date.now(), ...formData })
      }

      this.setData({ schedules })
      wx.setStorageSync('schedules', schedules)
    } else if (modalType === 'course') {
      if (!formData.name) { wx.showToast({ title: '请输入课程名称', icon: 'none' }); return }

      const courses = wx.getStorageSync('courses') || []
      if (editingId) {
        const index = courses.findIndex(c => c.id === editingId)
        if (index !== -1) courses[index] = { ...courses[index], ...formData }
      } else {
        courses.push({ id: Date.now(), day: this.data.timetableDay, ...formData })
      }

      wx.setStorageSync('courses', courses)
      this.setData({ currentCourses: this.getTodayCourses(courses) })
    }

    this.setData({ showModal: false })
    wx.showToast({ title: '保存成功', icon: 'success' })
  },

  getTodayDate() {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  },

  calcClear() { this.setData({ expression: '', result: '0' }) },

  calcInput(e) {
    const value = e.currentTarget.dataset.value
    let expression = this.data.expression + value
    try {
      let result = this.calculate(expression)
      this.setData({ expression, result: String(result) })
    } catch (err) {
      this.setData({ expression, result: '...' })
    }
  },

  calcEqual() {
    try {
      const result = this.calculate(this.data.expression)
      this.setData({ result: String(result) })
    } catch (err) {
      wx.showToast({ title: '计算错误', icon: 'none' })
    }
  },

  calculate(expr) {
    expr = expr.replace(/×/g, '*').replace(/÷/g, '/')
    const tokens = []
    let current = ''

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i]
      if ('0123456789.'.includes(char)) current += char
      else if (char === '-' && (i === 0 || '+-*/('.includes(expr[i-1]))) current += char
      else {
        if (current) { tokens.push(current); current = '' }
        if ('+-*/'.includes(char)) tokens.push(char)
      }
    }
    if (current) tokens.push(current)

    let result = parseFloat(tokens[0])
    for (let i = 1; i < tokens.length; i += 2) {
      const op = tokens[i], num = parseFloat(tokens[i + 1])
      if (op === '+') result += num
      else if (op === '-') result -= num
      else if (op === '*') result *= num
      else if (op === '/') result /= num
    }
    return result
  },

  initCalendar() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    
    const defaultActivities = [
      { id: 1, title: '校园十佳歌手大赛', date: '2026-05-15', time: '18:00', status: 'upcoming' },
      { id: 2, title: '数学竞赛初赛', date: '2026-05-20', time: '09:00', status: 'upcoming' },
      { id: 3, title: '运动会开幕式', date: '2026-05-25', time: '08:00', status: 'upcoming' },
      { id: 4, title: '社团招新', date: '2026-05-10', time: '10:00', status: 'ongoing' },
      { id: 5, title: '英语演讲比赛', date: '2026-06-01', time: '14:00', status: 'upcoming' },
      { id: 6, title: '毕业典礼', date: '2026-06-15', time: '09:00', status: 'upcoming' }
    ]
    
    this.setData({
      currentYear: year,
      currentMonth: month,
      activities: defaultActivities
    })
    
    this.renderCalendar()
  },

  showCalendar() { this.setData({ showCalendar: true }); this.renderCalendar() },
  hideCalendar() { this.setData({ showCalendar: false }) },

  prevMonth() {
    let { currentYear, currentMonth } = this.data
    if (currentMonth === 1) { currentYear--; currentMonth = 12 }
    else currentMonth--
    this.setData({ currentYear, currentMonth })
    this.renderCalendar()
  },

  nextMonth() {
    let { currentYear, currentMonth } = this.data
    if (currentMonth === 12) { currentYear++; currentMonth = 1 }
    else currentMonth++
    this.setData({ currentYear, currentMonth })
    this.renderCalendar()
  },

  renderCalendar() {
    const { currentYear, currentMonth, activities } = this.data
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay()
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    const calendarDays = []
    
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push({ day: '', isToday: false, isSelected: false, hasActivity: false })
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const hasActivity = activities.some(a => a.date === dayStr)
      
      calendarDays.push({
        day,
        isToday: dayStr === todayStr,
        isSelected: this.data.selectedDay === day,
        hasActivity
      })
    }
    
    this.setData({ calendarDays })
    
    if (!this.data.selectedDay) {
      this.setData({ selectedDay: today.getDate() })
      this.updateSelectedDayActivities(today.getDate())
    }
  },

  selectDay(e) {
    const day = e.currentTarget.dataset.day
    if (!day) return
    
    this.setData({ selectedDay: day })
    this.renderCalendar()
    this.updateSelectedDayActivities(day)
  },

  updateSelectedDayActivities(day) {
    const { currentYear, currentMonth, activities } = this.data
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayActivities = activities.filter(a => a.date === dateStr)
    this.setData({ selectedDayActivities: dayActivities })
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