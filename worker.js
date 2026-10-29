// ตัวแปรเก็บข้อมูลใน Memory (ทำงานได้ทันทีโดยไม่ต้องผูก KV)
let latestData = null;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. API: ดึงสถานะไปแสดงที่หน้าเว็บ (/api/status)
    if (url.pathname === "/api/status") {
      let data = latestData;

      // ถ้ามี KV ให้ลองดึงจาก KV เสริมด้วย
      if (env.STATUS_KV) {
        try {
          const stored = await env.STATUS_KV.get("network_devices_status");
          if (stored) data = JSON.parse(stored);
        } catch (e) { }
      }

      if (!data) {
        data = {
          lastUpdated: new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' }),
          devices: []
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

        // เซฟลง Memory ทันที
        latestData = payload;

        // ถ้ามี KV ให้เซฟลง KV ด้วย
        if (env.STATUS_KV) {
          try {
            await env.STATUS_KV.put("network_devices_status", JSON.stringify(payload));
          } catch (e) { }
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
