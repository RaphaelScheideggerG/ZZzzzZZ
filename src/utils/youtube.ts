export type SearchResult = {
  videoId: string;
  title: string;
  author: string;
  thumbnailUrl: string;
};

type YouTubeSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      medium?: { url?: string };
      high?: { url?: string };
      default?: { url?: string };
    };
  };
};

type YouTubeSearchResponse = {
  items?: YouTubeSearchItem[];
  error?: {
    message?: string;
    errors?: { reason?: string }[];
  };
};

const YOUTUBE_SEARCH_ENDPOINT =
  'https://www.googleapis.com/youtube/v3/search';

/** Returns true when the input looks like a YouTube URL. */
export function isYouTubeUrl(input: string): boolean {
  return /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(input);
}

/** Extracts an 11-character video ID from common YouTube URL formats. */
export function getYouTubeVideoId(input: string): string | null {
  let url: URL;

  try {
    const normalized = /^https?:\/\//i.test(input)
      ? input
      : `https://${input}`;

    url = new URL(normalized);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  let videoId: string | null = null;

  if (host === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    videoId = url.searchParams.get('v');

    if (!videoId) {
      const match = url.pathname.match(
        /^\/(?:embed|shorts|live|v)\/([^/?]+)/,
      );

      videoId = match?.[1] ?? null;
    }
  }

  return videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)
    ? videoId
    : null;
}

function getSearchError(
  response: YouTubeSearchResponse,
  status: number,
): string {
  const reason = response.error?.errors?.[0]?.reason;

  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
    return 'A cota diária da busca do YouTube foi atingida.';
  }

  if (reason === 'keyInvalid') {
    return 'A chave da API parece inválida em VITE_YOUTUBE_API_KEY.';
  }

  if (status === 403) {
    return 'O Google recusou a chave. Confira as restrições no Google Cloud.';
  }

  return response.error?.message || 'Não foi possível buscar vídeos agora.';
}

/** Searches YouTube videos and normalizes the API response for the UI. */
export async function searchYouTubeVideos(
  query: string,
  apiKey: string,
): Promise<SearchResult[]> {
  if (!apiKey) {
    throw new Error(
      'Falta configurar VITE_YOUTUBE_API_KEY no .env.local.',
    );
  }

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '20',
    q: query,
    regionCode: 'BR',
    relevanceLanguage: 'pt',
    key: apiKey,
  });

  const response = await fetch(
    `${YOUTUBE_SEARCH_ENDPOINT}?${params.toString()}`,
  );

  const data = (await response.json()) as YouTubeSearchResponse;

  if (!response.ok) {
    throw new Error(getSearchError(data, response.status));
  }

  return (data.items ?? [])
    .map((item): SearchResult | null => {
      const id = item.id?.videoId;
      const snippet = item.snippet;

      if (!id || !snippet) return null;

      return {
        videoId: id,
        title: snippet.title ?? 'Vídeo sem título',
        author: snippet.channelTitle ?? 'Canal desconhecido',
        thumbnailUrl:
          snippet.thumbnails?.medium?.url ??
          snippet.thumbnails?.high?.url ??
          snippet.thumbnails?.default?.url ??
          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    })
    .filter((item): item is SearchResult => item !== null);
}
