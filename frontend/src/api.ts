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

export type Teacher = { id: number; name: string; email: string; credits: number; isAdmin: boolean };
export type CreditTx = { id: number; amount: number; reason: 'welcome' | 'generate' | 'refund' | 'purchase' | 'admin'; note: string | null; createdAt: string };
export type Package = { credits: number; price: number; best?: boolean };
export type PurchaseConfig = { packages: Package[]; card: string | null; owner: string | null; bot: string | null };
export type PurchaseStatus = 'pending' | 'submitted' | 'approved' | 'rejected';
export type Purchase = { id: number; code: string; credits: number; price: number; status: PurchaseStatus; createdAt: string; botLink?: string | null };
export type AdminPurchase = Purchase & { teacher: { id: number; name: string; email: string } };
export type AdminTeacher = { id: number; name: string; email: string; credits: number; createdAt: string };
export type Session = { token: string; teacher: Teacher };
export type GameResult = {
  id: number; gameId: string; grade: number; teams: boolean;
  total: number; score: number; team1: number | null; team2: number | null; createdAt: string;
};
export type CustomQuestion = {
  id: number; subject: SubjectId; grade: number; prompt: string; emoji: string | null;
  options: string[]; answer: string; explain: string | null; topic: string | null; createdAt: string;
};
export type NewQuestion = Omit<CustomQuestion, 'id' | 'createdAt' | 'emoji' | 'explain' | 'topic'> & {
  emoji?: string; explain?: string; topic?: string;
};
export type GeneratedQuestion = { prompt: string; emoji: string; options: string[]; answer: string; explain: string };

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

  questions: (q: { subject?: SubjectId; grade?: number; topic?: string } = {}) => {
    const p = new URLSearchParams();
    if (q.subject) p.set('subject', q.subject);
    if (q.grade) p.set('grade', String(q.grade));
    if (q.topic) p.set('topic', q.topic);
    const s = p.toString();
    return request<CustomQuestion[]>('/questions' + (s ? `?${s}` : ''));
  },
  addQuestion: (q: NewQuestion) => request<CustomQuestion>('/questions', 'POST', q),
  addQuestions: (questions: NewQuestion[]) =>
    request<{ created: number }>('/questions/bulk', 'POST', { questions }),
  deleteQuestion: (id: number) => request<{ deleted: boolean }>(`/questions/${id}`, 'DELETE'),

  aiStatus: () => request<{ enabled: boolean }>('/ai/status'),
  aiGenerate: (p: { subject: SubjectId; grade: number; topic: string; count: number }) =>
    request<{ questions: GeneratedQuestion[]; credits: number }>('/ai/generate', 'POST', p),

  credits: () => request<{ credits: number; history: CreditTx[] }>('/credits'),
  purchaseConfig: () => request<PurchaseConfig>('/purchases/config'),
  createPurchase: (credits: number) => request<Purchase>('/purchases', 'POST', { credits }),
  myPurchases: () => request<Purchase[]>('/purchases'),
  adminPurchases: () => request<AdminPurchase[]>('/admin/purchases'),
  adminDecide: (id: number, action: 'approve' | 'reject') =>
    request<{ id: number; status: PurchaseStatus; changed: boolean; balance: number }>(`/admin/purchases/${id}`, 'POST', { action }),
  adminTeachers: (q = '') => request<AdminTeacher[]>('/admin/teachers' + (q ? `?q=${encodeURIComponent(q)}` : '')),
  adminGrant: (p: { teacherId: number; amount: number; reason: 'purchase' | 'admin'; note?: string }) =>
    request<{ teacherId: number; credits: number }>('/admin/credits', 'POST', p),
};
