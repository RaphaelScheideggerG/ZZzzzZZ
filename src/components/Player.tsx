import { Box } from '@mantine/core';

import Video from './Video';
import Chat from './Chat';

  
export default function Player() {
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
      <Video />
      <Chat />
    </Box>
  );
}