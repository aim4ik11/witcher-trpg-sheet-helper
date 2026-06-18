const API = '/api';

export async function fetchHostInfo() {
  const res = await fetch(`${API}/host-info`);
  return res.json();
}

export async function fetchCharacters() {
  const res = await fetch(`${API}/characters`);
  return res.json();
}

export async function fetchCharacter(id) {
  const res = await fetch(`${API}/characters/${id}`);
  if (!res.ok) throw new Error('Character not found');
  return res.json();
}

export async function createCharacter(data) {
  const res = await fetch(`${API}/characters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateCharacter(id, character) {
  const res = await fetch(`${API}/characters/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(character),
  });
  return res.json();
}

export async function deleteCharacter(id) {
  await fetch(`${API}/characters/${id}`, { method: 'DELETE' });
}

export async function playerLogin(nickname) {
  const res = await fetch(`${API}/player/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function fetchPlayerCharacter(token) {
  const res = await fetch(`${API}/player/me`, {
    headers: { 'X-Player-Token': token },
  });
  if (!res.ok) throw new Error('Session expired');
  return res.json();
}
