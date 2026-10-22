// Server dan halaman satu alamat, jadi cukup memakai path relatif.

async function request(path, init) {
  let res;
  try {
    res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...init });
  } catch {
    throw new Error('Tidak bisa terhubung ke server. Pastikan server sudah berjalan.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? 'Terjadi kesalahan. Coba lagi sebentar.');
  }
  return data;
}

export function recommend(query, excludeIds) {
  return request('/api/recommend', {
    method: 'POST',
    body: JSON.stringify({ query, excludeIds }),
  });
}

export function getRecipe(id) {
  return request(`/api/recipe/${encodeURIComponent(id)}`);
}
