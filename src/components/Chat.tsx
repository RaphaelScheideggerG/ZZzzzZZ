import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import {
  ActionIcon,
  Box,
  Group,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';

import {
  IconMessage,
  IconSend,
  IconX,
} from '@tabler/icons-react';

import type { ChatMessage } from '../hooks/useZzzRoom';

type ChatProps = {
  messages: ChatMessage[];
  userId: string | null;
  onSendMessage: (body: string) => Promise<void>;
};

export default function Chat({
  messages,
  userId,
  onSendMessage,
}: ChatProps) {
  const [showChat, setShowChat] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatHeight, setChatHeight] = useState(220);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const isResizing = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async () => {
    const body = chatInput.trim();

    if (!body || isSending) return;

    setIsSending(true);
    setSendError('');

    try {
      await onSendMessage(body);
      setChatInput('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setSendError('Não foi possível enviar a mensagem.');
    } finally {
      setIsSending(false);
    }
  };

  const handleResizeStart = (
    e: ReactPointerEvent<HTMLDivElement>,
  ) => {
    e.preventDefault();
    isResizing.current = true;

    const startY = e.clientY;
    const startHeight = chatHeight;

    const handlePointerMove = (event: PointerEvent) => {
      if (!isResizing.current) return;

      const delta = startY - event.clientY;

      setChatHeight(
        Math.min(600, Math.max(50, startHeight + delta)),
      );
    };

    const handlePointerUp = () => {
      isResizing.current = false;

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Box
      pos="absolute"
      bottom={16}
      right={16}
      left={16}
      style={{
        maxWidth: 340,
        marginLeft: 'auto',
        zIndex: 20,
        pointerEvents: 'none', // Permite clicar no vídeo nos espaços vazios
      }}
    >
      {showChat ? (
        <Stack
          gap="xs"
          p="sm"
          style={{
            pointerEvents: 'auto',
            background: 'transparent', // 100% transparente (sem container escuro em volta)
            border: 'none',
            boxShadow: 'none',
          }}
        >
            <Box
            onPointerDown={handleResizeStart}
            style={{
                width: 42,
                height: 5,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.4)',
                cursor: 'ns-resize',
                alignSelf: 'center',
                touchAction: 'none',
                flexShrink: 0,
            }}
            />
          {/* Header do Chat (Minimalista) */}
          <Group justify="space-between" align="center" pb={2}>
            <ActionIcon
              variant="subtle"
              color="white"
              size="l"
              onClick={() => setShowChat(false)}
              style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '50%' }}
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>

          {/* Mensagens */}
          <ScrollArea h={chatHeight} scrollbars="y" offsetScrollbars>
            <Stack gap={8} pr="xs">
              {messages.map((msg) => {
                const isYou = msg.sender_id === userId;

                const time = new Date(msg.created_at).toLocaleTimeString(
                  [],
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                  },
                );

                return (
                  <Box
                    key={msg.id}
                    style={{
                      alignSelf: isYou ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                    }}
                  >
                    <Text
                      size="10px"
                      c="rgba(255,255,255,0.75)"
                      mb={3}
                      style={{
                        textAlign: isYou ? 'right' : 'left',
                        textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                      }}
                    >
                      {msg.sender_name}
                    </Text>

                    <Box
                      px="md"
                      py={6}
                      style={{
                        borderRadius: isYou
                          ? '16px 16px 4px 16px'
                          : '16px 16px 16px 4px',
                        background: isYou
                          ? 'rgba(214, 51, 108, 0.85)'
                          : 'rgba(20, 20, 25, 0.85)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                      }}
                    >
                      <Text
                        size="xs"
                        c="white"
                        style={{
                          wordBreak: 'break-word',
                          fontWeight: 500,
                        }}
                      >
                        {msg.body}
                      </Text>
                    </Box>

                    <Text
                      size="9px"
                      c="rgba(255,255,255,0.6)"
                      mt={2}
                      style={{
                        textAlign: isYou ? 'right' : 'left',
                        textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                      }}
                    >
                      {time}
                    </Text>
                  </Box>
                );
              })}
              <div ref={bottomRef} />
            </Stack>
          </ScrollArea>

          {/* Field para enviar */}
          <Group gap={6} mt={2}>
            <TextInput
              placeholder="Diga algo ..."
              size="xs"
              radius="xl"
              value={chatInput}
              maxLength={1000}
              onChange={(e) => setChatInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSendMessage();
                }
              }}
              style={{ flex: 1 }}
              styles={{
                input: {
                  backgroundColor: 'rgba(10, 10, 15, 0.75)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  fontSize: '12px',
                  backdropFilter: 'blur(4px)',
                  '&:focus': {
                    borderColor: 'rgba(230, 73, 128, 0.9)',
                  },
                },
              }}
            />
            <ActionIcon
              variant="filled"
              color="pink"
              radius="xl"
              size="md"
              onClick={() => void handleSendMessage()}
              loading={isSending}
              disabled={!chatInput.trim() || isSending}
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
            >
              <IconSend size={14} />
            </ActionIcon>
          </Group>
          {sendError && (
            <Text size="xs" c="red">
              {sendError}
            </Text>
          )}
        </Stack>
      ) : (
        /* Botão flutuante minimalista para reabrir o chat quando fechado */
        <Box
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            pointerEvents: 'auto',
          }}
        >
          <ActionIcon
            variant="subtle"
            color="pink"
            radius="xl"
            size="lg"
            onClick={() => setShowChat(true)}
            style={{
              background: 'rgba(10, 10, 14, 0.6)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <IconMessage size={18} />
          </ActionIcon>
        </Box>
      )}
    </Box>
  );
}