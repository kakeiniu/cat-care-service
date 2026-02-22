const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

/* ========================
   ① 中间件
======================== */
app.use(cors());
app.use(express.json());

// 让服务器直接提供前端页面
app.use(express.static(path.join(__dirname, "../")));

/* ========================
   ② 连接 MongoDB Atlas
======================== */
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://kakeiniu_DB:Hyron11%23@cluster0.ygeo1ay.mongodb.net/catcare";

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000
  })
  .then(() => {
    console.log("✅ MongoDB 连接成功");
  })
  .catch((err) => {
    console.error("❌ MongoDB 连接失败：", err && err.message ? err.message : err);
  });

const db = mongoose.connection;
db.on("error", (err) => {
  console.error("MongoDB 连接错误：", err);
});
db.on("connected", () => {
  console.log("MongoDB 事件：connected");
});
db.on("disconnected", () => {
  console.warn("MongoDB 事件：disconnected");
});

/* ========================
   ③ 定义预约数据模型
======================== */
const appointmentSchema = new mongoose.Schema({
  contact: String,
  address: String,
  catName: String,
  catAge: String,
  date: String,
  time: String,
  note: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Appointment = mongoose.model("Appointment", appointmentSchema);

/* ========================
   ④ 接收预约并保存到数据库
======================== */
app.post("/api/appointment", async (req, res) => {
  try {
    console.log("📩 收到新的预约信息：");
    console.log(req.body);

    if (mongoose.connection.readyState !== 1) {
      console.error("❌ MongoDB 未连接，当前状态：", mongoose.connection.readyState);
      return res.status(500).json({ success: false, message: "数据库未连接" });
    }

    const appointment = new Appointment(req.body);
    await appointment.save();

    console.log("✅ 已成功保存到 MongoDB");

    res.json({
      success: true,
      message: "预约提交成功"
    });
  } catch (err) {
    console.error("❌ 保存失败：", err.message);
    res.status(500).json({
      success: false,
      message: "服务器保存失败"
    });
  }
});

/* ========================
   ⑤ 测试接口
======================== */
app.get("/test", (req, res) => {
  res.send("OK");
});

/* ========================
   ⑥ 启动服务器
======================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 服务器已启动：http://localhost:${PORT}`);
});