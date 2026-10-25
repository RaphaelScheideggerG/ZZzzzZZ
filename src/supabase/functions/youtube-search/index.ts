import { withSupabase } from 'npm:@supabase/server@1';

type YouTubeItem = {
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

type SearchResult = {
  videoId: string;
  title: string;
  author: string;
  thumbnailUrl: string;
};

type YouTubeResponse = {
  items?: YouTubeItem[];
  error?: {
    message?: string;
    errors?: { reason?: string }[];
  };
};

function errorMessage(reason?: string, googleMessage?: string): string {
  switch (reason) {
    case 'quotaExceeded':
    case 'dailyLimitExceeded':
      return 'A cota diária de buscas do YouTube foi atingida. Tente novamente amanhã.';
    case 'keyInvalid':
      return 'A chave do YouTube configurada nos secrets do Supabase é inválida.';
    case 'accessNotConfigured':
      return 'Ative a YouTube Data API v3 no projeto do Google Cloud usado pela chave.';
    case 'forbidden':
      return 'O Google recusou a solicitação. Confira se a YouTube Data API v3 está ativada e permitida para a chave.';
    default:
      return googleMessage || 'O YouTube não conseguiu concluir a busca agora. Tente novamente.';
  }
}

export default {
  // A plataforma deixa o wrapper validar a publishable key, sem exigir login individual.
  fetch: withSupabase({ auth: 'publishable' }, async (req: Request) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Use POST para buscar vídeos.' }, { status: 405 });
    }

    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!apiKey) {
      console.error('Missing YOUTUBE_API_KEY secret.');
      return Response.json(
        { error: 'A busca ainda não foi configurada pelo responsável pelo ZZzzzzz.' },
        { status: 500 },
      );
    }

    let query = '';
    try {
      const body = (await req.json()) as { query?: unknown };
      query = typeof body.query === 'string' ? body.query.trim().slice(0, 150) : '';
    } catch {
      return Response.json({ error: 'A busca enviada não é válida.' }, { status: 400 });
    }

    if (!query) {
      return Response.json({ error: 'Digite o nome de um vídeo ou artista.' }, { status: 400 });
    }

    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: '6',
      q: query,
      regionCode: 'BR',
      relevanceLanguage: 'pt',
      key: apiKey,
    });

    let googleResponse: Response;
    try {
      googleResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
    } catch (error) {
      console.error('YouTube request failed:', error);
      return Response.json(
        { error: 'Não foi possível conectar ao YouTube. Confira a conexão e tente novamente.' },
        { status: 502 },
      );
    }

    const googleData = (await googleResponse.json().catch(() => ({}))) as YouTubeResponse;

    if (!googleResponse.ok) {
      const reason = googleData.error?.errors?.[0]?.reason;
      const friendlyMessage = errorMessage(reason, googleData.error?.message);
      console.error('YouTube Data API error:', googleResponse.status, reason, googleData.error?.message);
      const status = reason === 'quotaExceeded' || reason === 'dailyLimitExceeded' ? 429 : 502;
      return Response.json({ error: friendlyMessage }, { status });
    }

    const items: SearchResult[] = [];
    for (const item of googleData.items ?? []) {
      const videoId = item.id?.videoId;
      const snippet = item.snippet;
      if (!videoId || !snippet) continue;

      items.push({
        videoId,
        title: snippet.title ?? 'Vídeo sem título',
        author: snippet.channelTitle ?? 'Canal desconhecido',
        thumbnailUrl:
          snippet.thumbnails?.medium?.url ??
          snippet.thumbnails?.high?.url ??
          snippet.thumbnails?.default?.url ??
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
    }

    return Response.json({ items });
  }),
};
