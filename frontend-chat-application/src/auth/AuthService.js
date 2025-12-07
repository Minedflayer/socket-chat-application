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

// Extract and parse the payload of the JWT
function parseToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g,'+').replace(/_/g, '/');
    const payload = decodeURIComponent(window.atob(base64).split('').map(function(c){
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(payload);
  } catch(e) {
    return null;
  }
}

export function getCurrentUser() {
  const token = getToken();
  if(!token) {
    return null
  }
  const decoded = parseToken(token);
  return decoded ? (decoded.sub || decoded.username) : null;
}