import { useState } from 'react';

import Home from './pages/Home';
import Room from './pages/Room';

type RoomSession = {
  displayName: string;
  inviteCode: string;
};

export default function App() {
  const [session, setSession] = useState<RoomSession | null>(null);

  if (!session) {
    return (
      <Home
        onEnterRoom={(displayName, inviteCode) => {
          if (!inviteCode) return;

          setSession({
            displayName,
            inviteCode,
          });
        }}
      />
    );
  }

  return (
    <Room
      displayName={session.displayName}
      inviteCode={session.inviteCode}
      onLeave={() => setSession(null)}
    />
  );
}