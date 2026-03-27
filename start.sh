#!/bin/sh
echo "--- NAKAMA STARTUP SCRIPT ---"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

# Strip the protocol prefix (postgresql:// or postgres://) 
# Nakama flags expect: user:pass@host:port/db
DB_ADDR="${DATABASE_URL#*://}"

echo "Applying CORS origins: *"
export NAKAMA_CORS_ORIGINS="*"
export NAKAMA_SOCKET_SERVER_KEY="${NAKAMA_SERVER_KEY:-production-server-key}"
export NAKAMA_RUNTIME_HTTP_KEY="${NAKAMA_HTTP_KEY:-production-http-key}"

echo "Running migrations..."
/nakama/nakama migrate up --database.address "$DB_ADDR"

echo "Starting Nakama..."
exec /nakama/nakama --config /nakama/data/nakama-config.yml --database.address "$DB_ADDR"
