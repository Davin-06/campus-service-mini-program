-- 创建用户表
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

-- 创建帖子表
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
  INDEX idx_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帖子表';

-- 创建评论表
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
  INDEX idx_parent_id (parent_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论表';

-- 创建帖子点赞表
CREATE TABLE IF NOT EXISTS post_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL COMMENT '帖子ID',
  user_id INT NOT NULL COMMENT '用户ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_post_user (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帖子点赞表';

-- 创建管理员账号
INSERT INTO users (openid, nickname, avatar, role, status) VALUES
('admin_openid', '管理员', '', 'admin', 1)
ON DUPLICATE KEY UPDATE nickname='管理员', role='admin';

-- 插入示例帖子
INSERT INTO posts (user_id, title, content, category, is_top) VALUES
(1, '欢迎来到校园交流平台！', '欢迎大家来到我们的校园交流平台！这里可以分享学习心得、交流生活趣事、发布求职信息等。请文明发言，共同维护良好的交流环境。', 'general', 1),
(1, '期末复习攻略分享', '期末考试即将来临，给大家分享一些复习技巧：1. 制定复习计划；2. 整理课堂笔记；3. 多做练习题；4. 保持良好作息。祝大家考试顺利！', 'study', 0),
(1, '食堂新菜品推荐', '今天去食堂发现了几道新菜：红烧肉、蒜蓉西兰花、酸辣土豆丝，味道都很不错！推荐大家去尝尝！', 'life', 0),
(1, '校园招聘会通知', '下周五下午2点，学校将举办春季校园招聘会，届时将有50多家企业参加，有意向的同学请提前准备好简历。', 'job', 1);