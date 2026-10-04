/**
 * Stable identity of a video across URL forms (youtu.be vs youtube.com/watch, share links, ...),
 * built from yt-dlp's extractor key and video id.
 */
export function videoKey(extractor?: string, id?: string): string | undefined {
  return extractor && id ? `${extractor.toLowerCase()}:${id}` : undefined;
}
