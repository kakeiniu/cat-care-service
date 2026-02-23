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

/* ========================
   ② 连接 MongoDB Atlas
======================== */
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://kakeiniu_DB:Hyron11%23@cluster0.ygeo1ay.mongodb.net/catcare";

mongoose
  .connect(MONGO_URI, {
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
  contactType: String,
  contact: String,
  address: String,
  catName: String,
  catAge: String,
  date: String,
  dates: [String],
  visits: [
    {
      date: String,
      time: String
    }
  ],
  time: String,
  note: String,
  isImportant: {
    type: Boolean,
    default: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Appointment = mongoose.model("Appointment", appointmentSchema);

function parseBasicAuth(headerValue) {
  if (!headerValue || typeof headerValue !== "string") return null;
  if (headerValue.indexOf("Basic ") !== 0) return null;
  const encoded = headerValue.slice(6);

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const sep = decoded.indexOf(":");
    if (sep < 0) return null;
    return {
      username: decoded.slice(0, sep),
      password: decoded.slice(sep + 1)
    };
  } catch (e) {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const credentials = parseBasicAuth(req.headers.authorization);

  if (credentials && credentials.username === adminUser && credentials.password === adminPassword) {
    return next();
  }

  res.set("WWW-Authenticate", 'Basic realm="Admin Area"');
  return res.status(401).json({
    success: false,
    message: "仅管理员可访问"
  });
}

/* ========================
   ④ 接收预约并保存到数据库
======================== */
app.post("/api/appointment", async (req, res) => {
  try {
    console.log("📩 收到新的预约信息：");
    console.log(req.body);

    if (mongoose.connection.readyState !== 1) {
      console.error("❌ MongoDB 未连接，当前状态：", mongoose.connection.readyState);
      return res.status(500).json({ success: false, message: "数据库连接失败，请稍后重试" });
    }

    // ===== 后端验证 =====
    const { contactType, contact, address, catName, catAge, date, dates, visits, time, note } = req.body;

    // 必填字段验证
    if (!contactType || !contactType.trim()) {
      return res.status(400).json({ success: false, message: "联系方式类型不能为空" });
    }
    if (!contact || !contact.trim()) {
      return res.status(400).json({ success: false, message: "联系方式不能为空" });
    }
    if (!address || !address.trim()) {
      return res.status(400).json({ success: false, message: "上门地址不能为空" });
    }
    if (!catName || !catName.trim()) {
      return res.status(400).json({ success: false, message: "猫咪名字不能为空" });
    }
    if (!catAge || !catAge.trim()) {
      return res.status(400).json({ success: false, message: "猫咪年龄不能为空" });
    }
    const normalizedVisits = Array.isArray(visits)
      ? visits
          .filter((item) => item && typeof item.date === "string" && item.date.trim())
          .map((item) => ({
            date: item.date.trim(),
            time: typeof item.time === "string" ? item.time.trim() : ""
          }))
      : [];

    if (normalizedVisits.length === 0) {
      const normalizedDates = Array.isArray(dates)
        ? dates.filter((item) => typeof item === "string" && item.trim())
        : (date ? [date] : []);

      if (normalizedDates.length === 0) {
        return res.status(400).json({ success: false, message: "服务日期不能为空" });
      }
      if (!time || !time.trim()) {
        return res.status(400).json({ success: false, message: "服务时间不能为空" });
      }

      normalizedDates.forEach((item) => {
        normalizedVisits.push({ date: item, time: time.trim() });
      });
    }

    if (normalizedVisits.length === 0) {
      return res.status(400).json({ success: false, message: "服务日期不能为空" });
    }

    for (const visit of normalizedVisits) {
      if (!visit.time) {
        return res.status(400).json({ success: false, message: `日期 ${visit.date} 缺少服务时间` });
      }
    }

    // 根据类型验证联系方式
    if (contactType === "电话") {
      // 日本电话：
      // 手机：090-1234-5678 或 09012345678（11位）
      // 固定电话：0456-12-3456 或 045612345（10位）
      const phoneDigits = contact.replace(/-/g, "");
      if (!/^0\d{9,10}$/.test(phoneDigits)) {
        return res.status(400).json({ success: false, message: "电话格式错误，请输入手机（090-1234-5678）或固定电话（0456-12-3456）" });
      }
    } else if (contactType === "邮箱") {
      // 邮箱格式验证
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
        return res.status(400).json({ success: false, message: "邮箱格式错误，请输入有效的邮箱地址" });
      }
    } else if (contactType === "微信") {
      // 微信号长度检查
      if (contact.length < 5 || contact.length > 20) {
        return res.status(400).json({ success: false, message: "微信号长度应在 5-20 个字符之间" });
      }
    } else {
      return res.status(400).json({ success: false, message: "无效的联系方式类型" });
    }

    // 日期格式验证（YYYY-MM-DD）
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const visit of normalizedVisits) {
      if (!dateRegex.test(visit.date)) {
        return res.status(400).json({ success: false, message: "日期格式错误" });
      }

      const selectedDate = new Date(visit.date);
      if (isNaN(selectedDate.getTime()) || selectedDate < today) {
        return res.status(400).json({ success: false, message: "日期无效或已过期" });
      }
    }

    // 创建预约对象
    const appointment = new Appointment({
      contactType: contactType.trim(),
      contact: contact.trim(),
      address: address,
      catName: catName.trim(),
      catAge: catAge.trim(),
      date: normalizedVisits[0].date,
      dates: normalizedVisits.map((item) => item.date),
      visits: normalizedVisits,
      time: normalizedVisits.map((item) => `${item.date} ${item.time}`).join("；"),
      note: note ? note.trim() : ""
    });

    // 保存到数据库
    await appointment.save();

    console.log("✅ 已成功保存到 MongoDB");
    console.log("预约 ID：", appointment._id);

    res.json({
      success: true,
      message: "预约提交成功"
    });
  } catch (err) {
    console.error("❌ 保存失败：", err.message);
    res.status(500).json({
      success: false,
      message: err.message || "服务器保存失败，请稍后重试"
    });
  }
});

app.get("/api/appointments", requireAdmin, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ success: false, message: "数据库连接失败，请稍后重试" });
    }

    const limitRaw = parseInt(req.query.limit, 10);
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 && limitRaw <= 500 ? limitRaw : 100;

    const appointments = await Appointment.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (err) {
    console.error("❌ 查询预约列表失败：", err && err.message ? err.message : err);
    res.status(500).json({
      success: false,
      message: "查询预约列表失败"
    });
  }
});

