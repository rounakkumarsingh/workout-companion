import { Directory, File, Paths } from 'expo-file-system';

const PHOTO_DIR_NAME = 'progress-photos';

function photoDirectory(): Directory {
  const dir = new Directory(Paths.document, PHOTO_DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/**
 * Copies a picked or captured image into the app's document directory and
 * returns its permanent URI. Picker URIs live in the cache and can disappear.
 */
export function storePhoto(sourceUri: string, id: string): string {
  const destination = new File(photoDirectory(), `${id}.jpg`);
  new File(sourceUri).copySync(destination);
  return destination.uri;
}

/** Removes a stored photo; a file that is already gone is not an error. */
export function deletePhotoFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (e) {
    console.warn('[photos] Could not delete photo file:', e);
  }
}
