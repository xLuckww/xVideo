/**
 * Pull the first http(s) URL out of pasted text, e.g. Douyin share text like
 * "7.92 复制打开抖音，看看【xx的作品】… https://v.douyin.com/iAbCdEf/ 01/23 xxx:/".
 * Returns the trimmed input when it contains no URL.
 */
export function extractUrl(text: string): string {
  const match = text.match(/https?:\/\/[^\s<>"'，。！？、（）【】]+/);
  return match ? match[0] : text.trim();
}
