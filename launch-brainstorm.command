#!/bin/zsh

cd "$(dirname "$0")"
python3 -m http.server 4173 >/tmp/brainstorm-canvas.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1
}

trap cleanup EXIT INT TERM

open "http://127.0.0.1:4173/index.html"
wait "$SERVER_PID"
