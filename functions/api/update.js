// Cloudflare Pages Function: /api/update
// รับข้อมูลอัปเดตสถานะจาก MikroTik มาบันทึกเก็บใน Cloudflare KV
export async function onRequestPost(context) {
  const { request, env } = context;

  // รหัสผ่านลับป้องกันคนนอกยิงข้อมูลมากวน (สามารถเปลี่ยนได้)
  const SECRET_KEY = "HPC11Secret2026";

  try {
    const contentType = request.headers.get("content-type") || "";
    let data;

    if (contentType.includes("application/json")) {
      data = await request.json();
    } else {
      const text = await request.text();
      data = JSON.parse(text);
    }

    // ตรวจสอบ Secret Key
    if (data.secret !== SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const payload = {
      lastUpdated: new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' }),
      devices: data.devices || []
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

