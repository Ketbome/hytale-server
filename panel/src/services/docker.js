const Docker = require("dockerode");
const config = require("../config");

const docker = new Docker({ socketPath: config.docker.socketPath });
let cachedContainer = null;

async function getContainer() {
  try {
    cachedContainer = docker.getContainer(config.container.name);
    return cachedContainer;
  } catch (e) {
    return null;
  }
}

async function getStatus() {
  try {
    const c = await getContainer();
    if (!c) return { running: false, status: "not found" };
    
    const info = await c.inspect();
    return {
      running: info.State.Running,
      status: info.State.Status,
      startedAt: info.State.StartedAt,
      health: info.State.Health?.Status || "unknown"
    };
  } catch (e) {
    return { running: false, status: "not found", error: e.message };
  }
}

async function execCommand(cmd, timeout = 30000) {
  const c = await getContainer();
  if (!c) throw new Error("Container not found");

  const exec = await c.exec({
    Cmd: ["sh", "-c", cmd],
    AttachStdout: true,
    AttachStderr: true
  });

  const stream = await exec.start();

  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => resolve(output || "Command timed out"), timeout);

    stream.on("data", chunk => {
      output += chunk.slice(8).toString("utf8");
    });
    stream.on("end", () => {
      clearTimeout(timer);
      resolve(output);
    });
    stream.on("error", err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function sendCommand(cmd) {
  try {
    await execCommand(`echo "${cmd}" > /tmp/hytale-console`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function restart() {
  try {
    const c = await getContainer();
    if (!c) throw new Error("Container not found");
    await c.restart();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function stop() {
  try {
    const c = await getContainer();
    if (!c) throw new Error("Container not found");
    await c.stop();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function start() {
  try {
    const c = await getContainer();
    if (!c) throw new Error("Container not found");
    await c.start();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function getLogs(options = {}) {
  const c = await getContainer();
  if (!c) throw new Error("Container not found");
  
  return c.logs({
    follow: true,
    stdout: true,
    stderr: true,
    tail: options.tail || 100,
    timestamps: true
  });
}

async function getLogsHistory(tail = 500) {
  const c = await getContainer();
  if (!c) throw new Error("Container not found");
  
  return new Promise((resolve, reject) => {
    c.logs({
      follow: false,
      stdout: true,
      stderr: true,
      tail,
      timestamps: true
    }, (err, buffer) => {
      if (err) return reject(err);
      
      if (!buffer || buffer.length === 0) {
        return resolve([]);
      }
      
      // Container has tty: true, so logs come as plain text (no 8-byte header)
      const text = buffer.toString('utf8');
      const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      resolve(lines);
    });
  });
}

async function getArchive(path) {
  const c = await getContainer();
  if (!c) throw new Error("Container not found");
  return c.getArchive({ path });
}

async function putArchive(stream, options) {
  const c = await getContainer();
  if (!c) throw new Error("Container not found");
  return c.putArchive(stream, options);
}

module.exports = {
  getContainer,
  getStatus,
  execCommand,
  sendCommand,
  restart,
  stop,
  start,
  getLogs,
  getLogsHistory,
  getArchive,
  putArchive
};
