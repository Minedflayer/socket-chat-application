import { useEffect, useState } from 'react';
//import './App.css'
import ChatApp from './ChatApp';
import LoginForm from './auth/LoginForm';
import { getToken } from './auth/AuthService';

function isJavaWebTokenValid(token) {
  if(!token) return false;

  try{
    const [, payload] = token.split(".");
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/-/g, "/")));
    if(typeof json.exp !== "number") return true;
    return Date.now() < json.exp * 100;
  } catch {
    return false;
  }
}

export default function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const t = getToken();
    setToken(isJavaWebTokenValid(t) ? t:null );

  }, []);

    if (!token) {
    return (
      <LoginForm
        onLogin={(t) => {
          setToken(t);            // switch to chat
          // optional: window.location.reload(); // if you prefer a hard reload
        }}
      />
    );
  }

  return (
    <main>
      <ChatApp/>
    </main>
  );
}


