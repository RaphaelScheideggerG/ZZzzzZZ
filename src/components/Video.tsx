import { useState, useEffect, type FormEvent, useRef } from 'react';
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

import type { RoomState } from '../hooks/useZzzRoom';


declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

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

type VideoProps = {
  roomState: RoomState | null;
  onSelectVideo: (videoId: string) => Promise<void>;
};

export default function Video({ roomState, onSelectVideo }: VideoProps) {  
  // Local states
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Public states for synchronization 
  const [videoId, setVideoId] = useState<string | null>(null);
  const [speed, setSpeed] = useState<number>(1.0);

  const playerRef = useRef<any>(null);
  
  // O vídeo escolhido é salvo no estado compartilhado da sala.
  const selectVideo = async (id: string) => {
    setError('');
    try {
      await onSelectVideo(id);
      setShowSearch(false);
      setQuery('');
      setSearchResults([]);
    } catch (selectionError) {
      setError(
        selectionError instanceof Error
          ? selectionError.message
          : 'Não foi possível selecionar esse vídeo na sala.',
      );
    }
  };

  // Se outra pessoa trocar o vídeo, o player desta tela acompanha a sala.
  useEffect(() => {
    setVideoId(roomState?.video_id ?? null);
  }, [roomState?.video_id]);

  // 1. Inicializa o Player do YouTube
  useEffect(() => {
    if (!videoId) return;

    const initPlayer = () => {
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        playerRef.current.loadVideoById(videoId);
        playerRef.current.setPlaybackRate(speed);
        return;
      }

      window.YT.ready(() => {
        playerRef.current = new window.YT.Player('yt-player-box', {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
          },
          events: {
            onReady: (event: any) => {
              console.log('🎬 Player do YouTube pronto e rodando!');
              event.target.setPlaybackRate(speed);
              event.target.playVideo();
            },

            onPlaybackRateChange: (event: any) => {
              console.log('⚡ Velocidade alterada para:', event.data);
              setSpeed(event.data); // <-- Atualiza o state de velocidade
            },

            onStateChange: (event: any) => {
              // 1 = Reproduzindo (Play), 2 = Pausado (Pause)
              if (event.data === 1) {
                console.log('▶️ Play acionado!');
              }
              if (event.data === 2) {
                console.log('⏸️ Pause acionado!');
              }
            },
          },
        });
      });
    };

    if (!window.YT || !window.YT.Player) {
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = initPlayer;

      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          initPlayer();
        }
      }, 100);

      return () => clearInterval(checkInterval);
    } else {
      initPlayer();
    }
  }, [videoId]);

  // 2. Sempre que o speed mudar, aplica no player
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      playerRef.current.setPlaybackRate(speed);
    }
  }, [speed]);

  // 3. Sempre que o vídeo despausar, sincroniza tempo e velocidade com a sala
  // Apenas exemplo esboço
  useEffect(() => {
    if (!playerRef.current || !roomState) return;
  }, [roomState]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = query.trim();
    if (!input || loading) return;

    setError('');
    setSearchResults([]);

    if (isYouTubeUrl(input)) {
      const id = getYouTubeVideoId(input);
      if (!id) {
        setError('Link de vídeo inválido.');
        return;
      }
      void selectVideo(id);
      return;
    }

    if (!YOUTUBE_API_KEY) {
      setError('Falta configurar VITE_YOUTUBE_API_KEY no .env.local.');
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
        setError('Nenhum vídeo encontrado.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao buscar vídeos.');
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
      <Box
        id="yt-player-box"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: videoId ? 'block' : 'none',
        }}
      />

      {!videoId && (
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
          aria-label="Buscar vídeo"
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
                <Paper p="sm" radius="md" style={{ background: 'rgba(16, 16, 20, 0.95)', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <Text size="xs" c="red.3">{error}</Text>
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
                          onClick={() => void selectVideo(video.videoId)}
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