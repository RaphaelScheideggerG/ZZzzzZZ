import { Box } from '@mantine/core';
import type { ChatMessage, RoomState } from '../hooks/useZzzRoom';

import Video from './Video';
import Chat from './Chat';

type PlayerProps = {
  roomState: RoomState | null;
  onSelectVideo: (videoId: string) => Promise<void>;

  // Dados e ação do chat, recebidos do hook.
  messages: ChatMessage[];
  userId: string | null;
  onSendMessage: (body: string) => Promise<void>;
};

export default function Player({
  roomState,
  onSelectVideo,
  messages,
  userId,
  onSendMessage,
}: PlayerProps) {
  return (
    <Box
      pos="relative"
      w="100%"
      h="100%"
      bg="#000000"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Video
        roomState={roomState}
        onSelectVideo={onSelectVideo}
      />

      <Chat
        messages={messages}
        userId={userId}
        onSendMessage={onSendMessage}
      />
    </Box>
  );
}