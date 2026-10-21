import { useState, type FormEvent } from 'react';
import {
  ActionIcon,
  Box,
  Group,
  Image,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Transition,
  UnstyledButton,
} from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';

type SearchResult = {
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

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const YOUTUBE_SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';

function isYouTubeUrl(input: string): boolean {
  return /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(input);
}

/** Extracts an 11-character video ID from common YouTube link formats. */
function getYouTubeVideoId(input: string): string | null {
  let url: URL;
  try {
    const normalized = /^https?:\/\//i.test(input) ? input : `https://${input}`;
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
      const match = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?]+)/);
      videoId = match?.[1] ?? null;
    }
  }

  return videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? videoId : null;
}

function getSearchError(response: YouTubeSearchResponse, status: number): string {
  const reason = response.error?.errors?.[0]?.reason;

  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
    return 'A cota diária da busca do YouTube foi atingida. Tente novamente amanhã.';
  }
  if (reason === 'keyInvalid') {
    return 'A chave da API parece inválida. Confira VITE_YOUTUBE_API_KEY no .env.local.';
  }
  if (reason === 'accessNotConfigured') {
    return 'Ative a YouTube Data API v3 no projeto do Google Cloud usado pela chave.';
  }
  if (status === 403) {
    return 'O Google recusou a chave. Confira as restrições da chave, a API ativada e a cota.';
  }
  if (status === 400) {
    return 'A busca foi recusada. Confira a configuração da API e tente outro termo.';
  }

  return response.error?.message || 'Não foi possível buscar vídeos agora. Confira a conexão e tente novamente.';
}

export default function Video() {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectVideo = (id: string) => {
    setVideoId(id);
    setShowSearch(false);
    setQuery('');
    setSearchResults([]);
    setError('');
  };

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = query.trim();
    if (!input || loading) return;

    setError('');
    setSearchResults([]);

    // Link direto não precisa consumir a cota da API de busca.
    if (isYouTubeUrl(input)) {
      const id = getYouTubeVideoId(input);
      if (!id) {
        setError('Esse link não parece conter um ID de vídeo válido do YouTube.');
        return;
      }
      selectVideo(id);
      return;
    }

    if (!YOUTUBE_API_KEY) {
      setError('Falta configurar VITE_YOUTUBE_API_KEY no arquivo .env.local. Veja SETUP.md.');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        maxResults: '6',
        q: input,
        regionCode: 'BR',
        relevanceLanguage: 'pt',
        key: YOUTUBE_API_KEY,
      });

      const response = await fetch(`${YOUTUBE_SEARCH_ENDPOINT}?${params.toString()}`);
      const data = (await response.json()) as YouTubeSearchResponse;

      if (!response.ok) {
        throw new Error(getSearchError(data, response.status));
      }

      const results: SearchResult[] = (data.items ?? [])
        .map((item) => {
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
          } satisfies SearchResult;
        })
        .filter((item): item is SearchResult => item !== null);

      setSearchResults(results);
      if (results.length === 0) {
        setError('Não encontrei vídeos para essa busca. Tente outras palavras.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha inesperada ao buscar vídeos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      pos="relative"
      w="100%"
      h="100%"
      mih={260}
      bg="#000"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: 12,
      }}
    >
      {videoId ? (
        <iframe
          key={videoId}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
          title="ZZzzzzz — player de vídeo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      ) : (
        <Stack align="center" gap="xs" style={{ userSelect: 'none', pointerEvents: 'none' }}>
          <Text size="xl">🌙</Text>
          <Text c="gray.5" size="sm" fw={500}>
            Nosso próximo vídeo começa aqui.
          </Text>
        </Stack>
      )}

      <Box pos="absolute" top={14} left={14} style={{ zIndex: 5 }}>
        <ActionIcon
          type="button"
          aria-label={showSearch ? 'Fechar busca' : 'Buscar vídeo'}
          title={showSearch ? 'Fechar busca' : 'Buscar vídeo'}
          variant="subtle"
          color="gray"
          radius="xl"
          size="lg"
          onClick={() => {
            setShowSearch((current) => !current);
            setError('');
          }}
          style={{
            color: 'white',
            background: showSearch ? 'rgba(230, 73, 128, 0.45)' : 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <IconPlus
            size={18}
            style={{ transform: showSearch ? 'rotate(45deg)' : 'none', transition: 'transform 180ms ease' }}
          />
        </ActionIcon>
      </Box>

      <Transition mounted={showSearch} transition="pop-top-left" duration={180}>
        {(transitionStyles) => (
          <Box
            pos="absolute"
            top={62}
            left={14}
            right={14}
            style={{ ...transitionStyles, maxWidth: 420, zIndex: 5 }}
          >
            <Stack gap={8}>
              <Paper
                component="form"
                onSubmit={handleSearch}
                p={6}
                radius="xl"
                style={{
                  background: 'rgba(16, 16, 20, 0.92)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                }}
              >
                <Group gap="xs" wrap="nowrap">
                  <TextInput
                    autoFocus
                    aria-label="Buscar vídeos ou colar link do YouTube"
                    placeholder="Digite uma busca ou cole um link..."
                    size="sm"
                    variant="unstyled"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.currentTarget.value);
                      setError('');
                    }}
                    style={{ flex: 1, paddingLeft: 10 }}
                    styles={{ input: { color: '#fff', fontSize: 13 } }}
                  />
                  <ActionIcon
                    type="submit"
                    aria-label="Pesquisar"
                    variant="filled"
                    color="pink"
                    radius="xl"
                    size="lg"
                    loading={loading}
                    disabled={!query.trim()}
                  >
                    <IconSearch size={15} />
                  </ActionIcon>
                </Group>
              </Paper>

              {error && (
                <Paper
                  p="sm"
                  radius="md"
                  style={{
                    background: 'rgba(16, 16, 20, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                >
                  <Text size="xs" c="red.3" role="status">
                    {error}
                  </Text>
                </Paper>
              )}

              {searchResults.length > 0 && (
                <Paper
                  p="xs"
                  radius="lg"
                  style={{
                    background: 'rgba(16, 16, 20, 0.94)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                  }}
                >
                  <ScrollArea h={240} type="auto" offsetScrollbars>
                    <Stack gap={5} pr="xs">
                      {searchResults.map((video) => (
                        <UnstyledButton
                          key={video.videoId}
                          onClick={() => selectVideo(video.videoId)}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: 6,
                            borderRadius: 10,
                            color: 'white',
                            textAlign: 'left',
                          }}
                        >
                          <Group wrap="nowrap" gap="sm">
                            <Image
                              src={video.thumbnailUrl}
                              alt=""
                              w={76}
                              h={43}
                              radius="sm"
                              fit="cover"
                              fallbackSrc="https://placehold.co/152x86/17171c/ffffff?text=YouTube"
                            />
                            <Box style={{ flex: 1, minWidth: 0 }}>
                              <Text size="xs" fw={600} c="white" lineClamp={2}>
                                {video.title}
                              </Text>
                              <Text size="10px" c="gray.4" lineClamp={1} mt={3}>
                                {video.author}
                              </Text>
                            </Box>
                          </Group>
                        </UnstyledButton>
                      ))}
                    </Stack>
                  </ScrollArea>
                </Paper>
              )}
            </Stack>
          </Box>
        )}
      </Transition>
    </Box>
  );
}
