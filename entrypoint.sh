#!/bin/bash
set -e

cd $SERVER_HOME

# Check required files
if [ ! -f "HytaleServer.jar" ]; then
    echo "=============================================="
    echo "ERROR: HytaleServer.jar not found"
    echo ""
    echo "Download server files from:"
    echo "https://hytale.com (requires account)"
    echo ""
    echo "Place these files in ./server volume:"
    echo "  - HytaleServer.jar"
    echo "  - Assets.zip"
    echo "=============================================="
    exit 1
fi

if [ ! -f "Assets.zip" ]; then
    echo "ERROR: Assets.zip not found"
    exit 1
fi

echo "Starting Hytale Server..."
echo "RAM: ${JAVA_XMS} - ${JAVA_XMX}"
echo "Bind: ${BIND_ADDR}:${BIND_PORT}/udp"
echo ""

# Base JVM flags
JAVA_FLAGS=(
    "-Xms${JAVA_XMS}"
    "-Xmx${JAVA_XMX}"
)

# G1GC optimizations
if [ "$USE_G1GC" = "true" ]; then
    JAVA_FLAGS+=(
        "-XX:+UseG1GC"
        "-XX:+ParallelRefProcEnabled"
        "-XX:MaxGCPauseMillis=${MAX_GC_PAUSE_MILLIS:-200}"
        "-XX:+UnlockExperimentalVMOptions"
        "-XX:+DisableExplicitGC"
        "-XX:G1NewSizePercent=${G1_NEW_SIZE_PERCENT:-30}"
        "-XX:G1MaxNewSizePercent=${G1_MAX_NEW_SIZE_PERCENT:-40}"
        "-XX:G1HeapRegionSize=${G1_HEAP_REGION_SIZE:-8M}"
        "-XX:G1ReservePercent=20"
        "-XX:G1HeapWastePercent=5"
        "-XX:G1MixedGCCountTarget=4"
        "-XX:InitiatingHeapOccupancyPercent=15"
        "-XX:G1MixedGCLiveThresholdPercent=90"
        "-XX:G1RSetUpdatingPauseTimePercent=5"
        "-XX:SurvivorRatio=32"
        "-XX:+PerfDisableSharedMem"
        "-XX:MaxTenuringThreshold=1"
    )
fi

# AOT cache for faster startup
if [ -f "HytaleServer.aot" ]; then
    JAVA_FLAGS+=("-XX:AOTCache=HytaleServer.aot")
    echo "Using AOT cache"
fi

# Custom JVM flags
if [ -n "$JAVA_EXTRA_FLAGS" ]; then
    JAVA_FLAGS+=($JAVA_EXTRA_FLAGS)
fi

# Build server arguments
SERVER_ARGS=(
    "-jar" "HytaleServer.jar"
    "--assets" "Assets.zip"
    "--bind" "${BIND_ADDR}:${BIND_PORT}"
)

# Optional server arguments
if [ -n "$VIEW_DISTANCE" ]; then
    SERVER_ARGS+=("--view-distance" "$VIEW_DISTANCE")
fi

if [ -n "$MAX_PLAYERS" ]; then
    SERVER_ARGS+=("--max-players" "$MAX_PLAYERS")
fi

if [ -n "$SERVER_NAME" ]; then
    SERVER_ARGS+=("--name" "$SERVER_NAME")
fi

if [ -n "$SERVER_EXTRA_ARGS" ]; then
    SERVER_ARGS+=($SERVER_EXTRA_ARGS)
fi

exec java "${JAVA_FLAGS[@]}" "${SERVER_ARGS[@]}"
