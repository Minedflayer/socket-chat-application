import { useState } from 'react';
import ChatApp from './ChatApp';
import LoginForm from './auth/LoginForm';
import { getToken, isTokenValid } from './auth/AuthService';

export default function App() {
  const [token, setToken] = useState(() => {
    const saved = getToken();
    return isTokenValid(saved) ? saved : null;
  });
  return token ? <ChatApp /> : <LoginForm onLogin={setToken} />;
}
