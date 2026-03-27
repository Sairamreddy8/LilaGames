#!/bin/sh
echo "--- NAKAMA STARTUP SCRIPT ---"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

# Safer way to strip the protocol prefix (e.g. postgresql://)
# This avoids issues with special characters in the password.
NAKAMA_DB_ADDR="${DATABASE_URL#*://}"
export NAKAMA_DATABASE_ADDRESS="$NAKAMA_DB_ADDR"

# Masked log for debugging (shows everything except the password)
echo "Connecting to: ${NAKAMA_DB_ADDR%:*}:****@${NAKAMA_DB_ADDR#*@}"

export NAKAMA_CORS_ORIGINS="*"
export NAKAMA_SOCKET_SERVER_KEY="${NAKAMA_SERVER_KEY:-production-server-key}"
export NAKAMA_RUNTIME_HTTP_KEY="${NAKAMA_HTTP_KEY:-production-http-key}"

echo "Running migrations..."
/nakama/nakama migrate up

echo "Starting Nakama..."
exec /nakama/nakama --config /nakama/data/nakama-config.yml
