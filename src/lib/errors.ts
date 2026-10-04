/**
 * Translate yt-dlp / backend error text into Chinese for display.
 * The raw text is kept only for "复制错误信息" and never shown in the UI.
 */

export type ErrorAction = 'cookie-access' | 'enable-cookie';

export interface FriendlyError {
  title: string;
  hint?: string;
  /** Extra UI action the error suggests */
  action?: ErrorAction;
  raw: string;
}

interface Rule {
  test: RegExp;
  title: string;
  hint?: string;
  action?: ErrorAction;
}

const ENABLE_COOKIE = '请在「下载」页启用 Cookie，并选择已登录该网站的浏览器后重试';
const CHECK_NETWORK = '请检查网络连接，或在「设置 → 网络设置」中配置代理';
const UPDATE_ENGINE = '网站可能已改版，请到「设置 → 下载引擎」检查更新';

// Ordered: the first match wins, so specific causes come before generic ones
const RULES: Rule[] = [
  // Browser cookies
  { test: /cookies database|binarycookies|Operation not permitted.*(Chrome|Safari|Firefox|Edge|Brave|Cookies)/i,
    title: '无法读取浏览器 Cookie', action: 'cookie-access',
    hint: 'macOS 阻止了 xVideo 读取浏览器数据，请在「系统设置 → 隐私与安全性 → 完全磁盘访问权限」中添加并勾选 xVideo，然后重启 xVideo' },
  { test: /database is locked|could not copy .*cookie/i,
    title: '浏览器 Cookie 数据库被占用', hint: '请完全退出该浏览器后重试' },
  { test: /cannot decrypt|failed to decrypt|keyring|keychain/i,
    title: '无法解密浏览器 Cookie', hint: '请在弹出的钥匙串授权窗口中点击「允许」，或改用「手动选择 Cookie 文件」' },
  { test: /Fresh cookies .*needed|抖音拒绝了请求/i,
    title: '抖音拒绝了请求', action: 'enable-cookie',
    hint: '请先在浏览器中打开 douyin.com（无需登录），再在「下载」页启用 Cookie 后重试' },

  // YouTube
  { test: /Sign in to confirm you.?re not a bot/i,
    title: 'YouTube 要求验证你不是机器人', hint: ENABLE_COOKIE, action: 'enable-cookie' },
  { test: /Sign in to confirm your age|age.?restricted|inappropriate for some users/i,
    title: '该视频有年龄限制', hint: ENABLE_COOKIE, action: 'enable-cookie' },
  { test: /challenge solving failed|Error solving .* challenge|page needs to be reloaded/i,
    title: 'YouTube 视频校验失败', hint: '请稍后重试；若持续出现，请到「设置 → 下载引擎」检查更新' },
  { test: /members.?only|Join this channel/i,
    title: '仅频道会员可观看', hint: ENABLE_COOKIE, action: 'enable-cookie' },
  { test: /Music Premium|requires payment|purchase/i,
    title: '该内容需要付费或会员才能观看' },
  { test: /Private video|This video is private/i,
    title: '这是私享视频', hint: '需要登录有观看权限的账号，' + ENABLE_COOKIE, action: 'enable-cookie' },
  { test: /live event will begin|Premieres in|is not currently live|This live stream recording is not available/i,
    title: '直播或首映尚未开始，暂时无法下载' },

  // Availability
  { test: /not (?:made )?available in your country|geo.?restrict|blocked it in your country/i,
    title: '该视频在你所在的地区不可用', hint: '可在「设置 → 网络设置」中配置其他地区的代理' },
  { test: /Video unavailable|This video is no longer available|has been removed|account .* terminated/i,
    title: '视频不可用', hint: '可能已被删除、设为私享，或在你所在的地区不可用' },
  { test: /DRM/,
    title: '该视频受 DRM 版权保护，无法下载' },
  { test: /Unsupported URL/i,
    title: '暂不支持该链接', hint: '请确认链接来自支持的网站，并且是视频页面的地址' },
  { test: /is not a valid URL|Invalid URL|no suitable InfoExtractor/i,
    title: '链接格式不正确', hint: '请粘贴完整的视频页面链接（以 http 或 https 开头）' },
  { test: /There'?s no video in this|No video formats found|no video could be found/i,
    title: '该链接中没有可下载的视频' },
  { test: /Requested format is not available/i,
    title: '所选格式不可用', hint: '请改选其他格式，或选择「最佳质量」' },

  // HTTP
  { test: /HTTP Error 429|Too Many Requests/i,
    title: '请求过于频繁，被网站暂时限制', hint: '请稍等几分钟再试，或启用 Cookie' },
  { test: /HTTP Error 403|Forbidden/i,
    title: '网站拒绝了访问（403）', hint: `可尝试启用 Cookie 或更换代理；${UPDATE_ENGINE}` },
  { test: /HTTP Error 412/i,
    title: '网站拒绝了请求（412）', hint: ENABLE_COOKIE, action: 'enable-cookie' },
  { test: /HTTP Error 401|Unauthorized/i,
    title: '需要登录才能访问', hint: ENABLE_COOKIE, action: 'enable-cookie' },
  { test: /HTTP Error 404/i,
    title: '内容不存在（404）', hint: '请确认链接是否正确，视频可能已被删除' },
  { test: /HTTP Error 5\d\d/i,
    title: '网站服务器出错', hint: '请稍后重试' },

  // Network
  { test: /timed? ?out|Read timed out|Operation timed out/i,
    title: '网络连接超时', hint: CHECK_NETWORK },
  { test: /SSL|CERTIFICATE_VERIFY_FAILED|certificate/i,
    title: '安全连接失败', hint: '可能是代理或网络环境拦截了 HTTPS 连接，' + CHECK_NETWORK },
  { test: /代理地址无效/,
    title: '代理地址无效', hint: '请在「设置 → 网络设置」中检查代理格式，例如 http://127.0.0.1:7890' },
  { test: /Unable to connect|Connection refused|Connection reset|nodename nor servname|Name or service not known|getaddrinfo|Network is unreachable|dns error|error sending request|ProxyError|Tunnel connection failed/i,
    title: '无法连接到服务器', hint: CHECK_NETWORK },

  // Local / post-processing
  { test: /No space left on device/i,
    title: '磁盘空间不足', hint: '请清理磁盘空间，或在设置中更换保存路径' },
  { test: /Permission denied|Operation not permitted|Read-only file system/i,
    title: '没有写入权限', hint: '请在设置中更换保存路径，或检查该文件夹的权限' },
  { test: /ffmpeg not found|ffprobe and ffmpeg not found|ffmpeg is not installed/i,
    title: '缺少 ffmpeg，无法合并或转码', hint: '内置组件缺失，请重新安装 xVideo' },
  { test: /Postprocessing|Conversion failed|ffmpeg exited|Error opening output|Invalid data found/i,
    title: '后期处理失败', hint: '合并或转码时出错，可尝试关闭「后处理选项」中的嵌入功能，或改选其他格式' },
  { test: /File name too long/i,
    title: '文件名过长', hint: '请在设置中缩短文件名模板，例如 %(title).80s.%(ext)s' },

  // Extraction
  { test: /Unable to extract|Unable to download (?:webpage|JSON|API)|Failed to parse JSON|Incomplete data received/i,
    title: '网站数据解析失败', hint: UPDATE_ENGINE },
  { test: /下载引擎缺失|无法启动下载引擎/,
    title: '下载引擎缺失或无法运行', hint: '请重新安装 xVideo' },
];

