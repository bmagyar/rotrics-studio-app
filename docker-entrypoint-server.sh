#!/bin/sh
set -e

mkdir -p /run/dbus
dbus-daemon --system --fork >/dev/null 2>&1 || true
avahi-daemon -D >/dev/null 2>&1 || true

exec "$@"
