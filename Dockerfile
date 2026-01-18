FROM eclipse-temurin:25-jdk

LABEL maintainer="ketbome"
LABEL description="Hytale Dedicated Server"

ARG TARGETARCH

# Dependencies + gosu for privilege drop
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash curl unzip gosu \
    && rm -rf /var/lib/apt/lists/*

# Download hytale-downloader (x64 only - not available for ARM64)
RUN if [ "$TARGETARCH" = "amd64" ]; then \
    curl -L -o /tmp/hytale-downloader.zip https://downloader.hytale.com/hytale-downloader.zip && \
    unzip /tmp/hytale-downloader.zip -d /tmp/downloader && \
    mv /tmp/downloader/hytale-downloader-linux-amd64 /usr/local/bin/hytale-downloader && \
    chmod +x /usr/local/bin/hytale-downloader && \
    rm -rf /tmp/hytale-downloader.zip /tmp/downloader; \
    else echo "Skipping hytale-downloader (not available for $TARGETARCH)"; fi

# Non-root user
RUN groupadd -f hytale && useradd -g hytale -m hytale || true

ENV SERVER_HOME=/opt/hytale
ENV JAVA_XMS=4G
ENV JAVA_XMX=8G
ENV BIND_PORT=5520
ENV BIND_ADDR=0.0.0.0
ENV AUTO_DOWNLOAD=true

# JVM tuning
ENV USE_G1GC=true
ENV G1_NEW_SIZE_PERCENT=30
ENV G1_MAX_NEW_SIZE_PERCENT=40
ENV G1_HEAP_REGION_SIZE=8M
ENV MAX_GC_PAUSE_MILLIS=200

WORKDIR $SERVER_HOME

RUN mkdir -p universe mods logs config .cache && \
    chown -R hytale:hytale $SERVER_HOME

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 5520/udp

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
