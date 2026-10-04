# xVideo 对 yt-dlp 抖音解析器的修补，通过 --plugin-dirs 加载。
#
# 上游 DouyinIE 请求 web detail 接口时经常被抖音风控（ArgusSecurityPlugin）以 403 拦截。
# 实测拦截带有随机性、与请求频率相关：带上 douyin.com 的 Cookie、间隔几秒重试，通常即可拿到数据。
# 因此这里改为带 impersonate 并重试，解析逻辑沿用上游 _parse_aweme_video_app。

import re
import time

from yt_dlp.extractor.common import InfoExtractor
from yt_dlp.extractor.tiktok import DouyinIE
from yt_dlp.utils import ExtractorError, traverse_obj


class _XVideoDouyinIE(DouyinIE, plugin_name='xvideo'):
    _DETAIL_ATTEMPTS = 4
    _RETRY_DELAY = 2.5

    def _real_extract(self, url):
        video_id = self._match_id(url)

        detail = None
        for attempt in range(1, self._DETAIL_ATTEMPTS + 1):
            if attempt > 1:
                self.to_screen(f'{video_id}: 被风控拦截，{self._RETRY_DELAY * (attempt - 1):.1f}s 后重试 ({attempt}/{self._DETAIL_ATTEMPTS})')
                time.sleep(self._RETRY_DELAY * (attempt - 1))
            detail = traverse_obj(self._download_json(
                'https://www.douyin.com/aweme/v1/web/aweme/detail/', video_id,
                'Downloading web detail JSON', 'Failed to download web detail JSON',
                query={'aweme_id': video_id}, headers={'Referer': self._WEBPAGE_HOST},
                impersonate=True, fatal=False), ('aweme_detail', {dict}))
            if detail:
                break
        if not detail:
            raise ExtractorError(
                '抖音拒绝了请求：请先在浏览器中打开 douyin.com（无需登录），再在 xVideo 中启用 Cookie 后重试',
                expected=True)

        return self._parse_aweme_video_app(detail)


class XVideoDouyinLinkIE(InfoExtractor):
    """短链接、分享页、图文、modal_id 等形式的抖音链接，统一转到标准视频地址。

    覆盖类在 lazy extractors 下无法扩展 _VALID_URL，所以单独用一个提取器做 URL 归一化。
    """
    IE_NAME = 'douyin:link'
    _SHORT_URL_RE = r'https?://v\.douyin\.com/(?P<id>[\w-]+)'
    _VALID_URL = [
        _SHORT_URL_RE,
        r'https?://(?:www\.)?iesdouyin\.com/share/(?:video|note)/(?P<id>[0-9]+)',
        r'https?://(?:www\.)?douyin\.com/note/(?P<id>[0-9]+)',
        r'https?://(?:www\.)?douyin\.com/[^?#]*\?(?:[^#]*&)?modal_id=(?P<id>[0-9]+)',
    ]
    _ID_IN_URL_RE = r'(?:/(?:video|note)/|[?&]modal_id=)(?P<id>[0-9]+)'

    def _real_extract(self, url):
        if re.match(self._SHORT_URL_RE, url):
            # v.douyin.com 短链接会跳转到 iesdouyin.com/share/video/<id>
            urlh = self._request_webpage(url, None, 'Resolving share link', impersonate=True)
            url = urlh.url
        video_id = self._search_regex(self._ID_IN_URL_RE, url, 'video id')
        return self.url_result(f'https://www.douyin.com/video/{video_id}', DouyinIE, video_id)
