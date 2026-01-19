import crypto from 'node:crypto';
import path from 'node:path';
import tar from 'tar-stream';
import config from '../config/index.js';
import * as docker from './docker.js';

const MODS_DIR = config.mods?.basePath || '/opt/hytale/mods';
const METADATA_FILE = config.mods?.metadataFile || '/opt/hytale/mods.json';

export interface InstalledMod {
  id: string;
  providerId: string;
  projectId: string | null;
  projectSlug?: string | null;
  projectTitle: string;
  projectIconUrl: string | null;
  versionId: string | null;
  versionName: string;
  classification: string;
  fileName: string;
  fileSize: number;
  enabled: boolean;
  installedAt: string;
  updatedAt: string;
  isLocal?: boolean;
  fileExists?: boolean;
}

export interface ModsData {
  version: number;
  apiKey: string | null;
  mods: InstalledMod[];
}

export interface ModMetadata {
  providerId?: string;
  projectId?: string;
  projectSlug?: string | null;
  projectTitle: string;
  projectIconUrl?: string | null;
  versionId?: string;
  versionName: string;
  classification?: string;
  fileName?: string;
}

export interface OperationResult {
  success: boolean;
  error?: string;
}

export interface ModResult extends OperationResult {
  mod?: InstalledMod | null;
}

export interface ModsListResult extends OperationResult {
  mods: InstalledMod[];
}

