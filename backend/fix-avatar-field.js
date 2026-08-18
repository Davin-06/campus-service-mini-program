const mysql = require('mysql2/promise');
require('dotenv').config({ quiet: true });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'news_db'
};

async function fixAvatarField() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('=== 开始修复 avatar 字段 ===');

    await connection.execute(
      "ALTER TABLE users MODIFY COLUMN avatar TEXT COMMENT '头像URL'"
    );
    console.log('✓ users.avatar 字段已修改为 TEXT');

    console.log('=== 修复完成 ===');
  } catch (error) {
    console.error('=== 修复失败 ===');
    console.error('错误信息:', error.message);
  } finally {
    await connection.end();
  }
}

fixAvatarField();
