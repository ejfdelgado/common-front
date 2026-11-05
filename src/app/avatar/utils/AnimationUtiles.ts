import { HttpClient } from '@angular/common/http';
import { decode, encode } from '@msgpack/msgpack';
import { firstValueFrom } from 'rxjs';
import { FileService } from 'src/app/services/file.srv';
import { getBucketFilePath } from 'src/app/tools/BucketPaths';
import { MAX_FRAMES_PER_FILE, StoredAvatarAnimation } from 'src/types/BodyTypes';

const MAX_CONCURRENT_UPLOADS = 2;

/**
 * Inserts "_<sufix>" right before the file extension, keeping any query string/hash.
 * "folder/myfile.bin" + 1 => "folder/myfile_1.bin"
 * "folder/myfile" + 2 => "folder/myfile_2"
 */
export function getChunkPath(path: string, sufix?: number): string {
  if (!sufix) {
    return path;
  }
  const queryIndex = path.search(/[?#]/);
  const base = queryIndex >= 0 ? path.substring(0, queryIndex) : path;
  const tail = queryIndex >= 0 ? path.substring(queryIndex) : '';
  const lastSlash = base.lastIndexOf('/');
  const lastDot = base.lastIndexOf('.');
  if (lastDot > lastSlash + 1) {
    return `${base.substring(0, lastDot)}_${sufix}${base.substring(lastDot)}${tail}`;
  }
  return `${base}_${sufix}${tail}`;
}

export async function uploadAnimationToBucket(
  bucketPath: string,
  completeData: StoredAvatarAnimation,
  fileSrv: FileService,
) {
  delete completeData.url;
  delete completeData.lock;
  const frames = completeData.a ?? [];
  const totalChunks = Math.max(1, Math.ceil(frames.length / MAX_FRAMES_PER_FILE));
  const uploadChunk = async (i: number) => {
    const chunk: StoredAvatarAnimation = {
      ...completeData,
      a: frames.slice(i * MAX_FRAMES_PER_FILE, (i + 1) * MAX_FRAMES_PER_FILE),
    };
    if (i + 1 < totalChunks) {
      chunk.nextSufix = i + 1;
    } else {
      delete chunk.nextSufix;
    }
    const encoded = encode(chunk);
    const blob = new Blob([encoded], { type: 'application/octet-stream' });
    await fileSrv.upload(getChunkPath(bucketPath, i), blob, 'bucket');
  };
  // Worker pool: at most MAX_CONCURRENT_UPLOADS uploads in flight at any time
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < totalChunks) {
      const i = nextIndex++;
      await uploadChunk(i);
    }
  };
  const workerCount = Math.max(1, Math.min(MAX_CONCURRENT_UPLOADS, totalChunks));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

async function loadChunk(url: string, http: HttpClient): Promise<StoredAvatarAnimation> {
  const completeUrl = getBucketFilePath(url);
  const loaded = await firstValueFrom(http.get(completeUrl, { responseType: 'arraybuffer' }));
  return decode(loaded) as StoredAvatarAnimation;
}

export async function loadAnimationFromBucket(
  url: string,
  http: HttpClient,
  onlyFirstChunk: boolean = false,
): Promise<StoredAvatarAnimation> {
  const model = await loadChunk(url, http);
  model.url = url; //self contained reference
  if (onlyFirstChunk) {
    return model;
  }
  const frames = model.a ?? [];
  const visited = new Set<number>();
  let nextSufix = model.nextSufix;
  while (nextSufix && !visited.has(nextSufix)) {
    visited.add(nextSufix);
    const chunk = await loadChunk(getChunkPath(url, nextSufix), http);
    if (chunk.a) {
      frames.push(...chunk.a);
    }
    nextSufix = chunk.nextSufix;
  }
  model.a = frames;
  delete model.nextSufix;
  return model;
}

export async function loadNextChunkIfNeeded(model: StoredAvatarAnimation, http: HttpClient) {
  if (!model.url || model.lock === true) {
    return;
  }
  model.lock = true;
  try {
    const frames = model.a ?? [];
    const chunk = await loadChunk(getChunkPath(model.url, model.nextSufix), http);
    if (chunk.a) {
      frames.push(...chunk.a);
    }
    model.nextSufix = chunk.nextSufix;
  } catch (err) {
  } finally {
    model.lock = false;
  }
}
