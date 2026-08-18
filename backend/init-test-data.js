const mysql = require('mysql2/promise');
require('dotenv').config({ quiet: true });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'news_db'
};

async function initTestData() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('=== 开始初始化测试数据 ===');

    // 检查是否已有数据
    const [existing] = await connection.query('SELECT COUNT(*) as cnt FROM posts');
    if (existing[0].cnt > 0) {
      console.log('帖子表已有数据，跳过初始化');
      return;
    }

    // 插入测试帖子
    const testPosts = [
      {
        user_id: 1,
        nickname: '小明',
        avatar: '/images/avatar1.png',
        title: '校园风景真美',
        content: '今天天气很好，校园里的花开得很漂亮。大家有空可以去看看！',
        category: 'share',
        likes: 15,
        comments: 3,
        views: 128
      },
      {
        user_id: 2,
        nickname: '小红',
        avatar: '/images/avatar2.png',
        title: '图书馆座位问题',
        content: '建议学校增加图书馆的座位，现在座位太少了，周末根本抢不到。',
        category: 'question',
        likes: 28,
        comments: 12,
        views: 256
      },
      {
        user_id: 1,
        nickname: '小明',
        avatar: '/images/avatar1.png',
        title: '丢失校园卡',
        content: '昨天下午在食堂丢失了一张校园卡，卡号后四位是1234，有捡到的同学请联系_me！',
        category: 'lost',
        likes: 5,
        comments: 1,
        views: 67
      },
      {
        user_id: 3,
        nickname: '学霸哥',
        avatar: '/images/avatar3.png',
        title: '期末复习方法分享',
        content: '分享一下我的期末复习方法：\n1. 制定计划\n2. 每天坚持\n3. 多做练习\n4. 及时总结\n希望对大家有帮助！',
        category: 'discussion',
        likes: 42,
        comments: 8,
        views: 312
      }
    ];

    for (const post of testPosts) {
      await connection.query(
        'INSERT INTO posts (user_id, nickname, avatar, title, content, category, likes, comments, views, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
        [post.user_id, post.nickname, post.avatar, post.title, post.content, post.category, post.likes, post.comments, post.views]
      );
      console.log(`✓ 插入帖子: ${post.title}`);
    }

    console.log('=== 测试数据初始化完成 ===');
  } catch (error) {
    console.error('=== 初始化失败 ===');
    console.error('错误信息:', error.message);
  } finally {
    await connection.end();
  }
}

initTestData();
