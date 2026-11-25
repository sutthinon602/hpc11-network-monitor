let defaultDevices = [];
let configuredDevices = [];
let devicesData = [];
let incidents = JSON.parse(localStorage.getItem('hpc11_incidents') || '[]');
let threatsData = [];
let currentFilter = 'all';
let soundEnabled = false;
let previousOfflineCount = 0;
let isAuthenticated = false;
let pollTimer = null;
let activeThreatId = null;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showLoginGate() {
  isAuthenticated = false;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  configuredDevices = [];
  devicesData = [];
  threatsData = [];
  document.getElementById('appContainer').classList.add('hidden');
  document.getElementById('loginGate').classList.remove('hidden');
  const errEl = document.getElementById('gateError');
  if (errEl) errEl.classList.add('hidden');
  const pwdEl = document.getElementById('gatePasswordInput');
  if (pwdEl) {
    pwdEl.value = '';
    setTimeout(() => pwdEl.focus(), 80);
  }
}

async function enterDashboard() {
  isAuthenticated = true;
  document.getElementById('loginGate').classList.add('hidden');
  document.getElementById('appContainer').classList.remove('hidden');
  const diagramImg = document.getElementById('diagramImg');
  if (diagramImg && !diagramImg.getAttribute('src')) {
    diagramImg.setAttribute('src', 'diagram.jpg');
  }
  await loadDevices();
  await fetchStatus();
  if (!pollTimer) {
    pollTimer = setInterval(fetchStatus, 25000);
  }
}

async function checkAuthOnLoad() {
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      const data = await res.json();
      if (data && data.authenticated) {
        await enterDashboard();
        return;
      }
    }
  } catch (e) {}
  showLoginGate();
}

async function submitLoginGate(e) {
  if (e) e.preventDefault();
  const pwdInput = document.getElementById('gatePasswordInput');
  const errEl = document.getElementById('gateError');
  const pwd = pwdInput.value;

  if (!pwd) {
    errEl.textContent = 'กรุณากรอกรหัสผ่านครับ';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    });
    if (res.ok) {
      errEl.classList.add('hidden');
      await enterDashboard();
    } else {
      errEl.textContent = 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้งครับ';
      errEl.classList.remove('hidden');
      pwdInput.select();
    }
  } catch (err) {
    errEl.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
    errEl.classList.remove('hidden');
  }
}

async function adminLogout() {
  if (!confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) return;
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch (e) {}
  showLoginGate();
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('gridView').style.display = 'none';
  document.getElementById('diagramView').style.display = 'none';
  document.getElementById('reportView').style.display = 'none';
  document.getElementById('threatView').style.display = 'none';
  document.getElementById('adminView').style.display = 'none';

  if (tab === 'grid') {
    document.getElementById('tabGrid').classList.add('active');
    document.getElementById('gridView').style.display = 'block';
  } else if (tab === 'report') {
    document.getElementById('tabReport').classList.add('active');
    document.getElementById('reportView').style.display = 'block';
    renderIncidentTable();
  } else if (tab === 'threats') {
    document.getElementById('tabThreats').classList.add('active');
    document.getElementById('threatView').style.display = 'block';
    renderThreatTable();
  } else if (tab === 'admin') {
    document.getElementById('tabAdmin').classList.add('active');
    document.getElementById('adminView').style.display = 'block';
    renderAdminTable();
  } else if (tab === 'diagram') {
    document.getElementById('tabDiagram').classList.add('active');
    document.getElementById('diagramView').style.display = 'block';
  }
}

async function loadDevices() {
  try {
    const res = await fetch('/api/devices');
    if (res.status === 401) {
      showLoginGate();
      return;
    }
    if (res.ok) {
      const data = await res.json();
      defaultDevices = data.defaults || [];
      configuredDevices = data.devices || [...defaultDevices];
      devicesData = [...configuredDevices];
    }
  } catch (e) {}
}

