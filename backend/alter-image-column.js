const mysql = require('mysql2/promise');
require('dotenv').config({ quiet: true });

async function alterColumn() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'news_db',
    port: 3306
  });

  try {
    await pool.query('ALTER TABLE news MODIFY COLUMN image LONGTEXT COMMENT "新闻图片Base64"');
    console.log('字段类型修改成功！');
    process.exit(0);
  } catch (error) {
    console.error('修改字段失败:', error.message);
    process.exit(1);
  }
}

alterColumn();