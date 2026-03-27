#!/bin/sh
echo "--- NAKAMA STARTUP SCRIPT ---"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

# Strip the protocol prefix 
DB_ADDR="${DATABASE_URL#*://}"

# Ensure we use the PORT provided by Railway
APP_PORT="${PORT:-7350}"

# Set log level via environment variable (standard Nakama way)
export NAKAMA_LOGGER_LEVEL="WARN"
export NAKAMA_CORS_ORIGINS="*"

/nakama/nakama migrate up --database.address "$DB_ADDR"

# Only pass essential flags. Config file handles the rest.
exec /nakama/nakama \
  --config /nakama/data/nakama-config.yml \
  --database.address "$DB_ADDR" \
  --socket.port "$APP_PORT"