app.get("/api/appointments/:id", requireAdmin, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ success: false, message: "数据库连接失败，请稍后重试" });
    }

    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "无效的记录 ID" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "记录不存在" });
    }

    if (!appointment.isRead) {
      appointment.isRead = true;
      appointment.readAt = new Date();
      await appointment.save();
    }

    res.json({ success: true, data: appointment.toObject() });
  } catch (err) {
    console.error("❌ 查询预约详情失败：", err && err.message ? err.message : err);
    res.status(500).json({
      success: false,
      message: "查询预约详情失败"
    });
  }
});

app.post("/api/appointments/:id/read", requireAdmin, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ success: false, message: "数据库连接失败，请稍后重试" });
    }

    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "无效的记录 ID" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "记录不存在" });
    }

    if (!appointment.isRead) {
      appointment.isRead = true;
      appointment.readAt = new Date();
      await appointment.save();
    }

    res.json({ success: true, data: appointment.toObject() });
  } catch (err) {
    console.error("❌ 标记已读失败：", err && err.message ? err.message : err);
    res.status(500).json({
      success: false,
      message: "标记已读失败"
    });
  }
});

app.post("/api/appointments/:id/important", requireAdmin, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ success: false, message: "数据库连接失败，请稍后重试" });
    }

    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "无效的记录 ID" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "记录不存在" });
    }

    const hasExplicitImportant = req.body && typeof req.body.isImportant === "boolean";
    appointment.isImportant = hasExplicitImportant ? req.body.isImportant : !appointment.isImportant;
    await appointment.save();

    res.json({ success: true, data: appointment.toObject() });
  } catch (err) {
    console.error("❌ 标记重要失败：", err && err.message ? err.message : err);
    res.status(500).json({
      success: false,
      message: "标记重要失败"
    });
  }
});

app.post("/api/appointments/read-status", requireAdmin, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ success: false, message: "数据库连接失败，请稍后重试" });
    }

    const isRead = req.body && typeof req.body.isRead === "boolean" ? req.body.isRead : null;
    if (isRead === null) {
      return res.status(400).json({ success: false, message: "isRead 必须是布尔值" });
    }

    const updateDoc = {
      isRead: isRead,
      readAt: isRead ? new Date() : null
    };

    const result = await Appointment.updateMany({}, { $set: updateDoc });
    const modifiedCount = typeof result.modifiedCount === "number" ? result.modifiedCount : (result.nModified || 0);

    res.json({ success: true, modifiedCount: modifiedCount });
  } catch (err) {
    console.error("❌ 批量更新已读状态失败：", err && err.message ? err.message : err);
    res.status(500).json({
      success: false,
      message: "批量更新已读状态失败"
    });
  }
});

app.get("/submissions.html", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../submissions.html"));
});

app.get("/submission-detail.html", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../submission-detail.html"));
});

// 让服务器提供公开前端页面（预约提交页等）
app.use(express.static(path.join(__dirname, "../")));

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