function renderAdminTable() {
  const tbody = document.getElementById('adminTableBody');
  tbody.innerHTML = '';
  configuredDevices.forEach((dev, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td class="font-bold">${escapeHtml(dev.name)}</td>
      <td class="font-mono text-blue">${escapeHtml(dev.ip)}</td>
      <td>${escapeHtml(dev.group)}</td>
      <td class="text-muted">${escapeHtml(dev.model || '-')}</td>
      <td class="text-muted text-xs">${escapeHtml(dev.uplink || '-')}</td>
      <td class="text-center">
        <button class="btn-action btn-sm" data-action="edit-device" data-idx="${idx}">✏️ แก้ไข</button>
        <button class="btn-action btn-sm btn-danger-outline" data-action="delete-device" data-idx="${idx}">🗑️ ลบ</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddDeviceModal() {
  document.getElementById('formModalTitle').textContent = '➕ เพิ่มอุปกรณ์ใหม่';
  document.getElementById('editDeviceIndex').value = '-1';
  document.getElementById('devNameInput').value = '';
  document.getElementById('devIpInput').value = '';
  document.getElementById('devGroupInput').value = '';
  document.getElementById('devCategoryInput').value = 'service';
  document.getElementById('devModelInput').value = '';
  document.getElementById('devUplinkInput').value = '';
  document.getElementById('devVlansInput').value = 'Vlan 90';
  document.getElementById('deviceFormModal').classList.add('active');
}

function openEditDeviceModal(idx) {
  const dev = configuredDevices[idx];
  if (!dev) return;
  document.getElementById('formModalTitle').textContent = '✏️ แก้ไขข้อมูลอุปกรณ์';
  document.getElementById('editDeviceIndex').value = idx;
  document.getElementById('devNameInput').value = dev.name;
  document.getElementById('devIpInput').value = dev.ip;
  document.getElementById('devGroupInput').value = dev.group;
  document.getElementById('devCategoryInput').value = dev.category || 'service';
  document.getElementById('devModelInput').value = dev.model || '';
  document.getElementById('devUplinkInput').value = dev.uplink || '';
  document.getElementById('devVlansInput').value = dev.vlans || '';
  document.getElementById('deviceFormModal').classList.add('active');
}

function closeDeviceFormModal() {
  document.getElementById('deviceFormModal').classList.remove('active');
}

function saveDeviceForm() {
  const name = document.getElementById('devNameInput').value.trim();
  const ip = document.getElementById('devIpInput').value.trim();
  const group = document.getElementById('devGroupInput').value.trim();
  const category = document.getElementById('devCategoryInput').value;
  const model = document.getElementById('devModelInput').value.trim();
  const uplink = document.getElementById('devUplinkInput').value.trim();
  const vlans = document.getElementById('devVlansInput').value.trim();
  const editIdx = parseInt(document.getElementById('editDeviceIndex').value, 10);

  if (!name || !ip || !group) {
    alert('กรุณากรอกชื่ออุปกรณ์, เลข IP และกลุ่มอาคารให้ครบถ้วนครับ');
    return;
  }

  const deviceData = {
    id: 'sw_' + ip.replace(/\./g, '_'),
    name, ip, group, category, model, uplink, vlans,
    status: 'online', ping: 2
  };

  if (editIdx >= 0) {
    configuredDevices[editIdx] = { ...configuredDevices[editIdx], ...deviceData };
  } else {
    configuredDevices.push(deviceData);
  }

  saveDevicesConfig();
  closeDeviceFormModal();
  renderAdminTable();
  renderCards();
  alert("บันทึกข้อมูลเรียบร้อยแล้วครับ! อย่าลืมกดปุ่ม 'คัดลอกโค้ด MikroTik' เพื่อนำไปอัปเดตใน Router ด้วยนะครับ");
}

function deleteDevice(idx) {
  const dev = configuredDevices[idx];
  if (!dev) return;
  if (confirm(`คุณต้องการลบ "${dev.name}" (${dev.ip}) ออกจากการติดตามใช่หรือไม่?`)) {
    configuredDevices.splice(idx, 1);
    saveDevicesConfig();
    renderAdminTable();
    renderCards();
  }
}

function resetDefaultDevices() {
  if (confirm('คุณต้องการคืนค่ากลับไปเป็นรายการอุปกรณ์เริ่มต้น 18 ตัวใช่หรือไม่?')) {
    configuredDevices = [...defaultDevices];
    saveDevicesConfig();
    renderAdminTable();
    renderCards();
    alert('คืนค่าเริ่มต้นเรียบร้อยแล้วครับ');
  }
}

async function saveDevicesConfig() {
  try {
    const res = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ devices: configuredDevices })
    });
    if (res.status === 401) showLoginGate();
  } catch (e) {}
}

