const ADMIN_PASSWORD = "admin1234";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. API: ดึงสถานะและประวัติเหตุการณ์ (/api/status)
    if (url.pathname === "/api/status") {
      let data = null;

      if (env.STATUS_KV) {
        try {
          const stored = await env.STATUS_KV.get("network_status_live");
          if (stored) {
            data = JSON.parse(stored);
          }
        } catch (e) {}
      }

      if (!data) {
        data = {
          lastUpdated: new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' }),
          devices: [],
          incidents: []
        };
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
      if (request.method === "GET") {
        let customDevs = null;
        if (env.STATUS_KV) {
          try {
            const stored = await env.STATUS_KV.get("custom_devices");
            if (stored) customDevs = JSON.parse(stored);
          } catch(e) {}
        }
        return new Response(JSON.stringify({ devices: customDevs }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      if (request.method === "POST") {
        try {
          const body = await request.json();
          if (body.password !== ADMIN_PASSWORD) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
          }
          if (env.STATUS_KV) {
            await env.STATUS_KV.put("custom_devices", JSON.stringify(body.devices || []));
          }
          return new Response(JSON.stringify({ success: true, count: (body.devices || []).length }), {
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

        if (body.secret !== "HPC11Secret2026") {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const nowStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
        const timeOnly = new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' });
        const devices = body.devices || [];

        // ดึงข้อมูลเดิมจาก KV เพื่อตรวจหาว่าตัวไหนเพิ่งดับ (Incident Tracking)
        let incidentLogs = [];
        let previousStates = {};

        if (env.STATUS_KV) {
          try {
            const oldRaw = await env.STATUS_KV.get("network_status_live");
            if (oldRaw) {
              const oldData = JSON.parse(oldRaw);
              incidentLogs = oldData.incidents || [];
              if (oldData.devices) {
                oldData.devices.forEach(d => { previousStates[d.ip] = d.status; });
              }
            }
          } catch(e) {}
        }

        // คำนวณ Down / Recovered
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
        });

        if (incidentLogs.length > 50) incidentLogs = incidentLogs.slice(0, 50);

        const payload = {
          lastUpdated: timeOnly,
          devices: devices,
          incidents: incidentLogs
        };

        if (env.STATUS_KV) {
          await env.STATUS_KV.put("network_status_live", JSON.stringify(payload));
        }

        return new Response(JSON.stringify({ success: true, count: devices.length }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
      }
    }

    return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not Found", { status: 404 });
  }
};
