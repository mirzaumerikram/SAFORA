// Production backend on Railway — same server the PWA uses
const RAILWAY_URL  = 'https://safora-production-f5ce.up.railway.app/api';
const LOCAL_URL    = 'http://localhost:5000/api';

// Use Railway in production/preview; fall back to localhost only when
// the admin dashboard itself is served from localhost
const BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? LOCAL_URL
    : RAILWAY_URL;

const getToken = () => localStorage.getItem('safora_admin_token');

const request = async (method, url, data) => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (data) options.body = JSON.stringify(data);

  const res = await fetch(`${BASE_URL}${url}`, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json;
};

export const api = {
  get:    (url)       => request('GET',    url),
  post:   (url, data) => request('POST',   url, data),
  patch:  (url, data) => request('PATCH',  url, data),
  delete: (url)       => request('DELETE', url),
};
