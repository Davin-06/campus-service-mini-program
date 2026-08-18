const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ quiet: true });

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'news_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

function getRequiredString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePositiveInt(value, fallback, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

let pool;

const createTablesSql = `
CREATE TABLE IF NOT EXISTS news (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL COMMENT '新闻标题',
  summary TEXT COMMENT '新闻摘要',
  content TEXT COMMENT '新闻内容',
  source VARCHAR(100) DEFAULT '未知来源' COMMENT '新闻来源',
  url VARCHAR(500) DEFAULT '' COMMENT '原文链接',
  image TEXT DEFAULT '' COMMENT '新闻图片Base64',
  publish_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
  category VARCHAR(50) DEFAULT 'education' COMMENT '分类',
  views INT DEFAULT 0 COMMENT '浏览量',
  likes INT DEFAULT 0 COMMENT '点赞数',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_publish_time (publish_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='新闻表';

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openid VARCHAR(255) UNIQUE NOT NULL COMMENT '微信OpenID',
  nickname VARCHAR(100) DEFAULT '' COMMENT '昵称',
  avatar VARCHAR(500) DEFAULT '' COMMENT '头像URL',
  real_name VARCHAR(50) DEFAULT '' COMMENT '真实姓名',
  student_id VARCHAR(50) DEFAULT '' COMMENT '学号',
  class_name VARCHAR(100) DEFAULT '' COMMENT '班级',
  phone VARCHAR(20) DEFAULT '' COMMENT '手机号',
  email VARCHAR(100) DEFAULT '' COMMENT '邮箱',
  role VARCHAR(20) DEFAULT 'student' COMMENT '角色：student/teacher/admin',
  status TINYINT DEFAULT 1 COMMENT '状态：0禁用/1启用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_openid (openid),
  INDEX idx_role (role),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '发布者ID',
  title VARCHAR(255) NOT NULL COMMENT '帖子标题',
  content TEXT COMMENT '帖子内容',
  images TEXT COMMENT '图片URL，逗号分隔',
  category VARCHAR(50) DEFAULT 'general' COMMENT '分类：general/study/life/job',
  likes INT DEFAULT 0 COMMENT '点赞数',
  comments INT DEFAULT 0 COMMENT '评论数',
  views INT DEFAULT 0 COMMENT '浏览量',
  is_top TINYINT DEFAULT 0 COMMENT '是否置顶：0否/1是',
  status TINYINT DEFAULT 1 COMMENT '状态：0禁用/1启用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_category (category),
  INDEX idx_is_top (is_top),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帖子表';

CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL COMMENT '帖子ID',
  user_id INT NOT NULL COMMENT '评论者ID',
  content TEXT NOT NULL COMMENT '评论内容',
  parent_id INT DEFAULT 0 COMMENT '父评论ID（回复评论用）',
  status TINYINT DEFAULT 1 COMMENT '状态：0禁用/1启用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_post_id (post_id),
  INDEX idx_user_id (user_id),
  INDEX idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论表';

CREATE TABLE IF NOT EXISTS post_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL COMMENT '帖子ID',
  user_id INT NOT NULL COMMENT '用户ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_post_user (post_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帖子点赞表';
`;

const initDataSql = `
INSERT INTO news (title, summary, content, source, category, image, publish_time, views, likes) VALUES
('教育部发布最新教育改革方案', '教育部近日发布了《新时代教育评价改革总体方案》，旨在全面提升教育质量，推进素质教育。', '教育部近日发布了《新时代教育评价改革总体方案》，旨在全面提升教育质量，推进素质教育。方案提出，要坚持立德树人，培养德智体美劳全面发展的社会主义建设者和接班人。改革将聚焦教育公平、质量提升、教师队伍建设等关键领域。此次改革将重点推进以下几个方面：一是优化教育评价体系，扭转唯分数、唯升学的不良倾向；二是加强教师队伍建设，提高教师待遇；三是推进教育信息化，促进优质教育资源共享。教育部表示，将通过一系列政策措施，确保教育改革落到实处，让每个孩子都能享受到公平而有质量的教育。', '教育部官网', 'education', 'https://picsum.photos/seed/news1/200/200', DATE_SUB(NOW(), INTERVAL 2 HOUR), 2580, 320),
('AI技术助力个性化学习', '人工智能技术在教育领域的应用越来越广泛，正在深刻改变传统的教学模式。', '人工智能技术在教育领域的应用越来越广泛，正在深刻改变传统的教学模式。智能辅导系统、个性化学习推荐、智慧校园等创新应用层出不穷。通过大数据分析，系统可以精准了解每个学生的学习情况，提供个性化的学习方案。AI技术能够根据学生的学习进度和特点，自动调整教学内容和难度。专家表示，AI教育不仅能提高学习效率，还能培养学生的自主学习能力和创新思维。', '科技日报', 'technology', 'https://picsum.photos/seed/news2/200/200', DATE_SUB(NOW(), INTERVAL 5 HOUR), 1890, 256),
('新高考改革政策解读', '2024年新高考改革即将实施，考生和家长需要关注以下重要变化。', '2024年新高考改革即将实施，考生和家长需要关注以下重要变化。首先是选考科目改革，考生可以根据自己的兴趣和特长选择3门选考科目。其次是综合素质评价将纳入录取参考，注重考查学生的实践能力和创新精神。新高考更加注重学生的全面发展和综合素养。教育部门提醒广大考生和家长，要及时了解政策变化，做好备考准备。', '考试中心', 'policy', 'https://picsum.photos/seed/news3/200/200', DATE_SUB(NOW(), INTERVAL 8 HOUR), 3240, 412),
('在线教育平台用户突破千万', '随着互联网技术的发展，在线教育平台用户规模持续增长，近日突破千万大关。', '随着互联网技术的发展，在线教育平台用户规模持续增长，近日突破千万大关。在线教育的优势在于打破了时间和空间的限制，让优质教育资源能够惠及更多学生。无论是K12教育还是职业培训，在线教育都呈现出快速发展的态势。特别是在偏远地区，在线教育为孩子们打开了一扇通往知识的大门。', '教育新闻', 'education', 'https://picsum.photos/seed/news4/200/200', DATE_SUB(NOW(), INTERVAL 12 HOUR), 1560, 189),
('职业教育迎来发展新机遇', '职业教育近年来得到了国家的高度重视，迎来了发展的黄金时期。', '职业教育近年来得到了国家的高度重视，迎来了发展的黄金时期。产教融合、校企合作成为职业教育发展的新方向。许多职业院校与企业建立了深度合作关系，共同培养高素质技术技能人才。职业教育不再是"次等教育"，而是培养大国工匠的重要途径。', '中国教育报', 'policy', 'https://picsum.photos/seed/news5/200/200', DATE_SUB(NOW(), INTERVAL 1 DAY), 2100, 287),
('智慧校园建设全面升级', '智慧校园建设正在全国各地全面推进，数字化教学资源库建设已基本完成。', '智慧校园建设正在全国各地全面推进，数字化教学资源库建设已基本完成。智慧教室、智能图书馆、校园一卡通等信息化应用广泛普及。智慧校园不仅提升了教学效率，也为师生提供了更加便捷的学习和生活环境。未来，智慧校园将成为教育信息化的重要标志。', '新浪教育', 'technology', 'https://picsum.photos/seed/news6/200/200', DATE_SUB(NOW(), INTERVAL 1 DAY), 1780, 234),
('义务教育阶段减负政策落实', '义务教育阶段"双减"政策正在各地稳步推进，取得了显著成效。', '义务教育阶段"双减"政策正在各地稳步推进，取得了显著成效。学校严格控制作业总量和时长，确保学生有足够的时间进行体育锻炼和课外活动。减负不等于降低教育质量，而是要让学生在轻松愉快的氛围中成长。家长和社会也应转变观念，共同为孩子们创造健康的成长环境。', '教育部官网', 'education', 'https://picsum.photos/seed/news7/200/200', DATE_SUB(NOW(), INTERVAL 2 DAY), 4520, 567),
('高校创新创业教育取得新进展', '高校创新创业教育近年来取得了显著进展，孵化了众多优秀项目。', '高校创新创业教育近年来取得了显著进展，孵化了众多优秀项目。各高校纷纷建立创新创业学院，开设创新创业课程。通过创新创业教育，学生的创新精神和实践能力得到了有效培养。许多大学生创业项目已经走向市场，取得了良好的经济效益和社会效益。', '科技日报', 'technology', 'https://picsum.photos/seed/news8/200/200', DATE_SUB(NOW(), INTERVAL 2 DAY), 1450, 178),
('全国中小学开展素质教育活动', '全国中小学正在广泛开展素质教育活动，促进学生全面发展。', '全国中小学正在广泛开展素质教育活动，促进学生全面发展。各地学校纷纷开设丰富多彩的课程，包括艺术、体育、科学等多个领域。素质教育不仅注重知识传授，更注重培养学生的综合素质和核心素养。通过各种活动，学生的视野得到了拓宽，能力得到了提升。', '教育部官网', 'education', 'https://picsum.photos/seed/news9/200/200', DATE_SUB(NOW(), INTERVAL 3 DAY), 2890, 345),
('5G技术在教育领域的应用', '5G技术正在逐步应用于教育领域，为教育信息化带来新的机遇。', '5G技术正在逐步应用于教育领域，为教育信息化带来新的机遇。通过5G网络，远程教学可以更加流畅，互动更加便捷。5G技术的低延迟特性使得实时互动教学成为可能，学生可以与老师进行更加顺畅的沟通。未来，5G+教育将成为教育创新的重要方向。', '科技日报', 'technology', 'https://picsum.photos/seed/news10/200/200', DATE_SUB(NOW(), INTERVAL 3 DAY), 1920, 267),
('教育公平政策落地实施', '教育公平政策正在各地落地实施，让更多孩子享受到优质教育资源。', '教育公平政策正在各地落地实施，让更多孩子享受到优质教育资源。各地通过加强师资建设、改善办学条件、推进教育信息化等措施，缩小地区之间、城乡之间的教育差距。教育公平是社会公平的重要基础。只有让每个孩子都能接受良好的教育，才能实现真正的社会公平。', '考试中心', 'policy', 'https://picsum.photos/seed/news11/200/200', DATE_SUB(NOW(), INTERVAL 4 DAY), 3100, 389),
('教育信息化建设全面推进', '教育信息化建设正在全国范围内全面推进，数字化教学资源日益丰富。', '教育信息化建设正在全国范围内全面推进，数字化教学资源日益丰富。各地学校积极建设智慧教室、数字化图书馆等设施。教育信息化不仅改变了教学方式，也为教育均衡发展提供了技术支撑。通过互联网，优质教育资源可以辐射到偏远地区，让更多孩子受益。', '教育新闻', 'education', 'https://picsum.photos/seed/news12/200/200', DATE_SUB(NOW(), INTERVAL 5 DAY), 1670, 212),
('家庭教育指导服务体系逐步完善', '家庭教育指导服务体系正在逐步完善，为家长提供专业的育儿指导。', '家庭教育指导服务体系正在逐步完善，为家长提供专业的育儿指导。各地通过建立家庭教育指导中心、开展家长培训等方式，帮助家长树立科学的育儿观念，提高家庭教育水平。', '教育部官网', 'education', 'https://picsum.photos/seed/news13/200/200', DATE_SUB(NOW(), INTERVAL 6 DAY), 1230, 156),
('虚拟现实技术走进课堂', '虚拟现实技术正在走进课堂，为学生带来沉浸式学习体验。', '虚拟现实技术正在走进课堂，为学生带来沉浸式学习体验。通过VR设备，学生可以身临其境地感受历史场景、探索微观世界，大大提高了学习的趣味性和效果。', '科技日报', 'technology', 'https://picsum.photos/seed/news14/200/200', DATE_SUB(NOW(), INTERVAL 7 DAY), 2340, 312),
('职业教育发展规划发布', '国家发布了新的职业教育发展规划，推动职业教育高质量发展。', '国家发布了新的职业教育发展规划，推动职业教育高质量发展。规划提出了一系列政策措施，包括加强职业院校建设、深化产教融合、提高师资队伍水平等。', '中国教育报', 'policy', 'https://picsum.photos/seed/news15/200/200', DATE_SUB(NOW(), INTERVAL 8 DAY), 1890, 245),
('研究生入学考试复习攻略', '2024年研究生入学考试即将开始，为考生整理了详细的复习攻略。', '2024年研究生入学考试即将开始，为考生整理了详细的复习攻略。包括各科目的复习方法、时间安排、备考心态调整等方面的建议。', '考试中心', 'exam', 'https://picsum.photos/seed/news16/200/200', DATE_SUB(NOW(), INTERVAL 9 DAY), 4560, 567),
('校园安全教育工作全面加强', '各地学校全面加强校园安全教育工作，保障学生安全。', '各地学校全面加强校园安全教育工作，保障学生安全。通过开展安全演练、安全教育课程等方式，提高学生的安全意识和自我保护能力。', '教育部官网', 'education', 'https://picsum.photos/seed/news17/200/200', DATE_SUB(NOW(), INTERVAL 10 DAY), 1780, 223),
('大数据分析优化教学方案', '大数据分析技术正在优化教学方案，实现精准教学。', '大数据分析技术正在优化教学方案，实现精准教学。通过分析学生的学习数据，教师可以了解每个学生的学习情况，制定个性化的教学方案。', '科技日报', 'technology', 'https://picsum.photos/seed/news18/200/200', DATE_SUB(NOW(), INTERVAL 11 DAY), 1450, 189),
('民办教育促进法修订', '民办教育促进法修订草案正在征求意见，将进一步规范民办教育发展。', '民办教育促进法修订草案正在征求意见，将进一步规范民办教育发展。修订内容包括加强民办学校管理、保障师生权益、促进教育公平等方面。', '中国教育报', 'policy', 'https://picsum.photos/seed/news19/200/200', DATE_SUB(NOW(), INTERVAL 12 DAY), 2340, 289),
('大学英语四六级考试备考指南', '大学英语四六级考试备考指南，帮助考生高效备考。', '大学英语四六级考试备考指南，帮助考生高效备考。包括词汇积累、听力训练、阅读技巧、写作模板等方面的详细指导。', '考试中心', 'exam', 'https://picsum.photos/seed/news20/200/200', DATE_SUB(NOW(), INTERVAL 13 DAY), 3450, 412)
ON DUPLICATE KEY UPDATE views=views;

INSERT INTO users (openid, nickname, avatar, role, status) VALUES
('admin_openid', '管理员', '', 'admin', 1)
ON DUPLICATE KEY UPDATE nickname='管理员', role='admin';

INSERT INTO posts (user_id, title, content, category, is_top) VALUES
(1, '欢迎来到校园交流平台！', '欢迎大家来到我们的校园交流平台！这里可以分享学习心得、交流生活趣事、发布求职信息等。请文明发言，共同维护良好的交流环境。', 'general', 1),
(1, '期末复习攻略分享', '期末考试即将来临，给大家分享一些复习技巧：1. 制定复习计划；2. 整理课堂笔记；3. 多做练习题；4. 保持良好作息。祝大家考试顺利！', 'study', 0),
(1, '食堂新菜品推荐', '今天去食堂发现了几道新菜：红烧肉、蒜蓉西兰花、酸辣土豆丝，味道都很不错！推荐大家去尝尝！', 'life', 0),
(1, '校园招聘会通知', '下周五下午2点，学校将举办春季校园招聘会，届时将有50多家企业参加，有意向的同学请提前准备好简历。', 'job', 1)
ON DUPLICATE KEY UPDATE updated_at=NOW();
`;

async function initDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    
    // 分开创建每个表
    const tables = [
      `CREATE TABLE IF NOT EXISTS news (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        summary TEXT,
        content TEXT,
        source VARCHAR(100) DEFAULT '未知来源',
        url VARCHAR(500) DEFAULT '',
        publish_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        category VARCHAR(50) DEFAULT 'education',
        views INT DEFAULT 0,
        likes INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_publish_time (publish_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openid VARCHAR(255) UNIQUE NOT NULL,
        nickname VARCHAR(100) DEFAULT '',
        avatar VARCHAR(500) DEFAULT '',
        real_name VARCHAR(50) DEFAULT '',
        student_id VARCHAR(50) DEFAULT '',
        class_name VARCHAR(100) DEFAULT '',
        phone VARCHAR(20) DEFAULT '',
        email VARCHAR(100) DEFAULT '',
        role VARCHAR(20) DEFAULT 'student',
        status TINYINT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_openid (openid),
        INDEX idx_role (role),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      `CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        nickname VARCHAR(100) DEFAULT '',
        avatar TEXT,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        images TEXT,
        category VARCHAR(50) DEFAULT 'general',
        likes INT DEFAULT 0,
        comments INT DEFAULT 0,
        views INT DEFAULT 0,
        is_top TINYINT DEFAULT 0,
        status TINYINT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_category (category),
        INDEX idx_is_top (is_top),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      `CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        content TEXT NOT NULL,
        parent_id INT DEFAULT 0,
        status TINYINT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_post_id (post_id),
        INDEX idx_user_id (user_id),
        INDEX idx_parent_id (parent_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      `CREATE TABLE IF NOT EXISTS post_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_post_user (post_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      `CREATE TABLE IF NOT EXISTS post_collections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_post_user (post_id, user_id),
        INDEX idx_user_id (user_id),
        INDEX idx_post_id (post_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      
      `CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        type VARCHAR(20) DEFAULT 'like' COMMENT '消息类型：like/comment/follow',
        from_user_id INT COMMENT '来源用户ID',
        from_nickname VARCHAR(100) DEFAULT '' COMMENT '来源用户昵称',
        from_avatar VARCHAR(500) DEFAULT '' COMMENT '来源用户头像',
        content VARCHAR(255) DEFAULT '' COMMENT '消息内容',
        post_id INT DEFAULT 0 COMMENT '关联帖子ID',
        post_title VARCHAR(255) DEFAULT '' COMMENT '关联帖子标题',
        comment_content TEXT COMMENT '评论内容',
        \`read\` TINYINT DEFAULT 0 COMMENT '是否已读：0未读/1已读',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_read (\`read\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ];
    
    for (const tableSql of tables) {
      await connection.query(tableSql);
    }

    await ensureColumn(connection, 'news', 'image', 'TEXT');
    await ensureColumn(connection, 'posts', 'nickname', "VARCHAR(100) DEFAULT ''");
    await ensureColumn(connection, 'posts', 'avatar', 'TEXT');
    
    console.log('数据表创建成功！');
    
    const [newsCount] = await connection.query('SELECT COUNT(*) as count FROM news');
    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [postCount] = await connection.query('SELECT COUNT(*) as count FROM posts');
    
    if (newsCount[0].count === 0 && userCount[0].count === 0 && postCount[0].count === 0) {
      // 简化的初始化数据SQL
      const insertNewsSql = `INSERT INTO news (title, summary, content, source, category, views, likes) VALUES 
        ('教育部发布最新教育改革方案', '教育部近日发布了《新时代教育评价改革总体方案》，旨在全面提升教育质量，推进素质教育。', '教育部近日发布了《新时代教育评价改革总体方案》，旨在全面提升教育质量，推进素质教育。方案提出，要坚持立德树人，培养德智体美劳全面发展的社会主义建设者和接班人。', '教育部官网', 'education', 2580, 320),
        ('AI技术助力个性化学习', '人工智能技术在教育领域的应用越来越广泛，正在深刻改变传统的教学模式。', '人工智能技术在教育领域的应用越来越广泛，正在深刻改变传统的教学模式。智能辅导系统、个性化学习推荐、智慧校园等创新应用层出不穷。', '科技日报', 'technology', 1890, 256),
        ('新高考改革政策解读', '2024年新高考改革即将实施，考生和家长需要关注以下重要变化。', '2024年新高考改革即将实施，考生和家长需要关注以下重要变化。首先是选考科目改革，考生可以根据自己的兴趣和特长选择3门选考科目。', '考试中心', 'policy', 3240, 412)`;
      
      const insertUserSql = `INSERT INTO users (openid, nickname, role, status) VALUES 
        ('admin_openid', '管理员', 'admin', 1) 
        ON DUPLICATE KEY UPDATE nickname='管理员', role='admin'`;
      
      const insertPostSql = `INSERT INTO posts (user_id, title, content, category, is_top) VALUES 
        (1, '欢迎来到校园交流平台！', '欢迎大家来到我们的校园交流平台！这里可以分享学习心得、交流生活趣事、发布求职信息等。请文明发言，共同维护良好的交流环境。', 'general', 1),
        (1, '期末复习攻略分享', '期末考试即将来临，给大家分享一些复习技巧：1. 制定复习计划；2. 整理课堂笔记；3. 多做练习题；4. 保持良好作息。祝大家考试顺利！', 'study', 0)`;
      
      await connection.query(insertNewsSql);
      await connection.query(insertUserSql);
      await connection.query(insertPostSql);
      console.log('初始数据插入成功！');
    } else {
      console.log(`数据库已有 ${newsCount[0].count} 条新闻, ${userCount[0].count} 个用户, ${postCount[0].count} 条帖子`);
    }
    
    connection.release();
    console.log('MySQL数据库连接成功！');
    return true;
  } catch (error) {
    console.error('MySQL数据库连接/初始化失败:', error.message);
    return false;
  }
}

async function getNewsList(page = 1, pageSize = 10) {
  try {
    page = parsePositiveInt(page, 1, 100000);
    pageSize = parsePositiveInt(pageSize, 10, 50);
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query('SELECT * FROM news ORDER BY publish_time DESC LIMIT ? OFFSET ?', [pageSize, offset]);
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM news');
    return { list: rows, total: countResult[0].total, has_more: offset + rows.length < countResult[0].total };
  } catch (error) {
    console.error('获取新闻列表失败:', error.message);
    return null;
  }
}

async function ensureColumn(connection, tableName, columnName, columnDefinition) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [dbConfig.database, tableName, columnName]
  );

  if (rows[0].count === 0) {
    await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
  }
}

async function getNewsDetail(id) {
  try {
    const [rows] = await pool.query('SELECT * FROM news WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('获取新闻详情失败:', error.message);
    return null;
  }
}

async function getUserByOpenid(openid) {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE openid = ?', [openid]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('获取用户失败:', error.message);
    return null;
  }
}

async function getUserById(id) {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('获取用户失败:', error.message);
    return null;
  }
}

async function createUser(userData) {
  try {
    const { openid, nickname, avatar, real_name, student_id, class_name, phone, email } = userData;
    const [result] = await pool.query(
      'INSERT INTO users (openid, nickname, avatar, real_name, student_id, class_name, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nickname=?, avatar=?, real_name=?, student_id=?, class_name=?, phone=?, email=?',
      [openid, nickname, avatar, real_name, student_id, class_name, phone, email, nickname, avatar, real_name, student_id, class_name, phone, email]
    );
    return result.insertId || (await getUserByOpenid(openid)).id;
  } catch (error) {
    console.error('创建用户失败:', error.message);
    return null;
  }
}

async function updateUser(id, userData) {
  try {
    const { nickname, avatar, real_name, student_id, class_name, phone, email, status } = userData;
    await pool.query(
      'UPDATE users SET nickname=?, avatar=?, real_name=?, student_id=?, class_name=?, phone=?, email=?, status=? WHERE id = ?',
      [nickname, avatar, real_name, student_id, class_name, phone, email, status, id]
    );
    return true;
  } catch (error) {
    console.error('更新用户失败:', error.message);
    return false;
  }
}

async function getUsers(page = 1, pageSize = 10, role = '') {
  try {
    const offset = (page - 1) * pageSize;
    let query = 'SELECT * FROM users';
    let params = [];
    
    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);
    
    const [rows] = await pool.query(query, params);
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM users' + (role ? ' WHERE role = ?' : ''), role ? [role] : []);
    
    return { list: rows, total: countResult[0].total };
  } catch (error) {
    console.error('获取用户列表失败:', error.message);
    return null;
  }
}

async function deleteUser(id) {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('删除用户失败:', error.message);
    return false;
  }
}

async function createPost(postData) {
  try {
    const { user_id, title, content, images, category } = postData;
    const [result] = await pool.query(
      'INSERT INTO posts (user_id, title, content, images, category) VALUES (?, ?, ?, ?, ?)',
      [user_id, title, content, images || '', category || 'general']
    );
    return result.insertId;
  } catch (error) {
    console.error('创建帖子失败:', error.message);
    return null;
  }
}

async function getPosts(page = 1, pageSize = 10, category = '') {
  try {
    const offset = (page - 1) * pageSize;
    let query = 'SELECT p.*, u.nickname, u.avatar FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE p.status = 1';
    let params = [];
    
    if (category && category !== 'all') {
      query += ' AND p.category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY p.is_top DESC, p.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);
    
    const [rows] = await pool.query(query, params);
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM posts WHERE status = 1' + (category && category !== 'all' ? ' AND category = ?' : ''),
      category && category !== 'all' ? [category] : []
    );
    
    return { list: rows, total: countResult[0].total, has_more: offset + rows.length < countResult[0].total };
  } catch (error) {
    console.error('获取帖子列表失败:', error.message);
    return null;
  }
}

async function getPostDetail(id) {
  try {
    await pool.query('UPDATE posts SET views = views + 1 WHERE id = ?', [id]);
    const [rows] = await pool.query(
      `SELECT p.*,
        COALESCE(NULLIF(p.nickname, ''), u.nickname) AS nickname,
        COALESCE(NULLIF(p.avatar, ''), u.avatar) AS avatar,
        (SELECT COUNT(*) FROM post_collections pc WHERE pc.post_id = p.id) AS collects
       FROM posts p LEFT JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('获取帖子详情失败:', error.message);
    return null;
  }
}

async function updatePost(id, postData) {
  try {
    const { title, content, images, category, is_top, status } = postData;
    await pool.query(
      'UPDATE posts SET title=?, content=?, images=?, category=?, is_top=?, status=? WHERE id = ?',
      [title, content, images || '', category || 'general', is_top || 0, status || 1, id]
    );
    return true;
  } catch (error) {
    console.error('更新帖子失败:', error.message);
    return false;
  }
}

async function deletePost(id) {
  try {
    await pool.query('DELETE FROM posts WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('删除帖子失败:', error.message);
    return false;
  }
}

async function togglePostLike(postId, userId) {
  try {
    const [existing] = await pool.query('SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
    
    if (existing.length > 0) {
      await pool.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
      await pool.query('UPDATE posts SET likes = likes - 1 WHERE id = ?', [postId]);
      return { liked: false };
    } else {
      await pool.query('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
      await pool.query('UPDATE posts SET likes = likes + 1 WHERE id = ?', [postId]);
      return { liked: true };
    }
  } catch (error) {
    console.error('点赞失败:', error.message);
    return null;
  }
}

async function togglePostCollection(postId, userId) {
  try {
    const [existing] = await pool.query(
      'SELECT id FROM post_collections WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );

    let collected;
    if (existing.length > 0) {
      await pool.query('DELETE FROM post_collections WHERE post_id = ? AND user_id = ?', [postId, userId]);
      collected = false;
    } else {
      await pool.query('INSERT INTO post_collections (post_id, user_id) VALUES (?, ?)', [postId, userId]);
      collected = true;
    }

    const [countResult] = await pool.query('SELECT COUNT(*) as collects FROM post_collections WHERE post_id = ?', [postId]);
    return { collected, collects: countResult[0].collects };
  } catch (error) {
    console.error('收藏操作失败:', error.message);
    return null;
  }
}

async function getUserCollections(userId, page = 1, pageSize = 20) {
  try {
    page = parsePositiveInt(page, 1, 100000);
    pageSize = parsePositiveInt(pageSize, 20, 50);
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      `SELECT p.*, c.created_at AS collected_at,
        COALESCE(NULLIF(p.nickname, ''), u.nickname) AS nickname,
        COALESCE(NULLIF(p.avatar, ''), u.avatar) AS avatar,
        (SELECT COUNT(*) FROM post_collections pc WHERE pc.post_id = p.id) AS collects
       FROM post_collections c
       JOIN posts p ON c.post_id = p.id
       LEFT JOIN users u ON p.user_id = u.id
       WHERE c.user_id = ? AND p.status = 1
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM post_collections WHERE user_id = ?', [userId]);
    return { list: rows, total: countResult[0].total };
  } catch (error) {
    console.error('获取收藏失败:', error.message);
    return null;
  }
}

async function createComment(commentData) {
  try {
    const { post_id, user_id, content, parent_id } = commentData;
    const [result] = await pool.query(
      'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
      [post_id, user_id, content, parent_id || 0]
    );
    await pool.query('UPDATE posts SET comments = comments + 1 WHERE id = ?', [post_id]);
    return result.insertId;
  } catch (error) {
    console.error('创建评论失败:', error.message);
    return null;
  }
}

async function getComments(postId, page = 1, pageSize = 20) {
  try {
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      'SELECT c.*, u.nickname, u.avatar FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.post_id = ? AND c.status = 1 ORDER BY c.created_at ASC LIMIT ? OFFSET ?',
      [postId, pageSize, offset]
    );
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM comments WHERE post_id = ? AND status = 1', [postId]);
    return { list: rows, total: countResult[0].total };
  } catch (error) {
    console.error('获取评论失败:', error.message);
    return null;
  }
}

async function deleteComment(id) {
  try {
    const [comment] = await pool.query('SELECT post_id FROM comments WHERE id = ?', [id]);
    if (comment.length > 0) {
      await pool.query('UPDATE posts SET comments = comments - 1 WHERE id = ?', [comment[0].post_id]);
    }
    await pool.query('DELETE FROM comments WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('删除评论失败:', error.message);
    return false;
  }
}

async function getMessages(userId, type = '') {
  try {
    let query = 'SELECT * FROM messages WHERE user_id = ?';
    let params = [userId];
    
    if (type && type !== 'all') {
      query += ' AND type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await pool.query(query, params);
    return rows;
  } catch (error) {
    console.error('获取消息失败:', error.message);
    return null;
  }
}

async function createMessage(messageData) {
  try {
    const { user_id, type, from_user_id, from_nickname, from_avatar, content, post_id, post_title, comment_content } = messageData;
    const [result] = await pool.query(
      'INSERT INTO messages (user_id, type, from_user_id, from_nickname, from_avatar, content, post_id, post_title, comment_content) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, type || 'like', from_user_id || 0, from_nickname || '', from_avatar || '', content || '', post_id || 0, post_title || '', comment_content || '']
    );
    return result.insertId;
  } catch (error) {
    console.error('创建消息失败:', error.message);
    return null;
  }
}

async function markMessagesAsRead(userId) {
  try {
    await pool.query('UPDATE messages SET `read` = 1 WHERE user_id = ?', [userId]);
    return true;
  } catch (error) {
    console.error('标记消息已读失败:', error.message);
    return false;
  }
}

async function getUnreadCount(userId) {
  try {
    const [result] = await pool.query('SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND `read` = 0', [userId]);
    return result[0].count;
  } catch (error) {
    console.error('获取未读消息数失败:', error.message);
    return 0;
  }
}

async function getStatistics() {
  try {
    const [newsCount] = await pool.query('SELECT COUNT(*) as count FROM news');
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [postCount] = await pool.query('SELECT COUNT(*) as count FROM posts WHERE status = 1');
    const [commentCount] = await pool.query('SELECT COUNT(*) as count FROM comments WHERE status = 1');
    return { news: newsCount[0].count, users: userCount[0].count, posts: postCount[0].count, comments: commentCount[0].count };
  } catch (error) {
    console.error('获取统计数据失败:', error.message);
    return null;
  }
}

app.get('/api/news/list', async (req, res) => {
  const result = await getNewsList(parseInt(req.query.page) || 1, parseInt(req.query.page_size) || 20);
  res.json(result ? { code: 200, message: 'success', data: result } : { code: 500, message: '获取失败', data: null });
});

app.get('/api/news/detail/:id', async (req, res) => {
  const news = await getNewsDetail(parseInt(req.params.id));
  res.json(news ? { code: 200, message: 'success', data: news } : { code: 404, message: '新闻不存在', data: null });
});

app.post('/api/news/create', async (req, res) => {
  const { title, summary, content, source, category } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO news (title, summary, content, source, category) VALUES (?, ?, ?, ?, ?)',
      [title, summary, content, source || '未知来源', category || 'education']
    );
    res.json({ code: 200, message: '创建成功', data: { id: result.insertId } });
  } catch (error) {
    res.json({ code: 500, message: '创建失败', data: null });
  }
});

app.post('/api/news/update/:id', async (req, res) => {
  try {
    // 先查询现有数据
    const [existing] = await pool.query('SELECT * FROM news WHERE id = ?', [req.params.id]);
    if (!existing || existing.length === 0) {
      return res.json({ code: 404, message: '新闻不存在', data: null });
    }
    
    const { title, summary, content, source, category, image, views, likes } = req.body;
    const current = existing[0];
    
    // 合并新旧数据，只更新提供的字段
    await pool.query(
      'UPDATE news SET title=?, summary=?, content=?, source=?, category=?, image=?, views=?, likes=? WHERE id = ?',
      [
        title !== undefined ? title : current.title,
        summary !== undefined ? summary : current.summary,
        content !== undefined ? content : current.content,
        source !== undefined ? source : current.source,
        category !== undefined ? category : current.category,
        image !== undefined ? image : (current.image || ''),
        views !== undefined ? views : current.views,
        likes !== undefined ? likes : current.likes,
        req.params.id
      ]
    );
    res.json({ code: 200, message: '更新成功', data: null });
  } catch (error) {
    console.error('更新新闻失败:', error.message);
    res.json({ code: 500, message: '更新失败', data: null });
  }
});

app.post('/api/news/delete/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM news WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '删除成功', data: null });
  } catch (error) {
    res.json({ code: 500, message: '删除失败', data: null });
  }
});

app.get('/api/news/count', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT COUNT(*) as count FROM news');
    res.json({ code: 200, message: 'success', data: { count: result[0].count } });
  } catch (error) {
    res.json({ code: 500, message: '获取失败', data: null });
  }
});

app.post('/api/assistant/chat', async (req, res) => {
  const apiKey = process.env.ASSISTANT_API_KEY;
  const apiUrl = process.env.ASSISTANT_API_URL;
  const message = getRequiredString(req.body.message);
  const messages = Array.isArray(req.body.messages) ? req.body.messages : [];

  if (!message) {
    return res.json({ code: 400, message: '请输入消息内容', data: null });
  }

  if (!apiKey || !apiUrl) {
    return res.json({
      code: 503,
      message: '智能助手暂未配置，请联系管理员设置服务端环境变量',
      data: null
    });
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.ASSISTANT_MODEL || 'chat-model',
        messages: [
          {
            role: 'system',
            content: '你是校园学习交流平台的智能助手。请用简洁、友好、可靠的中文回答学生关于校园服务、学习、时间安排和平台使用的问题。'
          },
          ...messages.slice(-10),
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.json({ code: response.status, message: data.error?.message || '智能助手调用失败', data: null });
    }

    const reply = data.choices?.[0]?.message?.content;
    if (!reply) {
      return res.json({ code: 502, message: '智能助手返回为空', data: null });
    }

    return res.json({ code: 200, message: 'success', data: { reply } });
  } catch (error) {
    console.error('智能助手调用失败:', error.message);
    return res.json({ code: 500, message: '智能助手服务异常', data: null });
  }
});

app.post('/api/user/login', async (req, res) => {
  const { openid, nickname, avatar } = req.body;
  if (!openid) {
    return res.json({ code: 400, message: '缺少openid', data: null });
  }
  let user = await getUserByOpenid(openid);
  
  if (!user) {
    const userId = await createUser({ openid, nickname, avatar });
    user = await getUserByOpenid(openid);
  } else if (user.nickname !== nickname || user.avatar !== avatar) {
    await updateUser(user.id, { ...user, nickname, avatar });
    user = await getUserByOpenid(openid);
  }
  
  res.json(user ? { code: 200, message: 'success', data: user } : { code: 500, message: '登录失败', data: null });
});

app.post('/api/user/update', async (req, res) => {
  const { id, nickname, avatar, real_name, student_id, class_name, phone, email } = req.body;
  if (!id) {
    return res.json({ code: 400, message: '缺少用户ID', data: null });
  }

  const existing = await getUserById(id);
  if (!existing) {
    return res.json({ code: 404, message: '用户不存在', data: null });
  }

  const success = await updateUser(id, {
    nickname: nickname !== undefined ? nickname : existing.nickname,
    avatar: avatar !== undefined ? avatar : existing.avatar,
    real_name: real_name !== undefined ? real_name : existing.real_name,
    student_id: student_id !== undefined ? student_id : existing.student_id,
    class_name: class_name !== undefined ? class_name : existing.class_name,
    phone: phone !== undefined ? phone : existing.phone,
    email: email !== undefined ? email : existing.email,
    status: existing.status
  });
  res.json(success ? { code: 200, message: '更新成功', data: null } : { code: 500, message: '更新失败', data: null });
});

app.get('/api/users', async (req, res) => {
  const result = await getUsers(parseInt(req.query.page) || 1, parseInt(req.query.page_size) || 10, req.query.role);
  res.json(result ? { code: 200, message: 'success', data: result } : { code: 500, message: '获取失败', data: null });
});

app.post('/api/user/delete/:id', async (req, res) => {
  const success = await deleteUser(req.params.id);
  res.json(success ? { code: 200, message: '删除成功', data: null } : { code: 500, message: '删除失败', data: null });
});

app.post('/api/user/status/:id', async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ code: 200, message: '操作成功', data: null });
  } catch (error) {
    res.json({ code: 500, message: '操作失败', data: null });
  }
});

app.post('/api/admin/users/delete/:id', async (req, res) => {
  const userId = req.params.id;
  console.log('=== 删除用户请求 ===');
  console.log('用户ID:', userId);
  try {
    const [commentsResult] = await pool.query('DELETE FROM comments WHERE user_id = ?', [userId]);
    console.log('删除评论:', commentsResult.affectedRows);
    const [postsResult] = await pool.query('DELETE FROM posts WHERE user_id = ?', [userId]);
    console.log('删除帖子:', postsResult.affectedRows);
    const [usersResult] = await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    console.log('删除用户:', usersResult.affectedRows);
    if (usersResult.affectedRows > 0) {
      res.json({ code: 200, message: '删除成功', data: null });
    } else {
      res.json({ code: 404, message: '用户不存在', data: null });
    }
  } catch (error) {
    console.error('删除用户失败:', error);
    res.json({ code: 500, message: '删除失败: ' + error.message, data: null });
  }
});

app.post('/api/user/update', async (req, res) => {
  console.log('=== 更新用户信息请求 ===');
  console.log('请求体:', req.body);
  
  const { id, nickname, avatar } = req.body;
  
  if (!id) {
    return res.json({ code: 400, message: '缺少用户ID', data: null });
  }
  
  try {
    await pool.query(
      'UPDATE users SET nickname=?, avatar=? WHERE id = ?',
      [nickname || '', avatar || '', id]
    );
    
    console.log('=== 用户信息更新成功 ===');
    res.json({ code: 200, message: '更新成功', data: null });
  } catch (error) {
    console.error('=== 更新用户信息失败 ===');
    console.error('错误信息:', error.message);
    res.json({ code: 500, message: '更新失败: ' + error.message, data: null });
  }
});

app.post('/api/user/login', async (req, res) => {
  console.log('=== 用户登录请求 ===');
  console.log('请求体:', req.body);
  
  const { openid, nickname, avatar } = req.body;
  
  if (!openid) {
    return res.json({ code: 400, message: '缺少openid', data: null });
  }
  
  try {
    let user = await getUserByOpenid(openid);
    
    if (user) {
      if (nickname || avatar) {
        await updateUser(user.id, {
          nickname: nickname || user.nickname,
          avatar: avatar || user.avatar,
          real_name: user.real_name,
          student_id: user.student_id,
          class_name: user.class_name,
          phone: user.phone,
          email: user.email,
          status: user.status
        });
        user = await getUserByOpenid(openid);
      }
      console.log('=== 用户已存在，登录成功 ===');
      return res.json({ code: 200, message: '登录成功', data: user });
    } else {
      const userId = await createUser({
        openid,
        nickname: nickname || '用户',
        avatar: avatar || '',
        real_name: '',
        student_id: '',
        class_name: '',
        phone: '',
        email: ''
      });
      
      if (userId) {
        user = await getUserByOpenid(openid);
        console.log('=== 用户创建成功，ID:', userId, '===');
        return res.json({ code: 200, message: '注册成功', data: user });
      } else {
        return res.json({ code: 500, message: '创建用户失败', data: null });
      }
    }
  } catch (error) {
    console.error('=== 用户登录失败 ===');
    console.error('错误信息:', error.message);
    return res.json({ code: 500, message: '登录失败: ' + error.message, data: null });
  }
});

app.post('/api/post/create', async (req, res) => {
  console.log('=== 收到创建帖子请求 ===');
  console.log('请求体:', req.body);
  
  const { title, content, category, images, user_id, nickname, avatar } = req.body;

  if (!getRequiredString(title) || !getRequiredString(content)) {
    return res.json({ code: 400, message: '标题和内容不能为空', data: null });
  }
  
  console.log('参数解析:');
  console.log('  - title:', title);
  console.log('  - content:', content);
  console.log('  - category:', category);
  console.log('  - user_id:', user_id);
  console.log('  - nickname:', nickname);
  console.log('  - avatar:', avatar);
  console.log('  - images:', images ? images.substring(0, 200) + '...' : '[]');
  
  try {
    const [result] = await pool.query(
      'INSERT INTO posts (user_id, nickname, avatar, title, content, category, images) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id || 1, nickname || '用户', avatar || '/images/default-avatar.png', title, content, category || 'general', images || '[]']
    );
    console.log('=== 帖子创建成功，ID:', result.insertId, '===');
    res.json({ code: 200, message: '发布成功', data: { id: result.insertId } });
  } catch (error) {
    console.error('=== 创建帖子失败 ===');
    console.error('错误信息:', error.message);
    console.error('完整错误:', error);
    res.json({ code: 500, message: '发布失败: ' + error.message, data: null });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1, 100000);
    const pageSize = parsePositiveInt(req.query.page_size, 10, 50);
    const category = req.query.category;
    const userId = req.query.user_id;
    const isAdmin = req.query.admin === 'true';
    
    const offset = (page - 1) * pageSize;
    
    let query = `SELECT p.*,
      COALESCE(NULLIF(p.nickname, ''), u.nickname) AS nickname,
      COALESCE(NULLIF(p.avatar, ''), u.avatar) AS avatar,
      (SELECT COUNT(*) FROM post_collections pc WHERE pc.post_id = p.id) AS collects
      FROM posts p LEFT JOIN users u ON p.user_id = u.id`;
    let countQuery = 'SELECT COUNT(*) as total FROM posts';
    let params = [];
    let countParams = [];
    
    if (!isAdmin) {
      query += ' WHERE p.status = 1';
      countQuery += ' WHERE status = 1';
    }
    
    if (category && category !== 'all' && category !== '') {
      if (isAdmin) {
        query += ' WHERE';
        countQuery += ' WHERE';
      } else {
        query += ' AND';
        countQuery += ' AND';
      }
      query += ' p.category = ?';
      countQuery += ' category = ?';
      params.push(category);
      countParams.push(category);
    }

    if (userId) {
      if (query.includes(' WHERE')) {
        query += ' AND';
        countQuery += ' AND';
      } else {
        query += ' WHERE';
        countQuery += ' WHERE';
      }
      query += ' p.user_id = ?';
      countQuery += ' user_id = ?';
      params.push(userId);
      countParams.push(userId);
    }
    
    if (isAdmin) {
      query += ' ORDER BY p.id ASC';
    } else {
      query += ' ORDER BY p.is_top DESC, p.created_at DESC';
    }
    
    query += ' LIMIT ? OFFSET ?';
    params.push(pageSize, offset);
    
    const [rows] = await pool.query(query, params);
    const [countResult] = await pool.query(countQuery, countParams);
    
    res.json({ 
      code: 200, 
      message: 'success', 
      data: { list: rows, total: countResult[0].total } 
    });
  } catch (error) {
    console.error('获取帖子列表失败:', error);
    res.json({ code: 500, message: '获取失败: ' + error.message, data: null });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  const post = await getPostDetail(req.params.id);
  res.json(post ? { code: 200, message: 'success', data: post } : { code: 404, message: '帖子不存在', data: null });
});

app.post('/api/reset-post-ids', async (req, res) => {
  try {
    console.log('=== 开始重置帖子ID ===');
    const connection = await pool.getConnection();
    
    await connection.beginTransaction();
    
    try {
      const [posts] = await connection.query('SELECT * FROM posts ORDER BY id ASC');
      console.log('找到帖子数量:', posts.length);
      
      if (posts.length === 0) {
        await connection.commit();
        connection.release();
        return res.json({ code: 200, message: '没有帖子需要重置', data: null });
      }
      
      await connection.query('DELETE FROM posts');
      console.log('已删除所有帖子');
      
      await connection.query('ALTER TABLE posts AUTO_INCREMENT = 1');
      console.log('已重置自增ID为1');
      
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        await connection.query(
          'INSERT INTO posts (user_id, title, content, images, category, likes, comments, views, is_top, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [post.user_id, post.title, post.content, post.images, post.category, post.likes, post.comments, post.views, post.is_top, post.status, post.created_at, post.updated_at]
        );
        console.log(`已重新插入帖子 ${i + 1}/${posts.length}`);
      }
      
      await connection.commit();
      connection.release();
      
      console.log('=== 帖子ID重置成功 ===');
      res.json({ code: 200, message: '帖子ID重置成功', data: { count: posts.length } });
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('重置事务失败:', error);
      throw error;
    }
  } catch (error) {
    console.error('重置帖子ID失败:', error);
    res.json({ code: 500, message: '重置失败: ' + error.message, data: null });
  }
});

app.get('/api/post/detail/:id', async (req, res) => {
  const post = await getPostDetail(req.params.id);
  res.json(post ? { code: 200, message: 'success', data: post } : { code: 404, message: '帖子不存在', data: null });
});

app.post('/api/post/update/:id', async (req, res) => {
  const { title, content, images, category, is_top, status } = req.body;
  const success = await updatePost(req.params.id, { title, content, images, category, is_top, status });
  res.json(success ? { code: 200, message: '更新成功', data: null } : { code: 500, message: '更新失败', data: null });
});

app.post('/api/post/delete/:id', async (req, res) => {
  const success = await deletePost(req.params.id);
  res.json(success ? { code: 200, message: '删除成功', data: null } : { code: 500, message: '删除失败', data: null });
});

app.post('/api/post/like', async (req, res) => {
  const { post_id, user_id } = req.body;
  const result = await togglePostLike(post_id, user_id);
  res.json(result ? { code: 200, message: 'success', data: result } : { code: 500, message: '操作失败', data: null });
});

app.post('/api/post/collect', async (req, res) => {
  const { post_id, user_id } = req.body;
  if (!post_id || !user_id) {
    return res.json({ code: 400, message: '缺少帖子ID或用户ID', data: null });
  }
  const result = await togglePostCollection(post_id, user_id);
  res.json(result ? { code: 200, message: 'success', data: result } : { code: 500, message: '操作失败', data: null });
});

app.get('/api/collections/list', async (req, res) => {
  const userId = parseInt(req.query.user_id, 10);
  if (!userId) {
    return res.json({ code: 400, message: '缺少用户ID', data: null });
  }
  const result = await getUserCollections(userId, req.query.page, req.query.page_size);
  res.json(result ? { code: 200, message: 'success', data: result } : { code: 500, message: '获取失败', data: null });
});

app.post('/api/comment/create', async (req, res) => {
  const { post_id, user_id, content, parent_id } = req.body;
  const commentId = await createComment({ post_id, user_id, content, parent_id });
  res.json(commentId ? { code: 200, message: '评论成功', data: { id: commentId } } : { code: 500, message: '评论失败', data: null });
});

app.get('/api/comments/:postId', async (req, res) => {
  const result = await getComments(req.params.postId, parseInt(req.query.page) || 1, parseInt(req.query.page_size) || 20);
  res.json(result ? { code: 200, message: 'success', data: result } : { code: 500, message: '获取失败', data: null });
});

app.get('/api/comment/list', async (req, res) => {
  const postId = req.query.post_id;
  if (!postId) {
    return res.json({ code: 400, message: '缺少帖子ID', data: null });
  }
  const result = await getComments(postId, parsePositiveInt(req.query.page, 1, 100000), parsePositiveInt(req.query.page_size, 20, 50));
  res.json(result ? { code: 200, message: 'success', data: result.list } : { code: 500, message: '获取失败', data: null });
});

app.post('/api/comment/delete/:id', async (req, res) => {
  const success = await deleteComment(req.params.id);
  res.json(success ? { code: 200, message: '删除成功', data: null } : { code: 500, message: '删除失败', data: null });
});

app.get('/api/statistics', async (req, res) => {
  const stats = await getStatistics();
  res.json(stats ? { code: 200, message: 'success', data: stats } : { code: 500, message: '获取失败', data: null });
});

app.get('/api/messages/list', async (req, res) => {
  const userId = parseInt(req.query.user_id) || 1;
  const type = req.query.type || '';
  
  const messages = await getMessages(userId, type);
  
  if (messages !== null) {
    const processedMessages = messages.map(msg => ({
      id: msg.id,
      type: msg.type,
      avatar: msg.from_avatar || `/images/avatar${(msg.from_user_id % 4) + 1}.png`,
      nickname: msg.from_nickname || '用户',
      content: msg.content,
      postTitle: msg.post_title || '',
      commentContent: msg.comment_content || '',
      time: formatMessageTime(msg.created_at),
      read: msg.read === 1
    }));
    
    res.json({ code: 200, message: 'success', data: { list: processedMessages } });
  } else {
    res.json({ code: 500, message: '获取消息失败', data: null });
  }
});

app.post('/api/messages/create', async (req, res) => {
  const { user_id, type, from_user_id, from_nickname, from_avatar, content, post_id, post_title, comment_content } = req.body;
  
  const messageId = await createMessage({
    user_id: user_id || 1,
    type,
    from_user_id,
    from_nickname,
    from_avatar,
    content,
    post_id,
    post_title,
    comment_content
  });
  
  res.json(messageId ? { code: 200, message: '创建成功', data: { id: messageId } } : { code: 500, message: '创建失败', data: null });
});

app.post('/api/messages/read', async (req, res) => {
  const userId = parseInt(req.body.user_id) || 1;
  const success = await markMessagesAsRead(userId);
  res.json(success ? { code: 200, message: '标记成功', data: null } : { code: 500, message: '标记失败', data: null });
});

app.get('/api/messages/unread', async (req, res) => {
  const userId = parseInt(req.query.user_id) || 1;
  const count = await getUnreadCount(userId);
  res.json({ code: 200, message: 'success', data: { count } });
});

function formatMessageTime(dateStr) {
  if (!dateStr) return '刚刚';
  
  const now = new Date();
  const msgDate = new Date(dateStr);
  const diffMs = now - msgDate;
  const diffSeconds = Math.floor(diffMs / 1000);
  
  if (diffSeconds < 60) return '刚刚';
  if (diffSeconds < 3600) return Math.floor(diffSeconds / 60) + '分钟前';
  if (diffSeconds < 86400) return Math.floor(diffSeconds / 3600) + '小时前';
  return Math.floor(diffSeconds / 86400) + '天前';
}

app.get('/api/news/count', async (req, res) => {
  const [result] = await pool.query('SELECT COUNT(*) as count FROM news');
  res.json({ code: 200, message: 'success', data: { count: result[0].count } });
});

app.post('/api/news/refresh', async (req, res) => {
  try {
    await pool.query('DELETE FROM news WHERE publish_time < DATE_SUB(NOW(), INTERVAL 7 DAY)');
    const [result] = await pool.query('SELECT COUNT(*) as count FROM news');
    res.json({ code: 200, message: '刷新成功', data: { count: result[0].count } });
  } catch (error) {
    res.json({ code: 500, message: '刷新失败', data: null });
  }
});

app.use(express.static(path.join(__dirname, 'admin')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get('/', (req, res) => {
  res.redirect('/admin');
});

async function startServer() {
  const ok = await initDatabase();
  if (!ok) {
    console.error('数据库初始化失败，服务未启动。请检查 DB_HOST、DB_USER、DB_PASSWORD、DB_NAME 配置。');
    process.exit(1);
  }
  app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    console.log('管理后台: http://localhost:${port}/admin');
    console.log('API接口:');
    console.log('  新闻: GET /api/news/list, GET /api/news/detail/:id');
    console.log('  用户: POST /api/user/login, GET /api/users');
    console.log('  帖子: POST /api/post/create, GET /api/posts');
    console.log('  评论: POST /api/comment/create, GET /api/comments/:postId');
    console.log('  统计: GET /api/statistics');
  });
}

startServer();
