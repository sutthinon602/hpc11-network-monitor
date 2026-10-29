export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. API: ดึงสถานะไปแสดงที่หน้าเว็บ (/api/status)
    if (url.pathname === "/api/status") {
      try {
        if (env.STATUS_KV) {
          const stored = await env.STATUS_KV.get("network_devices_status");
          if (stored) {
            return new Response(stored, {
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache"
              }
            });
          }
        }
      } catch (e) {}

      // ถ้ายังไม่มีข้อมูลใน KV ให้ส่งค่าว่างเพื่อใช้ค่าเริ่มต้นของหน้าเว็บ
      return new Response(JSON.stringify({
        lastUpdated: new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' }),
        devices: []
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
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

        const payload = {
          lastUpdated: new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' }),
          devices: body.devices || []
        };

        if (env.STATUS_KV) {
          await env.STATUS_KV.put("network_devices_status", JSON.stringify(payload));
        }

        return new Response(JSON.stringify({ success: true, count: payload.devices.length }), {
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

