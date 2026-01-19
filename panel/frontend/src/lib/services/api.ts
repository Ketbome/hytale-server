export interface UploadResponse {
  success: boolean;
  error?: string;
}

export async function uploadFile(
  file: File,
  targetDir: string,
  _onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('targetDir', targetDir);

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData
  });

  return await response.json();
}
