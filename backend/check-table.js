const mysql = require('mysql2/promise');
require('dotenv').config({ quiet: true });

async function checkTable() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'news_db',
    port: 3306
  });

  try {
    const [result] = await pool.query("SHOW COLUMNS FROM news LIKE 'image'");
    console.log('当前 image 字段信息:');
    console.log(result);
    process.exit(0);
  } catch (error) {
    console.error('查询失败:', error.message);
    process.exit(1);
  }
}

checkTable();