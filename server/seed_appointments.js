async function run() {
  let success = 0;
  let fail = 0;
  const times = ["上午 9:00-12:00", "下午 13:00-17:00", "晚上 18:00-21:00"];

  for (let i = 1; i <= 10; i++) {
    const contactType = ["电话", "邮箱", "微信"][(i - 1) % 3];
    let contact = "";
    if (contactType === "电话") {
      contact = `090-1234-${String(2000 + i).padStart(4, "0")}`;
    } else if (contactType === "邮箱") {
      contact = `seed${i}@example.com`;
    } else {
      contact = `wechat_user_${3000 + i}`;
    }

    const date1 = new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const date2 = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const time1 = times[(i - 1) % 3];
    const time2 = times[i % 3];

    const payload = {
      contactType,
      contact,
      address: `東京都新宿区西新宿2-8-1 测试大楼${i}层`,
      catName: `测试猫咪${i}号`,
      catAge: `${i}岁`,
      date: date1,
      dates: [date1, date2],
      visits: [
        { date: date1, time: time1 },
        { date: date2, time: time2 }
      ],
      time: `${date1} ${time1}；${date2} ${time2}`,
      note: `模拟提交记录 #${i}`
    };

    try {
      const res = await fetch("http://localhost:3001/api/appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok && result.success) {
        success += 1;
        console.log(`[${i}] OK`);
      } else {
        fail += 1;
        console.log(`[${i}] FAIL`, result);
      }
    } catch (error) {
      fail += 1;
      console.log(`[${i}] FAIL`, error && error.message ? error.message : error);
    }
  }

  console.log(`DONE success=${success} fail=${fail}`);
}

run();
