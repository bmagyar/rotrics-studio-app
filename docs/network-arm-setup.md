# Connecting a DexArm over the Network

Rotrics Studio can connect to a DexArm over the LAN by way of a small Linux box (a Raspberry Pi works well) running [`ser2net`](https://linux.die.net/man/8/ser2net). The arm stays plugged into the Pi's USB port; the app talks to the Pi over TCP and the Pi forwards bytes to and from the arm's serial line.

This is useful when:

- The arm lives somewhere away from the workstation
- Multiple machines should be able to reach the arm without re-cabling
- You want the arm online without dedicating a USB port on your main computer

This document covers the Pi-side setup. The app-side (entering a `tcp://...` URL in the Connect dialog) is just a text field.

---

## What you need

- A Linux host on the same network as your workstation (Raspberry Pi, an old laptop, anything with USB and Ethernet/Wi-Fi).
- A USB-A to USB-C cable connecting the host to the arm's USB-C port.
- The arm's own power brick — the host only carries data.
- Network reachability from your workstation to the host on TCP port 2000.

---

## 1. Wire it up and find the device path

Plug the cable into the host. On the host:

```bash
dmesg | tail -20
```

You should see something like:

```
usb 1-1.1: New USB device found, idVendor=<vid>, idProduct=<pid>
usb 1-1.1: Product: STM32F407ZG CDC in FS Mode
usb 1-1.1: Manufacturer: STMicroelectronics
cdc_acm 1-1.1:1.0: ttyACM0: USB ACM device
```

The line ending in `ttyACM0:` (or `ttyUSB0` on some boards) tells you the device path. Note the `idVendor` and `idProduct` values for the udev rule below.

Quick sanity check that you can talk to the arm directly:

```bash
sudo apt install -y minicom
sudo minicom -D /dev/ttyACM0 -b 115200
# Type: M114
# Expect: X:... Y:... Z:... ok
# Ctrl-A then X to quit
```

If `minicom` works, the OS sees the arm correctly and the rest is just plumbing.

---

## 2. Install a stable device name with udev

The kernel-assigned name (`ttyACM0`) can change if you have other USB-CDC devices or unplug/replug. Pin a stable symlink:

```bash
sudo tee /etc/udev/rules.d/99-dexarm.rules >/dev/null <<EOF
SUBSYSTEM=="tty", ATTRS{idVendor}=="<vid>", ATTRS{idProduct}=="<pid>", SYMLINK+="dexarm", MODE="0660", GROUP="dialout"
EOF
sudo udevadm control --reload-rules
sudo udevadm trigger --action=add --subsystem-match=tty
ls -l /dev/dexarm
```

Replace `<vid>` and `<pid>` with the values from `dmesg`. After the trigger, `/dev/dexarm` should symlink to the actual device. If you ever want to pin a *specific* arm (in case you have multiples), add `ATTRS{serial}=="<serial-number>"` to the rule.

---

## 3. Install and configure ser2net

```bash
sudo apt update
sudo apt install -y ser2net
```

Replace `/etc/ser2net.yaml` with a minimal config — the Debian package ships a sample with several entries on port 2000 bound to localhost, which conflict with your real configuration:

```bash
sudo tee /etc/ser2net.yaml >/dev/null <<'EOF'
%YAML 1.1
---
connection: &dexarm
    accepter: tcp,2000
    connector: serialdev,/dev/dexarm,115200n81,local
    enable: on
    options:
        max-connections: 1
        kickolduser: true
EOF
```

What the options mean:

- `accepter: tcp,2000` — listen on TCP port 2000, on **all** interfaces. (Writing `tcp,localhost,2000` would bind only to loopback, which isn't reachable from other machines.)
- `connector: serialdev,/dev/dexarm,115200n81,local` — open the serial device at 115200 baud, 8N1. The `local` flag keeps DTR asserted so attaching a client doesn't trigger a board reset.
- `max-connections: 1` — only one active session at a time, since the arm has a single command queue.
- `kickolduser: true` — if a previous client crashed without closing cleanly, a new connection boots the stale one out instead of being refused.

Enable and start the service:

```bash
sudo systemctl enable ser2net
sudo systemctl restart ser2net
sudo systemctl status ser2net | head -10
```

You want `Active: active (running)`.

---

## 4. Confirm it's listening on the LAN

```bash
sudo ss -ltnp 'sport = :2000'
```

The local-address column should show `0.0.0.0:2000` (and `[::]:2000` for IPv6) — **not** `127.0.0.1:2000`. Loopback-only means nobody on the network can connect.

---

## 5. Smoke-test from your workstation

```bash
nc <pi-host-or-ip> 2000
```

You'll either see periodic `wait` lines from Marlin (the firmware's idle heartbeat — confirms bytes are flowing both ways) or nothing until you type a command. Try:

```
M114
```

Expect a coordinate line and an `ok`. If that works, the network path is healthy and you're done with the host setup.

---

## 6. Connect from Rotrics Studio

Open the Connect DexArm dialog, leave the dropdown empty, and put the URL in the **network URL** field:

```
tcp://<pi-host-or-ip>:2000
```

If your network supports mDNS (`.local` names), `tcp://<pi-hostname>.local:2000` works too. Otherwise use the IP — consider giving the host a static DHCP lease in your router so the IP doesn't drift.

Click Connect. The status should flip to "Connected" and the terminal tab will start showing arm output.

---

## Troubleshooting

### `Address already in use` on `systemctl status ser2net`

Another connection in the YAML (often the Debian sample) is already binding that port. Replace `/etc/ser2net.yaml` with just your `&dexarm` connection and restart.

### `ss` shows `127.0.0.1:2000` instead of `0.0.0.0:2000`

The accepter line in your YAML is `tcp,localhost,2000` (or similar). Change it to `tcp,2000` and restart `ser2net`.

### `nc` from the workstation: connection refused

ser2net isn't running, isn't bound to a network-reachable interface, or a firewall is dropping inbound TCP/2000. Check `sudo systemctl status ser2net`, then `sudo ss -ltnp 'sport = :2000'`, then `sudo ufw status` (if ufw is in use).

### `nc` connects but no `wait` and no response to commands

`/dev/dexarm` doesn't exist or isn't the arm. Re-check the udev rule, run `ls -l /dev/dexarm`, and confirm `dmesg | grep ttyACM` matches what the symlink points at. Also confirm power to the arm.

### App says "connection refused" / "host not found" but `nc` works fine

If you're connecting by `<host>.local`, the Rotrics Studio server container needs mDNS access. The shipped `docker-compose.yml` mounts the host's avahi socket into the container so `.local` names resolve — make sure you didn't disable that mount. As a fallback, use the IP address directly.

### Arm reboots every time you connect

Some serial chips assert DTR on connect, which Marlin treats as a reset request. The `local` flag in the connector line (already in the config above) keeps DTR asserted across sessions to avoid this. If you removed it, put it back.
