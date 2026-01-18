const path = require("path");
const crypto = require("crypto");
const tar = require("tar-stream");
const config = require("../config");
const docker = require("./docker");

const MODS_DIR = config.mods?.basePath || "/opt/hytale/mods";
const METADATA_FILE = config.mods?.metadataFile || "/opt/hytale/mods.json";

/**
 * Initialize mods directory and metadata file
 */
async function ensureModsSetup() {
  try {
    await docker.execCommand(`mkdir -p "${MODS_DIR}"`, 5000);
    const checkResult = await docker.execCommand(
      `cat "${METADATA_FILE}" 2>/dev/null || echo "NOT_FOUND"`
    );

    if (checkResult.includes("NOT_FOUND")) {
      const initialData = JSON.stringify({ version: 1, apiKey: null, mods: [] }, null, 2);
      const pack = tar.pack();
      pack.entry({ name: path.basename(METADATA_FILE) }, initialData);
      pack.finalize();
      await docker.putArchive(pack, { path: path.dirname(METADATA_FILE) });
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Load mods metadata from container
 */
async function loadMods() {
  try {
    await ensureModsSetup();

    const stream = await docker.getArchive(METADATA_FILE);

    return new Promise((resolve, reject) => {
      const extract = tar.extract();
      let content = "";

      extract.on("entry", (header, entryStream, next) => {
        const chunks = [];
        entryStream.on("data", chunk => chunks.push(chunk));
        entryStream.on("end", () => {
          content = Buffer.concat(chunks).toString("utf8");
          next();
        });
        entryStream.resume();
      });

      extract.on("finish", () => {
        try {
          const data = JSON.parse(content);
          resolve({ success: true, data });
        } catch (e) {
          resolve({ success: true, data: { version: 1, apiKey: null, mods: [] } });
        }
      });

      extract.on("error", reject);
      stream.pipe(extract);
    });
  } catch (e) {
    return { success: false, error: e.message, data: { version: 1, apiKey: null, mods: [] } };
  }
}

/**
 * Save mods metadata to container
 */
async function saveMods(modsData) {
  try {
    const content = JSON.stringify(modsData, null, 2);
    const pack = tar.pack();
    pack.entry({ name: path.basename(METADATA_FILE) }, content);
    pack.finalize();

    await docker.putArchive(pack, { path: path.dirname(METADATA_FILE) });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * List installed mods (including manually added files)
 */
async function listInstalledMods() {
  try {
    const result = await loadMods();
    if (!result.success) {
      return { success: false, error: result.error, mods: [] };
    }

    // Get actual files in mods directory
    const lsResult = await docker.execCommand(
      `ls -la "${MODS_DIR}" 2>/dev/null | grep -E "\\.(jar|disabled|zip)$" || echo ""`
    );

    const filesInDir = [];
    const knownFileNames = new Set(result.data.mods.map(m => m.fileName));
    const knownFileNamesDisabled = new Set(result.data.mods.map(m => m.fileName + ".disabled"));

    lsResult.split("\n").forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 9) {
        const fileName = parts.slice(8).join(" ");
        const fileSize = parseInt(parts[4], 10) || 0;
        if (fileName.endsWith(".jar") || fileName.endsWith(".disabled") || fileName.endsWith('.zip')) {
          filesInDir.push({ fileName, fileSize });
        }
      }
    });

    // Build set of existing files for quick lookup
    const existingFiles = new Set(filesInDir.map(f => f.fileName));

    // Update existing mods status based on actual files
    const mods = result.data.mods.map(mod => {
      const enabledExists = existingFiles.has(mod.fileName);
      const disabledExists = existingFiles.has(mod.fileName + ".disabled");

      return {
        ...mod,
        enabled: enabledExists && !disabledExists,
        fileExists: enabledExists || disabledExists
      };
    }).filter(mod => mod.fileExists);

    // Find unknown mods (files in directory not in metadata)
    let needsSave = false;
    for (const file of filesInDir) {
      const baseFileName = file.fileName.replace(".disabled", "");

      // Skip if already known
      if (knownFileNames.has(baseFileName) || knownFileNames.has(file.fileName)) {
        continue;
      }
      if (knownFileNamesDisabled.has(file.fileName)) {
        continue;
      }

      // This is an unknown mod - add it
      const isDisabled = file.fileName.endsWith(".disabled");
      const actualFileName = isDisabled ? file.fileName.replace(".disabled", "") : file.fileName;

      // Extract name from filename (remove .jar/.zip extension)
      const modName = actualFileName.replace(/\.(jar|zip)$/, "").replace(/-/g, " ");

      const newMod = {
        id: crypto.randomUUID(),
        providerId: "local",
        projectId: null,
        projectTitle: modName,
        projectIconUrl: null,
        versionId: null,
        versionName: "Unknown",
        classification: "PLUGIN",
        fileName: actualFileName,
        fileSize: file.fileSize,
        enabled: !isDisabled,
        installedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isLocal: true
      };

      mods.push(newMod);
      result.data.mods.push(newMod);
      knownFileNames.add(actualFileName);
      needsSave = true;
    }

    // Save updated metadata if we found new mods
    if (needsSave) {
      await saveMods(result.data);
    }

    return { success: true, mods };
  } catch (e) {
    return { success: false, error: e.message, mods: [] };
  }
}

/**
 * Install a mod from buffer
 */
async function installMod(fileBuffer, metadata) {
  try {
    await ensureModsSetup();

    const modId = crypto.randomUUID();
    const fileName = metadata.fileName || `${metadata.projectTitle.replace(/[^a-zA-Z0-9]/g, "-")}-${metadata.versionName}.jar`;

    // Write mod file to container
    const pack = tar.pack();
    pack.entry({ name: fileName }, fileBuffer);
    pack.finalize();

    await docker.putArchive(pack, { path: MODS_DIR });

    // Update metadata
    const result = await loadMods();
    const modsData = result.data;

    // Check if mod already exists (same projectId and versionId)
    const existingIndex = modsData.mods.findIndex(
      m => m.projectId === metadata.projectId && m.versionId === metadata.versionId
    );

    const modEntry = {
      id: existingIndex >= 0 ? modsData.mods[existingIndex].id : modId,
      providerId: metadata.providerId || "modtale",
      projectId: metadata.projectId,
      projectSlug: metadata.projectSlug || null,
      projectTitle: metadata.projectTitle,
      projectIconUrl: metadata.projectIconUrl || null,
      versionId: metadata.versionId,
      versionName: metadata.versionName,
      classification: metadata.classification || "PLUGIN",
      fileName,
      fileSize: fileBuffer.length,
      enabled: true,
      installedAt: existingIndex >= 0 ? modsData.mods[existingIndex].installedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      // Remove old file if different name
      if (modsData.mods[existingIndex].fileName !== fileName) {
        await docker.execCommand(`rm -f "${MODS_DIR}/${modsData.mods[existingIndex].fileName}" "${MODS_DIR}/${modsData.mods[existingIndex].fileName}.disabled"`, 5000);
      }
      modsData.mods[existingIndex] = modEntry;
    } else {
      modsData.mods.push(modEntry);
    }

    await saveMods(modsData);

    return { success: true, mod: modEntry };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Uninstall a mod
 */
async function uninstallMod(modId) {
  try {
    const result = await loadMods();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const modsData = result.data;
    const modIndex = modsData.mods.findIndex(m => m.id === modId);

    if (modIndex < 0) {
      return { success: false, error: "Mod not found" };
    }

    const mod = modsData.mods[modIndex];

    // Delete both enabled and disabled versions
    await docker.execCommand(
      `rm -f "${MODS_DIR}/${mod.fileName}" "${MODS_DIR}/${mod.fileName}.disabled"`,
      5000
    );

    // Remove from metadata
    modsData.mods.splice(modIndex, 1);
    await saveMods(modsData);

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Enable a mod (rename .jar.disabled -> .jar or .zip.disabled -> .zip)
 */
async function enableMod(modId) {
  try {
    const result = await loadMods();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const modsData = result.data;
    const mod = modsData.mods.find(m => m.id === modId);

    if (!mod) {
      return { success: false, error: "Mod not found" };
    }

    const disabledPath = `${MODS_DIR}/${mod.fileName}.disabled`;
    const enabledPath = `${MODS_DIR}/${mod.fileName}`;

    // Check if disabled file exists
    const checkResult = await docker.execCommand(
      `test -f "${disabledPath}" && echo "EXISTS" || echo "NOT_FOUND"`
    );

    if (checkResult.includes("EXISTS")) {
      await docker.execCommand(`mv "${disabledPath}" "${enabledPath}"`, 5000);
    }

    // Update metadata
    mod.enabled = true;
    mod.updatedAt = new Date().toISOString();
    await saveMods(modsData);

    return { success: true, mod };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Disable a mod (rename .jar -> .jar.disabled or .zip -> .zip.disabled)
 */
async function disableMod(modId) {
  try {
    const result = await loadMods();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const modsData = result.data;
    const mod = modsData.mods.find(m => m.id === modId);

    if (!mod) {
      return { success: false, error: "Mod not found" };
    }

    const enabledPath = `${MODS_DIR}/${mod.fileName}`;
    const disabledPath = `${MODS_DIR}/${mod.fileName}.disabled`;

    // Check if enabled file exists
    const checkResult = await docker.execCommand(
      `test -f "${enabledPath}" && echo "EXISTS" || echo "NOT_FOUND"`
    );

    if (checkResult.includes("EXISTS")) {
      await docker.execCommand(`mv "${enabledPath}" "${disabledPath}"`, 5000);
    }

    // Update metadata
    mod.enabled = false;
    mod.updatedAt = new Date().toISOString();
    await saveMods(modsData);

    return { success: true, mod };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Get mod by ID
 */
async function getMod(modId) {
  try {
    const result = await loadMods();
    if (!result.success) {
      return { success: false, error: result.error };
    }
    const mod = result.data.mods.find(m => m.id === modId);
    return { success: true, mod: mod || null };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Update mod metadata (for enriching local mods with API data)
 */
async function updateMod(modId, updates) {
  try {
    const result = await loadMods();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const modsData = result.data;
    const modIndex = modsData.mods.findIndex(m => m.id === modId);

    if (modIndex < 0) {
      return { success: false, error: "Mod not found" };
    }

    modsData.mods[modIndex] = {
      ...modsData.mods[modIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await saveMods(modsData);
    return { success: true, mod: modsData.mods[modIndex] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  listInstalledMods,
  installMod,
  uninstallMod,
  enableMod,
  disableMod,
  getMod,
  updateMod
};
