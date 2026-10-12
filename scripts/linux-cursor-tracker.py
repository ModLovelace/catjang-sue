#!/usr/bin/env python3
"""
Lightweight real-time global cursor position tracker for GNOME Shell Wayland sessions.
Queries the Kando GNOME Shell extension via DBus session bus at ~50Hz.
Outputs "x y\n" on changes and every 250 ms while the cursor is stationary.
"""
import sys
import time

def main():
    try:
        import dbus
        bus = dbus.SessionBus()
        obj = bus.get_object('org.gnome.Shell', '/org/gnome/shell/extensions/KandoIntegration')
        iface = dbus.Interface(obj, 'org.gnome.Shell.Extensions.KandoIntegration')
        # Verify call works
        res = iface.GetWMInfo()
    except Exception:
        # DBus or extension not available; exit cleanly so caller falls back to standard APIs
        sys.exit(0)

    last_x = None
    last_y = None
    last_sent_at = 0

    while True:
        try:
            res = iface.GetWMInfo()
            x = int(res[2])
            y = int(res[3])
            now = time.monotonic()
            if x != last_x or y != last_y or now - last_sent_at >= 0.25:
                last_x = x
                last_y = y
                last_sent_at = now
                sys.stdout.write(f"{x} {y}\n")
                sys.stdout.flush()
        except (KeyboardInterrupt, BrokenPipeError):
            break
        except Exception:
            # The extension/session may disappear. Let the caller use its fallback.
            break
        try:
            time.sleep(0.02)  # ~50 FPS
        except KeyboardInterrupt:
            break

if __name__ == "__main__":
    main()
