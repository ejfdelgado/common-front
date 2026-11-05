import { HttpClient } from '@angular/common/http';
import { decode, encode } from '@msgpack/msgpack';
import { firstValueFrom } from 'rxjs';
import { FileService } from 'src/app/services/file.srv';
import { getBucketFilePath } from 'src/app/tools/BucketPaths';
import { StoredAvatarAnimation } from 'src/types/BodyTypes';

export async function uploadAnimationToBucket(
  bucketPath: string,
  completeData: StoredAvatarAnimation,
  fileSrv: FileService,
) {
  const encoded = encode(completeData);
  const blob = new Blob([encoded], { type: 'application/octet-stream' });
  await fileSrv.upload(bucketPath, blob, 'bucket');
}

export async function loadAnimationFromBucket(url: string, http: HttpClient): Promise<StoredAvatarAnimation> {
  const completeUrl = getBucketFilePath(url);
  const loaded = await firstValueFrom(http.get(completeUrl, { responseType: 'arraybuffer' }));
  const model = decode(loaded);
  return model as StoredAvatarAnimation;
}
