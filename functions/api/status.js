// Cloudflare Pages Function: /api/status
// ดึงข้อมูลสถานะล่าสุดจาก KV Database ส่งกลับไปแสดงที่หน้าเว็บ
export async function onRequestGet(context) {
  const { env } = context;

  // ค่า Default ถ้ายังไม่มีการยิงข้อมูลมาจาก MikroTik
  const defaultData = {
    lastUpdated: new Date().toLocaleTimeString('th-TH'),
    devices: [
      { ip: "172.19.1.254", status: "online", ping: 1 },
      { ip: "172.19.1.253", status: "online", ping: 1 },
      { ip: "172.19.1.252", status: "online", ping: 2 },
      { ip: "172.19.1.3", status: "online", ping: 1 },
      { ip: "172.19.1.51", status: "online", ping: 3 },
      { ip: "172.19.1.52", status: "online", ping: 3 },
      { ip: "172.19.1.11", status: "online", ping: 2 },
      { ip: "172.19.1.13", status: "online", ping: 2 },
      { ip: "172.19.1.10", status: "online", ping: 2 },
      { ip: "172.19.1.16", status: "online", ping: 4 },
      { ip: "172.19.1.12", status: "online", ping: 3 },
      { ip: "172.19.1.15", status: "online", ping: 3 },
      { ip: "172.19.1.14", status: "online", ping: 3 },
      { ip: "172.19.1.17", status: "online", ping: 4 },
      { ip: "172.19.1.22", status: "online", ping: 4 },
      { ip: "172.19.1.24", status: "online", ping: 4 },
      { ip: "172.19.1.21", status: "online", ping: 4 },
      { ip: "172.19.1.23", status: "online", ping: 5 }
    ]
  };

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
  } catch (err) {
    // กรณีที่ยังไม่ได้ผูก KV ให้ส่ง default กลับไป
  }

  return new Response(JSON.stringify(defaultData), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache"
    }
  });
}

