FROM eclipse-temurin:25-jdk-alpine

LABEL maintainer="hytale-server"
LABEL description="Hytale Dedicated Server"

# Non-root user for security
RUN addgroup -S hytale && adduser -S -G hytale hytale

# Minimal dependencies
RUN apk add --no-cache curl unzip bash

ENV SERVER_HOME=/opt/hytale
ENV JAVA_XMS=4G
ENV JAVA_XMX=8G
ENV BIND_PORT=5520
ENV BIND_ADDR=0.0.0.0

# JVM tuning
ENV USE_G1GC=true
ENV G1_NEW_SIZE_PERCENT=30
ENV G1_MAX_NEW_SIZE_PERCENT=40
ENV G1_HEAP_REGION_SIZE=8M
ENV MAX_GC_PAUSE_MILLIS=200

# Server config
ENV VIEW_DISTANCE=""
ENV MAX_PLAYERS=""
ENV SERVER_NAME=""

WORKDIR $SERVER_HOME

RUN mkdir -p universe mods logs config .cache && \
    chown -R hytale:hytale $SERVER_HOME

COPY --chown=hytale:hytale entrypoint.sh .
RUN chmod +x entrypoint.sh

USER hytale

EXPOSE 5520/udp

ENTRYPOINT ["./entrypoint.sh"]
