const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
};

function withSecurityHeaders(response) {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return withSecurityHeaders(new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders
    }
  }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const adminPassword = env.ADMIN_PASSWORD || "techno@hpc11";
    const mikrotikSecret = env.MIKROTIK_SECRET || "HPC11Secret2026";

    // 0. API: ตรวจสอบการเข้าสู่ระบบ Admin (/api/login)
    if (url.pathname === "/api/login" && request.method === "POST") {
      try {
        const body = await request.json();
        if (body.password !== adminPassword) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }
        return jsonResponse({ success: true });
      } catch (err) {
        return jsonResponse({ error: err.message }, 400);
      }
    }

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
          incidents: [],
          threats: []
        };
      }

      if (!data.threats) data.threats = [];

      return jsonResponse(data, 200, { "Cache-Control": "no-cache" });
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
        return jsonResponse({ devices: customDevs });
      }

      if (request.method === "POST") {
        try {
          const body = await request.json();
          if (body.password !== adminPassword) {
            return jsonResponse({ error: "Unauthorized" }, 401);
          }
          if (env.STATUS_KV) {
            await env.STATUS_KV.put("custom_devices", JSON.stringify(body.devices || []));
          }
          return jsonResponse({ success: true, count: (body.devices || []).length });
        } catch (err) {
          return jsonResponse({ error: err.message }, 400);
        }
      }
    }

    // 3. API: อัปเดตสถานะ/คอมเมนต์ภัยคุกคามโดย Admin (/api/threats/action)
    if (url.pathname === "/api/threats/action" && request.method === "POST") {
      try {
        const body = await request.json();
        if (body.password !== adminPassword) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        if (env.STATUS_KV) {
          const stored = await env.STATUS_KV.get("network_status_live");
          if (stored) {
            const data = JSON.parse(stored);
            if (data.threats) {
              const target = data.threats.find(t => t.id === body.threatId);
              if (target) {
                target.adminNote = body.adminNote || "";
                target.adminStatus = body.adminStatus || "reviewed"; // 'reviewed', 'false_positive', 'investigating'
                target.reviewedAt = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
                await env.STATUS_KV.put("network_status_live", JSON.stringify(data));
                return jsonResponse({ success: true, threat: target });
              }
            }
          }
        }
        return jsonResponse({ error: "Threat not found" }, 404);
      } catch (err) {
        return jsonResponse({ error: err.message }, 400);
      }
    }

    // 4. API: รับข้อมูลอัปเดตจาก MikroTik (/api/update)
    if (url.pathname === "/api/update" && request.method === "POST") {
      try {
        const body = await request.json();

        if (body.secret !== mikrotikSecret) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        const nowStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
        const timeOnly = new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' });
        const devices = body.devices || [];
        const incomingThreats = body.threats || [];

        // ดึงข้อมูลเดิมจาก KV เพื่อตรวจหาว่าตัวไหนเพิ่งดับ (Incident Tracking)
        let incidentLogs = [];
        let threatLogs = [];
        let previousStates = {};

        if (env.STATUS_KV) {
          try {
            const oldRaw = await env.STATUS_KV.get("network_status_live");
            if (oldRaw) {
              const oldData = JSON.parse(oldRaw);
              incidentLogs = oldData.incidents || [];
              threatLogs = oldData.threats || [];
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

        // บันทึกภัยคุกคาม / Anomaly ใหม่
        incomingThreats.forEach(t => {
          // ป้องกันการบันทึกซ้ำภายใน 10 นาที
          const duplicate = threatLogs.find(existing => existing.ip === t.ip && existing.type === t.type && (Date.now() - existing.timestamp < 600000));
          if (!duplicate) {
            threatLogs.unshift({
              id: Date.now() + "_" + (t.ip || "").replace(/\./g, "_"),
              ip: t.ip,
              type: t.type, // 'port_scan', 'conn_flood', 'dos_syn'
              description: t.desc || "พฤติกรรมเสี่ยง",
              severity: t.severity || "high", // 'high', 'warning'
              detectedTime: nowStr,
              timestamp: Date.now(),
              adminStatus: "pending", // 'pending', 'reviewed', 'false_positive'
              adminNote: ""
            });
          }
        });

        if (incidentLogs.length > 50) incidentLogs = incidentLogs.slice(0, 50);
        if (threatLogs.length > 50) threatLogs = threatLogs.slice(0, 50);

        const payload = {
          lastUpdated: timeOnly,
          devices: devices,
          incidents: incidentLogs,
          threats: threatLogs
        };

        if (env.STATUS_KV) {
          await env.STATUS_KV.put("network_status_live", JSON.stringify(payload));
        }

        return jsonResponse({ success: true, count: devices.length, threatCount: threatLogs.length });
      } catch (err) {
        return jsonResponse({ error: err.message }, 400);
      }
    }

    const assetRes = env.ASSETS ? await env.ASSETS.fetch(request) : new Response("Not Found", { status: 404 });
    return withSecurityHeaders(assetRes);
  }
};