function copyMikrotikScript() {
  const ipList = configuredDevices.map(d => `"${d.ip}"`).join(';');
  const script = `# คำสั่ง MikroTik อัปเดตรายชื่อ IP สวิตช์อัตโนมัติ
/system script set [find name="Update-Switch-Status"] source={
  :local secretKey "YOUR_MIKROTIK_SECRET_KEY"
  :local cloudflareUrl "https://hpc11-network-monitor.sutthinon602.workers.dev/api/update"
  :local ips {${ipList}}
  :local json ("{\\"secret\\":\\"" . $secretKey . "\\",\\"devices\\":[")
  :local isFirst true
  :foreach ip in=$ips do={
    :local res [/ping $ip count=1 interval=150ms]
    :local st "offline"
    :local pingMs 0
    :if ($res > 0) do={ :set st "online"; :set pingMs 2 }
    :if ($isFirst = false) do={ :set json ($json . ",") }
    :set json ($json . "{\\"ip\\":\\"" . $ip . "\\",\\"status\\":\\"" . $st . "\\",\\"ping\\":" . $pingMs . "}")
    :set isFirst false
  }
  :set json ($json . "]}")
  :do {
    /tool fetch url=$cloudflareUrl http-method=post http-data=$json keep-result=no
  } on-error={}
}
/system script run "Update-Switch-Status"`;

  navigator.clipboard.writeText(script).then(() => {
    alert("คัดลอกคำสั่งสำหรับ MikroTik เรียบร้อยแล้วครับ!\nนำไปกด Paste ใน New Terminal ของ Winbox ได้ทันที (อย่าลืมใส่ secretKey ของคุณครับ)");
  });
}

async function fetchStatus() {
  if (!isAuthenticated) return;
  try {
    const response = await fetch('/api/status');
    if (response.status === 401) {
      showLoginGate();
      return;
    }
    if (response.ok) {
      const data = await response.json();
      if (data && data.lastUpdated) {
        if (data.devices && data.devices.length > 0) {
          devicesData = configuredDevices.map(def => {
            const live = data.devices.find(d => d.ip === def.ip);
            return live ? { ...def, ...live } : def;
          });
          document.getElementById('lastUpdated').textContent = data.lastUpdated;
        } else {
          document.getElementById('lastUpdated').textContent = data.lastUpdated + ' (รอ MikroTik ส่งข้อมูล)';
        }

        if (data.incidents && data.incidents.length > 0) {
          data.incidents.forEach(serverInc => {
            const exists = incidents.find(i => i.id === serverInc.id);
            if (!exists) incidents.unshift(serverInc);
            else {
              exists.resolved = serverInc.resolved;
              exists.recoverTime = serverInc.recoverTime;
              exists.duration = serverInc.duration;
            }
          });
          localStorage.setItem('hpc11_incidents', JSON.stringify(incidents));
        }

        if (data.threats) {
          threatsData = data.threats;
          const badge = document.getElementById('threatBadge');
          if (threatsData.length > 0) {
            badge.classList.remove('hidden');
            badge.textContent = threatsData.length;
          } else {
            badge.classList.add('hidden');
          }
          renderThreatTable();
        }
      }
    }
  } catch (err) {}
  renderCards();
  renderIncidentTable();
}

