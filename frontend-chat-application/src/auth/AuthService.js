export async function login(username, password) {
  const res = await fetch("/auth/dev-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if(!res.ok) throw new Error("Login failed");

  const {token} = await res.json();
  localStorage.setItem("token", token);
  return token;
}

export function getToken() {
    return localStorage.getItem("token");
}

export function logout() {
    localStorage.removeItem("token");
}
