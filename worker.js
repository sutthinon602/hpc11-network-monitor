// หน่วยความจำเก็บข้อมูล (In-memory storage)
let customDevices = null;
let latestData = null;
let incidentLogs = [];
let previousStates = {};

const ADMIN_PASSWORD = "admin1234"; // รหัสผ่าน Admin สำหรับจัดการอุปกรณ์

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
          incidents: [],
          customDevices: customDevices
        };
      } else {
        data.incidents = incidentLogs;
        data.customDevices = customDevices;
      }

      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        }
      });
    }

    // 2. API: จัดการรายชื่ออุปกรณ์จากหน้า Admin (/api/devices)
    if (url.pathname === "/api/devices") {
      // ดึงรายชื่ออุปกรณ์ปัจจุบัน
      if (request.method === "GET") {
        return new Response(JSON.stringify({ devices: customDevices }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // บันทึก/อัปเดตรายชื่ออุปกรณ์ใหม่ (Add / Edit / Delete)
      if (request.method === "POST") {
        try {
          const body = await request.json();
          if (body.password !== ADMIN_PASSWORD) {
            return new Response(JSON.stringify({ error: "รหัสผ่าน Admin ไม่ถูกต้อง" }), {
              status: 401,
              headers: { "Content-Type": "application/json" }
            });
          }

          customDevices = body.devices || [];
          return new Response(JSON.stringify({ success: true, count: customDevices.length }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), { status: 400 });
        }
      }
    }

    // 3. API: รับข้อมูลอัปเดตจาก MikroTik (/api/update)
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
            } else if (prevState === "offline" && dev.status === "online") {
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

        if (incidentLogs.length > 50) {
          incidentLogs = incidentLogs.slice(0, 50);
        }

        latestData = {
          lastUpdated: timeOnly,
          devices: devices,
          incidents: incidentLogs,
          customDevices: customDevices
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

    // 4. ส่งไฟล์หน้าเว็บ (index.html) ตามปกติ
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not Found", { status: 404 });
  }
};
