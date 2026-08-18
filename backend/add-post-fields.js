const mysql = require('mysql2/promise');
require('dotenv').config({ quiet: true });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'news_db'
};

async function addFields() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('=== 开始添加缺失字段 ===');
    
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM posts LIKE 'nickname'"
    );
    
    if (columns.length === 0) {
      await connection.execute(
        "ALTER TABLE posts ADD COLUMN nickname VARCHAR(100) DEFAULT '用户' COMMENT '发布者昵称'"
      );
      console.log('✓ 添加 nickname 字段成功');
    } else {
      console.log('✓ nickname 字段已存在');
    }
    
    const [avatarColumns] = await connection.execute(
      "SHOW COLUMNS FROM posts LIKE 'avatar'"
    );
    
    if (avatarColumns.length === 0) {
      await connection.execute(
        "ALTER TABLE posts ADD COLUMN avatar TEXT COMMENT '发布者头像'"
      );
      console.log('✓ 添加 avatar 字段成功');
    } else {
      console.log('✓ avatar 字段已存在');
    }
    
    console.log('=== 所有字段添加完成 ===');
  } catch (error) {
    console.error('=== 添加字段失败 ===');
    console.error('错误信息:', error.message);
  } finally {
    await connection.end();
  }
}

addFields();
