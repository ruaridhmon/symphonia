#!/usr/bin/env python3
"""Start ngrok tunnel for Symphonia backend."""

import time
from pyngrok import ngrok


def main():
    # Start tunnel
    tunnel = ngrok.connect(8000, "http")

    print("=" * 60)
    print("🔗 NGROK TUNNEL ACTIVE")
    print("=" * 60)
    print(f"Public URL: {tunnel.public_url}")
    print("Local:      http://localhost:8000")
    print("=" * 60)
    print(f"Login:      {tunnel.public_url}/otp/login")
    print("=" * 60)

    # Write URL to file for reference
    with open("/tmp/symphonia_ngrok_url.txt", "w") as f:
        f.write(tunnel.public_url)

    # Keep alive
    print("\nTunnel running. Press Ctrl+C to stop.")
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        print("\nShutting down tunnel...")
        ngrok.kill()


if __name__ == "__main__":
    main()
