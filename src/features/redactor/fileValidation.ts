import { APP_LIMITS, FILE_ACCEPT } from '../../lib/constants';

export function validateSelectedFile(file: File) {
  if (file.type && file.type !== FILE_ACCEPT) {
    throw new Error('Please choose a PDF file.');
  }

  const maximumBytes = APP_LIMITS.maxFileSizeMb * 1024 * 1024;
  if (file.size > maximumBytes) {
    throw new Error(`Files over ${APP_LIMITS.maxFileSizeMb} MB are outside the MVP limit.`);
  }
}
