const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests"
};

const INITIAL_DEVICES = [
  { id: "fw1", name: "Firewall Fortigate 100F", ip: "172.19.1.254", group: "Gateway / Firewall", category: "core", model: "FortiGate 100F", uplink: "WAN1 (NT Corporate 220M)", vlans: "Vlan 1, 12, 76, 90, 200, 400", status: "online", ping: 1 },
  { id: "core", name: "Core Switch Layer 3", ip: "172.19.1.253", group: "Core Network", category: "core", model: "Layer 3 Switch", uplink: "Te1/1/1 -> Fortigate", vlans: "Vlan 1, 12, 76, 90, 200, 400", status: "online", ping: 1 },
  { id: "wlc", name: "Wireless Controller WLC-2504", ip: "172.19.1.252", group: "WiFi Management", category: "core", model: "Cisco WLC-2504", uplink: "Gi23/24 -> Core Switch", vlans: "Vlan 76 (10.76.0.0/22)", status: "online", ping: 2 },
  { id: "server", name: "Sg350-48P-hpc11-Server", ip: "172.19.1.3", group: "Data Center / Server", category: "core", model: "Cisco SG350-48P", uplink: "Gi22 -> Core Switch", vlans: "Vlan 90 (NMS-SW)", status: "online", ping: 1 },
  { id: "sw-put", name: "S5120V3 พุทธรักษา", ip: "172.19.1.51", group: "อาคารบริการ", category: "service", model: "H3C S5120V3", uplink: "Gi50 -> Server Switch", vlans: "Vlan 90", status: "online", ping: 3 },
  { id: "sw-physio", name: "S5120V3 กายภาพบำบัด", ip: "172.19.1.52", group: "อาคารบริการ", category: "service", model: "H3C S5120V3", uplink: "พุทธรักษา -> กายภาพ", vlans: "Vlan 90", status: "online", ping: 3 },
  { id: "sw-er", name: "SG350-ER ห้องฉุกเฉิน", ip: "172.19.1.11", group: "ตึกบริการผู้ป่วย", category: "service", model: "Cisco SG350", uplink: "Te1/1/2 (Gi15 -> Gi26)", vlans: "Vlan 90, Access Vlan 90", status: "online", ping: 2 },
  { id: "sw-opd", name: "SG350-OPD ชุมชน", ip: "172.19.1.13", group: "ตึกบริการผู้ป่วย", category: "service", model: "Cisco SG350", uplink: "Te1/1/2 (Gi13 -> Gi26)", vlans: "Vlan 90", status: "online", ping: 2 },
  { id: "sw-admin", name: "SG350-อำนวยการ", ip: "172.19.1.10", group: "อาคารบริหาร", category: "admin", model: "Cisco SG350", uplink: "Te1/1/2 (Gi12 -> Gi26)", vlans: "Vlan 90, MPLS Vlan 200", status: "online", ping: 2 },
  { id: "sw-fit", name: "Switch Fitness", ip: "172.19.1.16", group: "อาคารสนับสนุน", category: "support", model: "Switch 24P", uplink: "Te1/1/2 -> Gi26", vlans: "Vlan 90", status: "online", ping: 4 },
  { id: "sw-ward1", name: "Switch Ward#1", ip: "172.19.1.12", group: "หอผู้ป่วย", category: "service", model: "Cisco SG350", uplink: "Fitness (Gi21 -> Gi25)", vlans: "Vlan 90", status: "online", ping: 3 },
  { id: "sw-ward2", name: "Switch Ward#2 ผู้สูงอายุ > IT", ip: "172.19.1.15", group: "หอผู้ป่วย", category: "service", model: "Cisco SG350", uplink: "Fitness (Gi20 -> Gi26)", vlans: "Vlan 90, IT LAN", status: "online", ping: 3 },
  { id: "sw-mch", name: "Switch MCH แม่และเด็ก", ip: "172.19.1.14", group: "หอผู้ป่วย", category: "service", model: "Cisco SG350", uplink: "Fitness (Gi22 -> Gi26)", vlans: "Vlan 90", status: "online", ping: 3 },
  { id: "sw-env", name: "Switch สิ่งแวดล้อม", ip: "172.19.1.17", group: "อาคารสนับสนุน", category: "support", model: "Switch 28P", uplink: "Te1/1/3 -> Gi28", vlans: "Vlan 90, HosXP Vlan 12", status: "online", ping: 4 },
  { id: "sw-strat", name: "SG350P-22-strategy ยุทธศาสตร์", ip: "172.19.1.22", group: "อาคารบริหาร", category: "admin", model: "Cisco SG350P", uplink: "สิ่งแวดล้อม -> Gi26", vlans: "Vlan 90", status: "online", ping: 4 },
  { id: "sw-fin", name: "SG350-24P-finance การเงิน", ip: "172.19.1.24", group: "อาคารบริหาร", category: "admin", model: "Cisco SG350-24P", uplink: "สิ่งแวดล้อม (Gi15)", vlans: "Vlan 90", status: "online", ping: 4 },
  { id: "sw-ip21", name: "Switch SG350-IP21#", ip: "172.19.1.21", group: "อาคารสนับสนุน", category: "support", model: "Cisco SG350", uplink: "สิ่งแวดล้อม -> Gi26", vlans: "Vlan 90", status: "online", ping: 4 },
  { id: "sw-siri", name: "SG350-28-siritham ศิริธรรม", ip: "172.19.1.23", group: "อาคารสนับสนุน", category: "support", model: "Cisco SG350-28", uplink: "IP21 (Gi25 -> Gi25)", vlans: "Vlan 90", status: "online", ping: 5 }
];

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

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualStr(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function signSession(secret) {
  const exp = Date.now() + 12 * 60 * 60 * 1000;
  const expStr = String(exp);
  const sig = await hmacHex(secret, expStr);
  return `${expStr}.${sig}`;
}

async function verifySession(cookieHeader, secret) {
  if (!cookieHeader) return false;
  const cookies = cookieHeader.split(";").map(c => c.trim());
  const match = cookies.find(c => c.startsWith("hpc11_session="));
  if (!match) return false;
  const token = match.slice("hpc11_session=".length);
  const dotIdx = token.indexOf(".");
  if (dotIdx <= 0) return false;
  const expStr = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = await hmacHex(secret, expStr);
  return timingSafeEqualStr(sig, expected);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const adminPassword = env.ADMIN_PASSWORD || "techno@hpc11";
    const mikrotikSecret = env.MIKROTIK_SECRET || "HPC11Secret2026";
    const sessionSecret = `${adminPassword}:${mikrotikSecret}`;
    const cookieHeader = request.headers.get("Cookie");

    // 0a. API: เข้าสู่ระบบและสร้าง HttpOnly Session Cookie (/api/login)
    if (url.pathname === "/api/login" && request.method === "POST") {
      try {
        const body = await request.json();
        if (!timingSafeEqualStr(String(body.password || ""), adminPassword)) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }
        const token = await signSession(sessionSecret);
        return jsonResponse({ success: true }, 200, {
          "Set-Cookie": `hpc11_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`,
          "Cache-Control": "no-store"
        });
      } catch (err) {
        return jsonResponse({ error: err.message }, 400);
      }
    }

    // 0b. API: ออกจากระบบ (/api/logout)
    if (url.pathname === "/api/logout" && request.method === "POST") {
      return jsonResponse({ success: true }, 200, {
        "Set-Cookie": "hpc11_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
        "Cache-Control": "no-store"
      });
    }

    // 0c. API: ตรวจสอบสถานะ Session ปัจจุบัน (/api/me)
    if (url.pathname === "/api/me" && request.method === "GET") {
      const authenticated = await verifySession(cookieHeader, sessionSecret);
      return jsonResponse({ authenticated }, 200, { "Cache-Control": "no-store" });
    }

    // 1. API: ดึงสถานะและประวัติเหตุการณ์ (/api/status) - ต้อง Login ก่อน
    if (url.pathname === "/api/status") {
      if (!(await verifySession(cookieHeader, sessionSecret))) {
        return jsonResponse({ error: "Unauthorized" }, 401, { "Cache-Control": "no-store" });
      }

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

      return jsonResponse(data, 200, { "Cache-Control": "no-store" });
    }

    // 2. API: จัดการรายชื่ออุปกรณ์ (/api/devices) - ต้อง Login ก่อน
    if (url.pathname === "/api/devices") {
      if (!(await verifySession(cookieHeader, sessionSecret))) {
        return jsonResponse({ error: "Unauthorized" }, 401, { "Cache-Control": "no-store" });
      }

      if (request.method === "GET") {
        let customDevs = null;
        if (env.STATUS_KV) {
          try {
            const stored = await env.STATUS_KV.get("custom_devices");
            if (stored) customDevs = JSON.parse(stored);
          } catch (e) {}
        }
        return jsonResponse({ devices: customDevs || INITIAL_DEVICES, defaults: INITIAL_DEVICES }, 200, { "Cache-Control": "no-store" });
      }

      if (request.method === "POST") {
        try {
          const body = await request.json();
          if (env.STATUS_KV) {
            await env.STATUS_KV.put("custom_devices", JSON.stringify(body.devices || []));
          }
          return jsonResponse({ success: true, count: (body.devices || []).length });
        } catch (err) {
          return jsonResponse({ error: err.message }, 400);
        }
      }
    }

    // 3. API: อัปเดตสถานะ/คอมเมนต์ภัยคุกคามโดย Admin (/api/threats/action) - ต้อง Login ก่อน
    if (url.pathname === "/api/threats/action" && request.method === "POST") {
      if (!(await verifySession(cookieHeader, sessionSecret))) {
        return jsonResponse({ error: "Unauthorized" }, 401, { "Cache-Control": "no-store" });
      }

      try {
        const body = await request.json();
        if (env.STATUS_KV) {
          const stored = await env.STATUS_KV.get("network_status_live");
          if (stored) {
            const data = JSON.parse(stored);
            if (data.threats) {
              const target = data.threats.find(t => t.id === body.threatId);
              if (target) {
                target.adminNote = body.adminNote || "";
                target.adminStatus = body.adminStatus || "reviewed";
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

        if (!timingSafeEqualStr(String(body.secret || ""), mikrotikSecret)) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        const nowStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
        const timeOnly = new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' });
        const devices = body.devices || [];
        const incomingThreats = body.threats || [];

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
          } catch (e) {}
        }

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

        incomingThreats.forEach(t => {
          const duplicate = threatLogs.find(existing => existing.ip === t.ip && existing.type === t.type && (Date.now() - existing.timestamp < 600000));
          if (!duplicate) {
            threatLogs.unshift({
              id: Date.now() + "_" + (t.ip || "").replace(/\./g, "_"),
              ip: t.ip,
              type: t.type,
              description: t.desc || "พฤติกรรมเสี่ยง",
              severity: t.severity || "high",
              detectedTime: nowStr,
              timestamp: Date.now(),
              adminStatus: "pending",
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

    // ป้องกันการเข้าถึงภาพผังเครือข่ายโดยไม่ล็อกอิน
    if (url.pathname === "/diagram.jpg" || url.pathname === "/network%20diagram.jpg" || url.pathname === "/mikrotik-monitor.rsc" || url.pathname === "/mikrotik-threat-monitor.rsc") {
      if (!(await verifySession(cookieHeader, sessionSecret))) {
        return jsonResponse({ error: "Unauthorized" }, 401, { "Cache-Control": "no-store" });
      }
    }

    const assetRes = env.ASSETS ? await env.ASSETS.fetch(request) : new Response("Not Found", { status: 404 });
    return withSecurityHeaders(assetRes);
  }
};
