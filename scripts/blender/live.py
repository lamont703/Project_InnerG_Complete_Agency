#!/usr/bin/env python3
"""
Talk to a live Blender session over the BlenderMCP addon's socket.

The MCP server is only a bridge to this socket, so speaking it directly gets the
same reach without needing the MCP tools loaded into a session.

    bl.py get_scene_info
    bl.py execute_code --code 'import bpy; print(len(bpy.data.objects))'
    bl.py <type> --params '{"json": "here"}'
"""
import argparse, json, socket, sys

HOST, PORT = "localhost", 9876


def call(cmd_type, params=None, timeout=120.0):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    s.connect((HOST, PORT))
    s.sendall(json.dumps({"type": cmd_type, "params": params or {}}).encode())
    # The addon writes one JSON object and may fragment it, so read until it
    # parses rather than trusting a single recv.
    buf = b""
    while True:
        chunk = s.recv(65536)
        if not chunk:
            break
        buf += chunk
        try:
            return json.loads(buf.decode())
        except json.JSONDecodeError:
            continue
    s.close()
    raise RuntimeError(f"connection closed with {len(buf)} bytes and no complete JSON")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("type")
    ap.add_argument("--params", default="{}")
    ap.add_argument("--code")
    a = ap.parse_args()
    params = json.loads(a.params)
    if a.code:
        params["code"] = a.code
    try:
        out = call(a.type, params)
    except (ConnectionRefusedError, OSError) as e:
        print(f"NOT LISTENING on {HOST}:{PORT} ({e})", file=sys.stderr)
        print("In Blender: press N -> 'Blender MCP' tab -> 'Connect to Claude'", file=sys.stderr)
        return 2
    print(json.dumps(out, indent=1)[:4000])
    return 0 if out.get("status") == "success" else 1


if __name__ == "__main__":
    sys.exit(main())
