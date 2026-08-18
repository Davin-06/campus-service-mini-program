const mysql = require('mysql2/promise');
require('dotenv').config({ quiet: true });

async function addColumn() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'news_db',
    port: 3306
  });

  try {
    await pool.query('ALTER TABLE news ADD COLUMN image TEXT COMMENT "新闻图片Base64"');
    console.log('字段添加成功！');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('字段已存在，跳过');
      process.exit(0);
    } else {
      console.error('添加字段失败:', error.message);
      process.exit(1);
    }
  }
}

addColumn();