function renderCards() {
  const container = document.getElementById('devicesContainer');
  const searchVal = document.getElementById('searchInput').value.toLowerCase();
  let online = 0, offline = 0;
  container.innerHTML = '';

  devicesData.forEach((dev, idx) => {
    const isOnline = dev.status === 'online';
    if (isOnline) online++; else offline++;

    if (currentFilter === 'online' && !isOnline) return;
    if (currentFilter === 'offline' && isOnline) return;
    if (currentFilter === 'service' && dev.category !== 'service') return;
    if (currentFilter === 'admin' && dev.category !== 'admin') return;
    if (searchVal && !dev.name.toLowerCase().includes(searchVal) && !dev.ip.includes(searchVal)) return;

    const card = document.createElement('div');
    card.className = `device-card ${isOnline ? 'is-online' : 'is-offline'}`;
    card.dataset.action = 'show-detail';
    card.dataset.idx = String(idx);
    card.innerHTML = `
      <div class="device-header">
        <div>
          <div class="device-name">${escapeHtml(dev.name)}</div>
          <div class="device-group">${escapeHtml(dev.group)}</div>
        </div>
        <div class="status-pill">${isOnline ? 'ONLINE' : 'OFFLINE'}</div>
      </div>
      <div class="device-meta">
        <span class="device-ip">IP: ${escapeHtml(dev.ip)}</span>
        <span class="device-ping">${isOnline ? `⚡ ${escapeHtml(dev.ping || 2)} ms` : '✖ Timeout'}</span>
      </div>
      <div class="card-click-hint">คลิกเพื่อดูรายละเอียด 🔍</div>
    `;
    container.appendChild(card);
  });

  document.getElementById('totalCount').textContent = configuredDevices.length;
  document.getElementById('onlineCount').textContent = online;
  document.getElementById('offlineCount').textContent = offline;

  const badge = document.getElementById('incidentBadge');
  if (offline > 0) {
    badge.classList.remove('hidden');
    badge.textContent = offline;
  } else {
    badge.classList.add('hidden');
  }

  if (offline > previousOfflineCount && previousOfflineCount !== 0) playAlarm();
  previousOfflineCount = offline;
}

