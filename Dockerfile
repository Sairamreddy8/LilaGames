FROM heroiclabs/nakama:3.27.0

# Copy the built JavaScript module
COPY ./backend/nakama/build/main.js /nakama/data/modules/

# Copy the configuration file
COPY ./local.yml /nakama/data/nakama-config.yml

# Copy the startup script
COPY ./start.sh /nakama/start.sh
RUN chmod +x /nakama/start.sh

# We override the entrypoint to use our startup script
ENTRYPOINT ["/nakama/start.sh"]
