// หน่วยความจำเก็บข้อมูลล่าสุดและประวัติอุปกรณ์ดับ (In-memory storage)
let latestData = null;
let incidentLogs = [];
let previousStates = {};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. API: ดึงสถานะและประวัติเหตุการณ์ (/api/status)
    if (url.pathname === "/api/status") {
      let data = latestData;

      if (!data) {
        data = {
          lastUpdated: new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' }),
          devices: [],
          incidents: []
        };
      } else {
        data.incidents = incidentLogs;
      }

      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        }
      });
    }

    // 2. API: รับข้อมูลอัปเดตจาก MikroTik (/api/update)
    if (url.pathname === "/api/update" && request.method === "POST") {
      try {
        const body = await request.json();
        
        // ตรวจสอบ Secret Key
        if (body.secret !== "HPC11Secret2026") {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
          });
        }

        const nowStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
        const timeOnly = new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' });
        const devices = body.devices || [];

        // บันทึกประวัติการเปลี่ยนแปลงสถานะ (Tracking Down / Recovered)
        devices.forEach(dev => {
          const prevState = previousStates[dev.ip];

          if (prevState !== undefined) {
            // กรณีสวิตช์ดับ (Online -> Offline)
            if (prevState === "online" && dev.status === "offline") {
              incidentLogs.unshift({
                id: Date.now() + "_" + dev.ip.replace(/\./g, "_"),
                ip: dev.ip,
                status: "offline",
                downTime: nowStr,
                recoverTime: "-",
                duration: "กำลังดับอยู่ (Active)",
                resolved: false,
                timestamp: Date.now()
              });
            }
            // กรณีสวิตช์กลับมาใช้งานได้ (Offline -> Online)
            else if (prevState === "offline" && dev.status === "online") {
              const activeLog = incidentLogs.find(log => log.ip === dev.ip && !log.resolved);
              if (activeLog) {
                activeLog.resolved = true;
                activeLog.recoverTime = nowStr;
                const diffMin = Math.round((Date.now() - activeLog.timestamp) / 60000);
                activeLog.duration = (diffMin < 1 ? "น้อยกว่า 1 นาที" : `${diffMin} นาที`);
              }
            }
          }

          previousStates[dev.ip] = dev.status;
        });

        // จำกัดประวัติล่าสุดไว้ที่ 50 รายการ
        if (incidentLogs.length > 50) {
          incidentLogs = incidentLogs.slice(0, 50);
        }

        latestData = {
          lastUpdated: timeOnly,
          devices: devices,
          incidents: incidentLogs
        };

        return new Response(JSON.stringify({ 
          success: true, 
          count: devices.length,
          totalIncidents: incidentLogs.length 
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 3. ส่งไฟล์หน้าเว็บ (index.html) ตามปกติ
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not Found", { status: 404 });
  }
};
