#!/bin/sh
set -e
echo "--- NAKAMA STARTUP SCRIPT ---"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

# Strip the protocol for the migrate command
DB_ADDR="${DATABASE_URL#*://}"

# Export variables for the server process
export NAKAMA_DATABASE_ADDRESS="$DATABASE_URL"
export NAKAMA_SOCKET_PORT="${PORT:-7350}"
export NAKAMA_LOGGER_LEVEL="INFO"
export NAKAMA_CORS_ORIGINS="*"

echo "Step 1: Running migrations..."
/nakama/nakama migrate up --database.address "$DB_ADDR"

echo "Step 2: Starting Nakama server..."
exec /nakama/nakama --config /nakama/data/nakama-config.yml
