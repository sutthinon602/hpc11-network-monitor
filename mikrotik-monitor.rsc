# ==============================================================================
# Script: Monitor-Network-Switches
# อัปเดตสถานะ Switch ทั้ง 18 ตัวขึ้นไปยัง Cloudflare Pages Dashboard
# ==============================================================================

:local secretKey "HPC11Secret2026"
:local cloudflareUrl "https://YOUR-SUBDOMAIN.pages.dev/api/update"

:local ips {"172.19.1.254";"172.19.1.253";"172.19.1.252";"172.19.1.3";"172.19.1.51";"172.19.1.52";"172.19.1.11";"172.19.1.13";"172.19.1.10";"172.19.1.16";"172.19.1.12";"172.19.1.15";"172.19.1.14";"172.19.1.17";"172.19.1.22";"172.19.1.24";"172.19.1.21";"172.19.1.23"}

:local json "{\"secret\":\""
:set json ($json . $secretKey . "\",\"devices\":[")
:local isFirst true

:foreach ip in=$ips do={
  :local res [/ping $ip count=2 interval=250ms]
  :local st "offline"
  :local pingMs 0

  :if ($res > 0) do={ 
    :set st "online"
    :set pingMs 2
  }

  :if ($isFirst = false) do={ :set json ($json . ",") }
  :set json ($json . "{\"ip\":\"" . $ip . "\",\"status\":\"" . $st . "\",\"ping\":" . $pingMs . "}")
  :set isFirst false
}

:set json ($json . "]}")

# ยิงข้อมูลผ่าน HTTPS ไปยัง Cloudflare Pages
:do {
  /tool fetch url=$cloudflareUrl http-method=post http-header-field="content-type: application/json" http-data=$json check-certificate=no keep-result=no
  :log info "Updated Switch status to Cloudflare successfully"
} on-error={
  :log warning "Failed to update Switch status to Cloudflare"
}

