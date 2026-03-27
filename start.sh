#!/bin/sh
echo "--- NAKAMA STARTUP SCRIPT ---"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

# Nakama's database.address flag/env expects [user[:password]@][host][:port][/database]
# Railway provides postgresql://..., so we strip the prefix.
export NAKAMA_DATABASE_ADDRESS=$(echo $DATABASE_URL | sed -e 's|^postgresql://||' -e 's|^postgres://||')
export NAKAMA_CORS_ORIGINS="*"
export NAKAMA_SOCKET_SERVER_KEY="${NAKAMA_SERVER_KEY:-production-server-key}"
export NAKAMA_RUNTIME_HTTP_KEY="${NAKAMA_HTTP_KEY:-production-http-key}"

echo "Running migrations..."
/nakama/nakama migrate up

echo "Starting Nakama..."
exec /nakama/nakama --config /nakama/data/nakama-config.yml
