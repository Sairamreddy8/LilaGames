FROM heroiclabs/nakama:3.27.0

# Copy the JavaScript module (from source, as the build folder is gitignored)
COPY ./backend/nakama/src/index.js /nakama/data/modules/main.js

# Copy the configuration file
COPY ./local.yml /nakama/data/nakama-config.yml

# Copy the startup script
COPY ./start.sh /nakama/start.sh
RUN chmod +x /nakama/start.sh

# Set environment variables for the container
ENV NAKAMA_CORS_ORIGINS="*"

# We override the entrypoint to use our startup script
ENTRYPOINT ["/nakama/start.sh"]