async function ensureModsSetup(): Promise<OperationResult> {
  try {
    await docker.execCommand(`mkdir -p "${MODS_DIR}"`, 5000);
    const checkResult = await docker.execCommand(`cat "${METADATA_FILE}" 2>/dev/null || echo "NOT_FOUND"`);

    if (checkResult.includes('NOT_FOUND')) {
      const initialData = JSON.stringify({ version: 1, apiKey: null, mods: [] }, null, 2);
      const pack = tar.pack();
      pack.entry({ name: path.basename(METADATA_FILE) }, initialData);
      pack.finalize();
      await docker.putArchive(pack, { path: path.dirname(METADATA_FILE) });
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

async function loadMods(): Promise<{ success: boolean; data: ModsData; error?: string }> {
  try {
    await ensureModsSetup();

    const stream = await docker.getArchive(METADATA_FILE);

    return new Promise((resolve, reject) => {
      const extract = tar.extract();
      let content = '';

      extract.on('entry', (_header, entryStream, next) => {
        const chunks: Buffer[] = [];
        entryStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        entryStream.on('end', () => {
          content = Buffer.concat(chunks).toString('utf8');
          next();
        });
        entryStream.resume();
      });

      extract.on('finish', () => {
        try {
          const data = JSON.parse(content) as ModsData;
          resolve({ success: true, data });
        } catch {
          resolve({ success: true, data: { version: 1, apiKey: null, mods: [] } });
        }
      });

      extract.on('error', reject);
      stream.pipe(extract);
    });
  } catch (e) {
    return { success: false, error: (e as Error).message, data: { version: 1, apiKey: null, mods: [] } };
  }
}

async function saveMods(modsData: ModsData): Promise<OperationResult> {
  try {
    const content = JSON.stringify(modsData, null, 2);
    const pack = tar.pack();
    pack.entry({ name: path.basename(METADATA_FILE) }, content);
    pack.finalize();

    await docker.putArchive(pack, { path: path.dirname(METADATA_FILE) });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function listInstalledMods(): Promise<ModsListResult> {
  try {
    const result = await loadMods();
    if (!result.success) {
      return { success: false, error: result.error, mods: [] };
    }

    const lsResult = await docker.execCommand(
      `ls -la "${MODS_DIR}" 2>/dev/null | grep -E "\\.(jar|disabled|zip)$" || echo ""`
    );

    const filesInDir: Array<{ fileName: string; fileSize: number }> = [];
    const knownFileNames = new Set(result.data.mods.map((m) => m.fileName));
    const knownFileNamesDisabled = new Set(result.data.mods.map((m) => `${m.fileName}.disabled`));

    for (const line of lsResult.split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 9) {
        const fileName = parts.slice(8).join(' ');
        const fileSize = Number.parseInt(parts[4], 10) || 0;
        if (fileName.endsWith('.jar') || fileName.endsWith('.disabled') || fileName.endsWith('.zip')) {
          filesInDir.push({ fileName, fileSize });
        }
      }
    }

    const existingFiles = new Set(filesInDir.map((f) => f.fileName));

    const mods = result.data.mods
      .map((mod) => {
        const enabledExists = existingFiles.has(mod.fileName);
        const disabledExists = existingFiles.has(`${mod.fileName}.disabled`);

        return {
          ...mod,
          enabled: enabledExists && !disabledExists,
          fileExists: enabledExists || disabledExists
        };
      })
      .filter((mod) => mod.fileExists);

    let needsSave = false;
    for (const file of filesInDir) {
      const baseFileName = file.fileName.replace('.disabled', '');

      if (knownFileNames.has(baseFileName) || knownFileNames.has(file.fileName)) {
        continue;
      }
      if (knownFileNamesDisabled.has(file.fileName)) {
        continue;
      }

      const isDisabled = file.fileName.endsWith('.disabled');
      const actualFileName = isDisabled ? file.fileName.replace('.disabled', '') : file.fileName;

      const modName = actualFileName.replace(/\.(jar|zip)$/, '').replace(/-/g, ' ');

      const newMod = {
        id: crypto.randomUUID(),
        providerId: 'local',
        projectId: null,
        projectTitle: modName,
        projectIconUrl: null,
        versionId: null,
        versionName: 'Unknown',
        classification: 'PLUGIN',
        fileName: actualFileName,
        fileSize: file.fileSize,
        enabled: !isDisabled,
        installedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isLocal: true,
        fileExists: true
      };

      mods.push(newMod);
      result.data.mods.push(newMod);
      knownFileNames.add(actualFileName);
      needsSave = true;
    }

    if (needsSave) {
      await saveMods(result.data);
    }

    return { success: true, mods };
  } catch (e) {
    return { success: false, error: (e as Error).message, mods: [] };
  }
}

export async function installMod(fileBuffer: Buffer, metadata: ModMetadata): Promise<ModResult> {
  try {
    await ensureModsSetup();

    const modId = crypto.randomUUID();
    const fileName =
      metadata.fileName || `${metadata.projectTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${metadata.versionName}.jar`;

    const pack = tar.pack();
    pack.entry({ name: fileName }, fileBuffer);
    pack.finalize();

    await docker.putArchive(pack, { path: MODS_DIR });

    const result = await loadMods();
    const modsData = result.data;

    const existingIndex = modsData.mods.findIndex(
      (m) => m.projectId === metadata.projectId && m.versionId === metadata.versionId
    );

    const modEntry: InstalledMod = {
      id: existingIndex >= 0 ? modsData.mods[existingIndex].id : modId,
      providerId: metadata.providerId || 'modtale',
      projectId: metadata.projectId || null,
      projectSlug: metadata.projectSlug || null,
      projectTitle: metadata.projectTitle,
      projectIconUrl: metadata.projectIconUrl || null,
      versionId: metadata.versionId || null,
      versionName: metadata.versionName,
      classification: metadata.classification || 'PLUGIN',
      fileName,
      fileSize: fileBuffer.length,
      enabled: true,
      installedAt: existingIndex >= 0 ? modsData.mods[existingIndex].installedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      if (modsData.mods[existingIndex].fileName !== fileName) {
        await docker.execCommand(
          `rm -f "${MODS_DIR}/${modsData.mods[existingIndex].fileName}" "${MODS_DIR}/${modsData.mods[existingIndex].fileName}.disabled"`,
          5000
        );
      }
      modsData.mods[existingIndex] = modEntry;
    } else {
      modsData.mods.push(modEntry);
    }

    await saveMods(modsData);

    return { success: true, mod: modEntry };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function uninstallMod(modId: string): Promise<OperationResult> {
  try {
    const result = await loadMods();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const modsData = result.data;
    const modIndex = modsData.mods.findIndex((m) => m.id === modId);

    if (modIndex < 0) {
      return { success: false, error: 'Mod not found' };
    }

    const mod = modsData.mods[modIndex];

    await docker.execCommand(`rm -f "${MODS_DIR}/${mod.fileName}" "${MODS_DIR}/${mod.fileName}.disabled"`, 5000);

    modsData.mods.splice(modIndex, 1);
    await saveMods(modsData);

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function enableMod(modId: string): Promise<ModResult> {
  try {
    const result = await loadMods();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const modsData = result.data;
    const mod = modsData.mods.find((m) => m.id === modId);

    if (!mod) {
      return { success: false, error: 'Mod not found' };
    }

    const disabledPath = `${MODS_DIR}/${mod.fileName}.disabled`;
    const enabledPath = `${MODS_DIR}/${mod.fileName}`;

    const checkResult = await docker.execCommand(`test -f "${disabledPath}" && echo "EXISTS" || echo "NOT_FOUND"`);

    if (checkResult.includes('EXISTS')) {
      await docker.execCommand(`mv "${disabledPath}" "${enabledPath}"`, 5000);
    }

    mod.enabled = true;
    mod.updatedAt = new Date().toISOString();
    await saveMods(modsData);

    return { success: true, mod };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function disableMod(modId: string): Promise<ModResult> {
  try {
    const result = await loadMods();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const modsData = result.data;
    const mod = modsData.mods.find((m) => m.id === modId);

    if (!mod) {
      return { success: false, error: 'Mod not found' };
    }

    const enabledPath = `${MODS_DIR}/${mod.fileName}`;
    const disabledPath = `${MODS_DIR}/${mod.fileName}.disabled`;

    const checkResult = await docker.execCommand(`test -f "${enabledPath}" && echo "EXISTS" || echo "NOT_FOUND"`);

    if (checkResult.includes('EXISTS')) {
      await docker.execCommand(`mv "${enabledPath}" "${disabledPath}"`, 5000);
    }

    mod.enabled = false;
    mod.updatedAt = new Date().toISOString();
    await saveMods(modsData);

    return { success: true, mod };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getMod(modId: string): Promise<ModResult> {
  try {
    const result = await loadMods();
    if (!result.success) {
      return { success: false, error: result.error };
    }
    const mod = result.data.mods.find((m) => m.id === modId);
    return { success: true, mod: mod || null };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateMod(modId: string, updates: Partial<InstalledMod>): Promise<ModResult> {
  try {
    const result = await loadMods();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const modsData = result.data;
    const modIndex = modsData.mods.findIndex((m) => m.id === modId);

    if (modIndex < 0) {
      return { success: false, error: 'Mod not found' };
    }

    modsData.mods[modIndex] = {
      ...modsData.mods[modIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await saveMods(modsData);
    return { success: true, mod: modsData.mods[modIndex] };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