function renderIncidentTable() {
  const tbody = document.getElementById('incidentTableBody');
  tbody.innerHTML = '';
  if (incidents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">🟢 ยังไม่มีประวัติอุปกรณ์ดับ ระบบเครือข่ายทำงานได้ราบรื่น 100%</td></tr>`;
    return;
  }

  incidents.forEach((inc, idx) => {
    const devInfo = configuredDevices.find(d => d.ip === inc.ip) || { name: 'Switch Unknown', group: 'ไม่ระบุ' };
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-muted">${idx + 1}</td>
      <td class="font-mono text-sm">${escapeHtml(inc.downTime)}</td>
      <td class="font-bold">${escapeHtml(devInfo.name)}</td>
      <td class="font-mono text-blue">${escapeHtml(inc.ip)}</td>
      <td class="text-muted">${escapeHtml(devInfo.group)}</td>
      <td class="font-mono text-sm">${escapeHtml(inc.recoverTime)}</td>
      <td class="font-bold ${inc.resolved ? 'text-light' : 'text-red'}">${escapeHtml(inc.duration)}</td>
      <td>${inc.resolved ? '<span class="badge-recovered">🟢 กู้คืนแล้ว</span>' : '<span class="badge-down">🔴 กำลังดับ</span>'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderThreatTable() {
  const tbody = document.getElementById('threatTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!threatsData || threatsData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="safe-empty">
      🛡️ เครือข่ายปลอดภัย: ไม่พบเครื่องที่มีพฤติกรรมเสี่ยงโจมตี หรือทำให้เน็ตช้าลงในขณะนี้
    </td></tr>`;
    return;
  }

  threatsData.forEach((t, idx) => {
    const tr = document.createElement('tr');
    const isHigh = t.severity === 'high';
    const badge = isHigh
      ? `<span class="status-pill-tag status-high">⚠️ ความเสี่ยงสูง</span>`
      : `<span class="status-pill-tag status-warn">⚠️ เฝ้าระวัง</span>`;

    let statusBadge = `<span class="status-pill-tag status-pending">⏳ รอตรวจสอบ</span>`;
    if (t.adminStatus === 'reviewed') {
      statusBadge = `<span class="status-pill-tag status-reviewed">✅ ตรวจสอบแล้ว</span>`;
    } else if (t.adminStatus === 'investigating') {
      statusBadge = `<span class="status-pill-tag status-investigating">🔍 กำลังตรวจสอบ</span>`;
    } else if (t.adminStatus === 'false_positive') {
      statusBadge = `<span class="status-pill-tag status-safe">⚪ เครื่องปกติ (ไม่เสี่ยง)</span>`;
    }

    const noteText = t.adminNote
      ? `<div class="note-box"><span class="note-label">[บันทึก]:</span> ${escapeHtml(t.adminNote)}</div><div class="note-time">${escapeHtml(t.reviewedAt || '')}</div>`
      : `<span class="note-empty">- ยังไม่มีบันทึก -</span>`;

    const threatLabel = t.type === 'port_scan'
      ? '🔍 สแกนพอร์ต (Port Scan)'
      : (t.type === 'conn_flood' ? '⚡ ดึง Session/แบนด์วิดท์สูง' : '🚨 สัญญาณโจมตี (SYN Flood)');

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td class="font-mono text-sm">${escapeHtml(t.detectedTime || '-')}</td>
      <td><code class="ip-code">${escapeHtml(t.ip)}</code></td>
      <td class="font-bold text-white">${threatLabel}</td>
      <td>${badge}</td>
      <td>${statusBadge}</td>
      <td>${noteText}</td>
      <td class="text-center">
        <button class="btn-action btn-primary btn-sm" data-action="threat-review" data-id="${escapeHtml(t.id)}">
          ✍️ บันทึกผล
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openThreatActionModal(threatId) {
  activeThreatId = threatId;
  const t = threatsData.find(item => item.id === threatId);
  if (!t) return;

  document.getElementById('threatActionIp').textContent = t.ip;
  document.getElementById('threatActionType').textContent = (t.type === 'port_scan' ? 'สแกนพอร์ต (Port Scan)' : (t.type === 'conn_flood' ? 'ดึง Session/แบนด์วิดท์สูง' : 'SYN Flood'));
  document.getElementById('threatStatusSelect').value = t.adminStatus || 'reviewed';
  document.getElementById('threatNoteInput').value = t.adminNote || '';
  document.getElementById('threatActionModal').classList.add('active');
}

function closeThreatActionModal() {
  document.getElementById('threatActionModal').classList.remove('active');
}

async function saveThreatAction() {
  if (!activeThreatId) return;
  const status = document.getElementById('threatStatusSelect').value;
  const note = document.getElementById('threatNoteInput').value.trim();

  try {
    const res = await fetch('/api/threats/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threatId: activeThreatId,
        adminStatus: status,
        adminNote: note
      })
    });

    if (res.status === 401) {
      closeThreatActionModal();
      showLoginGate();
      return;
    }

    if (res.ok) {
      const t = threatsData.find(item => item.id === activeThreatId);
      if (t) {
        t.adminStatus = status;
        t.adminNote = note;
        t.reviewedAt = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
      }
      renderThreatTable();
      closeThreatActionModal();
      alert('บันทึกผลการตรวจสอบเรียบร้อยแล้วครับ!');
    } else {
      alert('ไม่สามารถบันทึกได้ กรุณาลองใหม่อีกครั้งครับ');
    }
  } catch (e) {
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
  }
}

function exportToCSV() {
  if (incidents.length === 0) {
    alert('ยังไม่มีข้อมูลประวัติให้ส่งออกครับ');
    return;
  }
  let csv = '\uFEFFลำดับ,เวลาที่เริ่มดับ,ชื่ออุปกรณ์,IP Address,จุดติดตั้ง,เวลากลับมาออนไลน์,ระยะเวลาดับ,สถานะ\n';
  incidents.forEach((inc, idx) => {
    const devInfo = configuredDevices.find(d => d.ip === inc.ip) || { name: '-', group: '-' };
    csv += `"${idx + 1}","${inc.downTime}","${devInfo.name}","${inc.ip}","${devInfo.group}","${inc.recoverTime}","${inc.duration}","${inc.resolved ? 'กู้คืนแล้ว' : 'กำลังดับ'}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `HPC11_Network_Incident_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}

function printReport() { window.print(); }

function clearLocalLogs() {
  if (confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างประวัติการแจ้งเตือนทั้งหมด?')) {
    incidents = [];
    localStorage.removeItem('hpc11_incidents');
    renderIncidentTable();
  }
}

function showDeviceDetail(dev) {
  document.getElementById('modalName').textContent = dev.name;
  document.getElementById('modalCategory').textContent = dev.group;
  const statusEl = document.getElementById('modalStatus');
  statusEl.innerHTML = dev.status === 'online'
    ? `<span class="text-green">🟢 ปกติ (Online)</span>`
    : `<span class="text-red">🔴 ขาดการติดต่อ (Offline)</span>`;
  document.getElementById('modalIp').textContent = dev.ip;
  document.getElementById('modalModel').textContent = dev.model || 'Switch';
  document.getElementById('modalUplink').textContent = dev.uplink || 'Core Switch';
  document.getElementById('modalVlans').textContent = dev.vlans || 'Vlan 90';
  document.getElementById('modalPing').textContent = dev.status === 'online' ? `${dev.ping || 2} ms` : 'Request Timeout';
  document.getElementById('detailModal').classList.add('active');
}

function closeModal() { document.getElementById('detailModal').classList.remove('active'); }

function setFilter(type, btn) {
  currentFilter = type;
  document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCards();
}

function playAlarm() {
  if (!soundEnabled) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.setValueAtTime(400, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) {}
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById('soundBtn');
  const icon = document.getElementById('soundIcon');
  const text = document.getElementById('soundText');
  if (soundEnabled) {
    btn.classList.add('active');
    icon.textContent = '🔊';
    text.textContent = 'เสียงเตือน: เปิด';
    playAlarm();
  } else {
    btn.classList.remove('active');
    icon.textContent = '🔇';
    text.textContent = 'เสียงเตือน: ปิด';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Login Gate
  document.getElementById('loginForm').addEventListener('submit', submitLoginGate);

  // Header & Tabs
  document.getElementById('adminLogoutBtn').addEventListener('click', adminLogout);
  document.getElementById('soundBtn').addEventListener('click', toggleSound);
  document.getElementById('tabGrid').addEventListener('click', () => switchTab('grid'));
  document.getElementById('tabReport').addEventListener('click', () => switchTab('report'));
  document.getElementById('tabThreats').addEventListener('click', () => switchTab('threats'));
  document.getElementById('tabAdmin').addEventListener('click', () => switchTab('admin'));
  document.getElementById('tabDiagram').addEventListener('click', () => switchTab('diagram'));

  // Search & Filters
  document.getElementById('searchInput').addEventListener('keyup', renderCards);
  document.querySelectorAll('.btn-filter').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter, btn));
  });

  // Report Actions
  document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);
  document.getElementById('printReportBtn').addEventListener('click', printReport);
  document.getElementById('clearLogsBtn').addEventListener('click', clearLocalLogs);

  // Admin Actions
  document.getElementById('addDeviceBtn').addEventListener('click', openAddDeviceModal);
  document.getElementById('copyScriptBtn').addEventListener('click', copyMikrotikScript);
  document.getElementById('resetDefaultBtn').addEventListener('click', resetDefaultDevices);

  // Diagram image fallback
  const diagramImg = document.getElementById('diagramImg');
  if (diagramImg) {
    diagramImg.addEventListener('error', () => {
      if (diagramImg.getAttribute('src') === 'diagram.jpg') {
        diagramImg.setAttribute('src', 'network diagram.jpg');
      }
    });
  }

  // Modals
  document.getElementById('detailModal').addEventListener('click', (e) => {
    if (e.target.id === 'detailModal') closeModal();
  });
  document.getElementById('closeDetailTopBtn').addEventListener('click', closeModal);
  document.getElementById('closeDetailBottomBtn').addEventListener('click', closeModal);

  document.getElementById('closeDeviceFormTopBtn').addEventListener('click', closeDeviceFormModal);
  document.getElementById('cancelDeviceFormBtn').addEventListener('click', closeDeviceFormModal);
  document.getElementById('saveDeviceFormBtn').addEventListener('click', saveDeviceForm);

  document.getElementById('closeThreatModalTopBtn').addEventListener('click', closeThreatActionModal);
  document.getElementById('cancelThreatModalBtn').addEventListener('click', closeThreatActionModal);
  document.getElementById('saveThreatModalBtn').addEventListener('click', saveThreatAction);

  // Delegated clicks for dynamically generated cards & tables
  document.getElementById('devicesContainer').addEventListener('click', (e) => {
    const card = e.target.closest('.device-card');
    if (!card) return;
    const idx = parseInt(card.dataset.idx, 10);
    if (devicesData[idx]) showDeviceDetail(devicesData[idx]);
  });

  document.getElementById('adminTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx, 10);
    if (btn.dataset.action === 'edit-device') openEditDeviceModal(idx);
    else if (btn.dataset.action === 'delete-device') deleteDevice(idx);
  });

  document.getElementById('threatTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="threat-review"]');
    if (!btn) return;
    openThreatActionModal(btn.dataset.id);
  });

  checkAuthOnLoad();
});