const CJK = /[一-鿿]/;

/** "ERROR: [youtube] abc: message" -> "message" */
function stripPrefix(line: string): string {
  return line.replace(/^(?:ERROR|WARNING):\s*/, '').replace(/^\[[^\]]+\]\s*(?:[\w-]+:\s*)?/, '').trim();
}

/** Keep the Chinese part of messages like "无法获取最新版本: error sending request ..." */
function chineseOnly(text: string): string {
  const parts = text.split(/[:：]\s+/);
  const kept: string[] = [];
  for (const part of parts) {
    if (!CJK.test(part) && kept.length > 0) break;
    kept.push(part);
  }
  return kept.join('：');
}

export function translateError(raw: string, fallbackTitle = '操作失败'): FriendlyError {
  const text = String(raw ?? '');
  const errorLines = text.split('\n').filter((l) => l.startsWith('ERROR:'));
  const primary = errorLines.length ? errorLines.join('\n') : text;

  // Match the actual error first, then anything in the accompanying warnings
  const rule = RULES.find((r) => r.test.test(primary)) ?? RULES.find((r) => r.test.test(text));
  if (rule) return { title: rule.title, hint: rule.hint, action: rule.action, raw: text };

  const message = stripPrefix(primary.split('\n')[0] ?? '');
  if (CJK.test(message)) return { title: chineseOnly(message), raw: text };

  return {
    title: fallbackTitle,
    hint: '未能识别具体原因，可点击「复制错误信息」发送给开发者排查',
    raw: text,
  };
}
