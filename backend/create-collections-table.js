const mysql = require('mysql2/promise');
require('dotenv').config({ quiet: true });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'news_db'
};

async function createCollectionsTable() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('=== 开始创建收藏表 ===');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS collections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        post_id INT NOT NULL COMMENT '帖子ID',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_collection (user_id, post_id),
        INDEX idx_user_id (user_id),
        INDEX idx_post_id (post_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收藏表'
    `);
    console.log('✓ 收藏表创建成功');

    console.log('=== 完成 ===');
  } catch (error) {
    console.error('=== 创建失败 ===');
    console.error('错误信息:', error.message);
  } finally {
    await connection.end();
  }
}

createCollectionsTable();
