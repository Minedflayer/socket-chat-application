import { useState } from "react";
import { login } from "../auth/AuthService";

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = await login(username, password);
      onLogin(token);
    } catch (err) {
      alert("Login failed: " + err.message);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Login</button>
    </form>
  );
}
