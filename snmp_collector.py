#!/usr/bin/env python3
"""Poll standard IF-MIB counters and send per-port telemetry to the dashboard."""
import json
import os
import re
import subprocess
import time
import urllib.request
from datetime import datetime, timezone

TARGETS = json.loads(os.environ["SNMP_TARGETS"])
COMMUNITY = os.environ["SNMP_COMMUNITY"]
INGEST_URL = os.environ["INGEST_URL"].rstrip("/") + "/api/telemetry"
INGEST_TOKEN = os.environ["TELEMETRY_TOKEN"]
POLL_SECONDS = max(15, int(os.environ.get("POLL_SECONDS", "30")))
SNMPWALK = os.environ.get("SNMPWALK", "snmpbulkwalk")
TIMEOUT = max(1, int(os.environ.get("SNMP_TIMEOUT", "3")))
IF_TABLE = "1.3.6.1.2.1.2.2.1"
IF_X_TABLE = "1.3.6.1.2.1.31.1.1.1"
previous = {}
line_re = re.compile(r"^\.?([\d.]+)\s+=\s+([^:]+):\s*(.*)$")


def walk_table(host, base_oid):
    result = subprocess.run(
        [SNMPWALK, "-On", "-v2c", "-c", COMMUNITY, "-t", str(TIMEOUT), "-r", "1", host, base_oid],
        capture_output=True, text=True, timeout=TIMEOUT + 2, check=False,
    )
    if result.returncode:
        raise RuntimeError((result.stderr or "SNMP walk failed").strip()[:300])
    values, base = {}, base_oid.split(".")
    for line in result.stdout.splitlines():
        match = line_re.match(line.strip())
        if not match:
            continue
        parts = match.group(1).split(".")
        if len(parts) < len(base) + 2:
            continue
        column, index = int(parts[len(base)]), int(parts[len(base) + 1])
        raw = match.group(3).strip().strip('"')
        if match.group(2).strip().upper() == "STRING":
            values[(column, index)] = raw
        else:
            number = re.search(r"-?\d+", raw)
            if number:
                values[(column, index)] = int(number.group(0))
    return values


def poll_target(target):
    host, now = target["host"], time.time()
    basic, extended = walk_table(host, IF_TABLE), walk_table(host, IF_X_TABLE)
    indices = {idx for (col, idx) in basic if col == 2}
    indices.update(idx for (col, idx) in extended if col == 1)
    ports = []
    for index in sorted(indices):
        key = (host, index)
        current = {
            "in_octets": extended.get((6, index)),
            "out_octets": extended.get((10, index)),
            "in_errors": basic.get((14, index), 0),
            "out_errors": basic.get((20, index), 0),
            "in_discards": basic.get((13, index), 0),
            "out_discards": basic.get((19, index), 0),
        }
        old, in_bps, out_bps = previous.get(key), None, None
        if old and current["in_octets"] is not None and current["out_octets"] is not None:
            if current["in_octets"] >= old["in_octets"] and current["out_octets"] >= old["out_octets"]:
                elapsed = now - old["time"]
                if elapsed > 0:
                    in_bps = round((current["in_octets"] - old["in_octets"]) * 8 / elapsed)
                    out_bps = round((current["out_octets"] - old["out_octets"]) * 8 / elapsed)
        previous[key] = {"time": now, **current}
        ports.append({
            "index": index,
            "name": extended.get((1, index)) or basic.get((2, index)) or f"ifIndex {index}",
            "speedMbps": extended.get((15, index)),
            "inBps": in_bps,
            "outBps": out_bps,
            "inErrors": current["in_errors"],
            "outErrors": current["out_errors"],
            "inDiscards": current["in_discards"],
            "outDiscards": current["out_discards"],
        })
    return {"name": target.get("name", host), "host": host, "ports": ports}


def send(payload):
    body = json.dumps(payload, separators=(",", ":")).encode()
    request = urllib.request.Request(
        INGEST_URL, data=body, method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {INGEST_TOKEN}"},
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        if response.status >= 300:
            raise RuntimeError(f"ingest returned HTTP {response.status}")


def main():
    while True:
        started, switches, failures = time.monotonic(), [], []
        for target in TARGETS:
            try:
                switches.append(poll_target(target))
            except Exception as exc:
                failures.append({"name": target.get("name", target.get("host", "?")), "error": str(exc)[:200]})
        try:
            send({"observedAt": datetime.now(timezone.utc).isoformat(), "switches": switches, "failures": failures})
            print(f"Sent {len(switches)} switches; {len(failures)} failed.")
        except Exception as exc:
            print(f"Could not send telemetry: {exc}")
        time.sleep(max(0, POLL_SECONDS - (time.monotonic() - started)))


if __name__ == "__main__":
    main()
