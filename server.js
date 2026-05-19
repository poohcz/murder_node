// server.js
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = 8000;

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'super-secret-murder-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 }
}));

// 라우터 연결
app.use('/api/auth', require('./routes/auth'));
app.use('/api/main', require('./routes/main'));
app.use('/api/topscore', require('./routes/topscore'));
app.use('/api/scenarios', require('./routes/scenarios'));

// 🌟 중요: 에러 핸들러 미들웨어는 라우터들보다 항상 '가장 아래'에 위치해야 에러를 낚아챕니다.
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 머더 아카이브 백엔드가 http://localhost:${PORT} 에서 정상 가동 중입니다.`);
});