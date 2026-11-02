# SNMP traffic collector

This collector runs on a Windows or Linux host inside the switch management network. It reads standard IF-MIB counters and sends port-level throughput, errors, and discards to the Cloudflare Worker. It does not scan endpoints and does not prove that a device is attacking the network.

## Requirements

- Python 3.10+
- Net-SNMP client tools (snmpbulkwalk) installed and on PATH
- SNMPv2c enabled on each switch, restricted to the collector host and read-only community
- Outbound HTTPS access from the collector to the dashboard Worker
- Cloudflare Worker secret named TELEMETRY_TOKEN and KV binding STATUS_KV

Set environment variables before running:

    $env:SNMP_TARGETS='[{"name":"Core Switch","host":"172.19.1.254"}]'
    $env:SNMP_COMMUNITY='replace-with-read-only-community'
    $env:INGEST_URL='https://hpc11-network-monitor.sutthinon602.workers.dev'
    $env:TELEMETRY_TOKEN='set-the-same-secret-on-the-worker'
    $env:POLL_SECONDS='30'
    python snmp_collector.py

For Linux, export the same variables in a protected service environment and run the collector under a dedicated account. Do not commit credentials.

The first successful poll only establishes the counter baseline; throughput is available starting with the second poll. A counter reset or device reboot also requires a new baseline. Port utilization is only calculated when the switch reports interface speed. SNMPv2c community strings are not encrypted on the network; use a restricted management VLAN and read-only access. SNMPv3 support and vendor-specific MAC-to-port/security-event mapping can be added after the switch models are known.

The dashboard treats high traffic, errors, or discards as investigation indicators. These can also result from congestion, cabling, duplex, or hardware problems and should not be labeled as an attack without flow logs or security-event telemetry.
