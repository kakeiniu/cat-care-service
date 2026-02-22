const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// ⭐ 让服务器直接提供前端页面
app.use(express.static(path.join(__dirname, "../")));

// 接收预约
app.post("/api/appointment", (req, res) => {
  console.log("📩 收到新的预约信息：");
  console.log(req.body);

  res.json({
    success: true,
    message: "预约提交成功"
  });
});

// 测试
app.get("/test", (req, res) => {
  res.send("OK");
});

app.listen(3000, () => {
  console.log("🚀 服务器已启动：http://localhost:3000");
}); 