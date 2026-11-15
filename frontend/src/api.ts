import type { SubjectId } from './games/types';

const TOKEN_KEY = 'qs_token';

export const tokenStore = {
  get(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(t: string | null) {
    try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

export type Teacher = { id: number; name: string; email: string };
export type Session = { token: string; teacher: Teacher };
export type GameResult = {
  id: number; gameId: string; grade: number; teams: boolean;
  total: number; score: number; team1: number | null; team2: number | null; createdAt: string;
};
export type CustomQuestion = {
  id: number; subject: SubjectId; grade: number; prompt: string; emoji: string | null;
  options: string[]; answer: string; explain: string | null; createdAt: string;
};
export type NewQuestion = Omit<CustomQuestion, 'id' | 'createdAt' | 'emoji' | 'explain'> & {
  emoji?: string; explain?: string;
};

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch('/api' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Server bilan bog‘lanib bo‘lmadi. Backend ishlayotganini tekshiring.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const m = data?.message;
    throw new Error(Array.isArray(m) ? m.join('. ') : m || `Xatolik (${res.status})`);
  }
  return data as T;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<Session>('/auth/register', 'POST', { name, email, password }),
  login: (email: string, password: string) => request<Session>('/auth/login', 'POST', { email, password }),
  me: () => request<Teacher>('/auth/me'),

  saveResult: (r: Omit<GameResult, 'id' | 'createdAt' | 'team1' | 'team2'> & { team1?: number; team2?: number }) =>
    request<GameResult>('/results', 'POST', r),
  results: () => request<GameResult[]>('/results'),

  questions: (q: { subject?: SubjectId; grade?: number } = {}) => {
    const p = new URLSearchParams();
    if (q.subject) p.set('subject', q.subject);
    if (q.grade) p.set('grade', String(q.grade));
    const s = p.toString();
    return request<CustomQuestion[]>('/questions' + (s ? `?${s}` : ''));
  },
  addQuestion: (q: NewQuestion) => request<CustomQuestion>('/questions', 'POST', q),
  deleteQuestion: (id: number) => request<{ deleted: boolean }>(`/questions/${id}`, 'DELETE'),
};
