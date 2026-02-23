#!/usr/bin/env bash
# cloudflared-watchdog.sh — Auto-detect tunnel drops and restart cloudflared
# Runs every 2 minutes via launchd. Detects HTTP failures and process death.
# Cooldown: won't restart more than once per 5 minutes.

set -euo pipefail

LOG="/tmp/cloudflared-watchdog.log"
COOLDOWN_FILE="/tmp/cloudflared-watchdog-last-restart"
COOLDOWN_SECONDS=300  # 5 minutes
HEALTHCHECK_URL="https://symphonia.axiotic.ai/"
CLOUDFLARED_BIN="/opt/homebrew/bin/cloudflared"
CLOUDFLARED_CONFIG="/Users/hephaestus/.cloudflared/config.yml"
CURL_TIMEOUT=15

# Additional endpoints to check (if primary is ambiguous)
SECONDARY_URLS=(
    "https://tokens.axiotic.ai/"
    "https://dashboard.axiotic.ai/"
)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"
}

# Check if we're within cooldown period
is_in_cooldown() {
    if [[ -f "$COOLDOWN_FILE" ]]; then
        local last_restart
        last_restart=$(cat "$COOLDOWN_FILE" 2>/dev/null || echo "0")
        local now
        now=$(date +%s)
        local elapsed=$(( now - last_restart ))
        if (( elapsed < COOLDOWN_SECONDS )); then
            log "COOLDOWN: Last restart was ${elapsed}s ago (limit: ${COOLDOWN_SECONDS}s). Skipping."
            return 0
        fi
    fi
    return 1
}

# Record restart time
mark_restart() {
    date +%s > "$COOLDOWN_FILE"
}

# Check if cloudflared process is running
check_process() {
    if pgrep -f "cloudflared tunnel.*run" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# HTTP healthcheck — returns the HTTP status code (000 on timeout/failure)
http_check() {
    local url="$1"
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$CURL_TIMEOUT" -L "$url" 2>/dev/null || echo "000")
    echo "$code"
}

# Determine if an HTTP code indicates a tunnel problem
is_tunnel_failure() {
    local code="$1"
    case "$code" in
        000|502|503|520|521|522|523|524|525|526|530|1033)
            return 0  # Tunnel-related failure
            ;;
        5*)
            return 0  # Generic 5xx
            ;;
        *)
            return 1  # Not a tunnel failure
            ;;
    esac
}

# Kill all cloudflared processes
kill_cloudflared() {
    log "ACTION: Killing existing cloudflared processes..."
    pkill -f "cloudflared tunnel" 2>/dev/null || true
    sleep 2
    # Force kill if still alive
    if pgrep -f "cloudflared tunnel" > /dev/null 2>&1; then
        log "ACTION: Force killing stubborn cloudflared processes..."
        pkill -9 -f "cloudflared tunnel" 2>/dev/null || true
        sleep 1
    fi
}

# Restart cloudflared via launchctl (preferred — lets launchd manage it)
restart_cloudflared() {
    if is_in_cooldown; then
        return 1
    fi

    log "ACTION: Restarting cloudflared tunnel..."
    mark_restart

    # Kill existing processes first
    kill_cloudflared

    # Use launchctl to restart — this is cleaner since launchd manages the service
    # Unload and reload the plist to get a clean start
    local plist="$HOME/Library/LaunchAgents/com.axiotic.cloudflared.plist"
    if [[ -f "$plist" ]]; then
        log "ACTION: Reloading via launchctl (unload + load)..."
        launchctl unload "$plist" 2>/dev/null || true
        sleep 1
        launchctl load "$plist" 2>/dev/null || true
    else
        # Fallback: start directly in background
        log "ACTION: No launchd plist found, starting cloudflared directly..."
        nohup "$CLOUDFLARED_BIN" tunnel --config "$CLOUDFLARED_CONFIG" run >> /tmp/cloudflared.log 2>&1 &
    fi

    # Wait a bit and verify
    sleep 5
    if check_process; then
        log "SUCCESS: cloudflared process is running after restart."
    else
        log "WARNING: cloudflared process NOT detected after restart. May need manual intervention."
    fi

    return 0
}

# ──────────────────────────────────────────────
# Main watchdog logic
# ──────────────────────────────────────────────

log "CHECK: Starting watchdog check..."

# Step 1: Check if the process is alive
if ! check_process; then
    log "ALERT: cloudflared process is NOT running!"
    restart_cloudflared
    exit 0
fi

# Step 2: HTTP healthcheck on primary URL
primary_code=$(http_check "$HEALTHCHECK_URL")
log "CHECK: $HEALTHCHECK_URL → HTTP $primary_code"

if is_tunnel_failure "$primary_code"; then
    log "ALERT: Primary healthcheck failed (HTTP $primary_code). Checking secondary endpoints..."

    # Double-check with secondary URLs to avoid false positives
    # (e.g., if the backend app is down but tunnel is fine)
    secondary_failures=0
    secondary_total=0
    for url in "${SECONDARY_URLS[@]}"; do
        secondary_total=$((secondary_total + 1))
        code=$(http_check "$url")
        log "CHECK: $url → HTTP $code"
        if is_tunnel_failure "$code"; then
            secondary_failures=$((secondary_failures + 1))
        fi
    done

    # If primary AND at least one secondary fail → tunnel is dead
    if (( secondary_failures > 0 )); then
        log "ALERT: Primary + ${secondary_failures}/${secondary_total} secondary endpoints failed. Tunnel is dead."
        restart_cloudflared
    else
        log "INFO: Secondary endpoints OK. Primary failure may be app-level (not tunnel). Skipping restart."
    fi
else
    log "OK: Tunnel is healthy (HTTP $primary_code)."
fi

log "CHECK: Watchdog check complete."
