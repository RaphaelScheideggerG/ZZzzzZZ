import { Box, Group, ActionIcon, Tooltip } from '@mantine/core';
import { IconShare } from '@tabler/icons-react';

import Player from './components/Player';

export default function App() {
  return (
    <Box
      pos="relative"
      w="100vw"
      h="100vh"
      bg="#0b0a0c"
      style={{ overflow: 'hidden' }}
    >
      {/* 1. PLAYER (Ocupa 100% da tela) */}
      <Box w="100%" h="100%" pos="relative" style={{ zIndex: 1 }}>
        <Player />
      </Box>

      {/* 2. BARRA DE TOPO MINIMALISTA (Flutuante) */}
      <Box
        pos="absolute"
        top={16}
        left={16}
        right={16}
        style={{
          zIndex: 10,
          pointerEvents: 'none', // Deixa cliques passarem para o player nos espaços vazios
        }}
      >
        <Group justify="flex-end" align="center" style={{ width: '100%' }}>
          {/* Botão de Compartilhar (Alinhado à Direita) */}
          <Group gap="xs" style={{ pointerEvents: 'auto' }}>
            <Tooltip label="Compartilhar" position="bottom">
              <ActionIcon
                variant="subtle"
                color="gray"
                radius="xl"
                size="lg"
                style={{
                  background: 'rgba(240, 224, 8, 0.05)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
                onClick={async () => {
                  const shareData = {
                    title: 'WatchTogether ❤️',
                    text: 'Vem assistir comigo!',
                    url: window.location.href,
                  };

                  // Usa o compartilhamento nativo do celular se disponível
                  if (navigator.share && navigator.canShare?.(shareData)) {
                    try {
                      await navigator.share(shareData);
                    } catch (err) {
                      // Caso o usuário cancele, ignora o erro
                    }
                  } else {
                    // Fallback para desktop: copia o link
                    await navigator.clipboard.writeText(window.location.href);
                    alert('Link copiado para a área de transferência!');
                  }
                }}
              >
                <IconShare size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Box>
    </Box>
  );
}