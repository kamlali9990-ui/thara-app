import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../supabase/client', () => {
  const mockAuth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  };
  return {
    supabase: {
      auth: mockAuth,
      rpc: vi.fn(),
      from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn() })),
      channel: vi.fn(),
    },
    __mockAuth: mockAuth,
  };
});

const { supabase } = await import('../../supabase/client');
const mockAuth = supabase.auth;
const { authApi } = await import('../../supabase/auth');

describe('authApi', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('signIn', () => {
    it('normalizes email before login', async () => {
      vi.mocked(mockAuth.signInWithPassword).mockResolvedValue({ data: { user: { email: 'test@test.com' } }, error: null } as any);
      const result = await authApi.signIn('  TEST@TEST.COM ', 'pass');
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'test@test.com', password: 'pass' });
      expect(result.user.email).toBe('test@test.com');
    });

    it('throws on error', async () => {
      vi.mocked(mockAuth.signInWithPassword).mockResolvedValue({ data: null, error: new Error('invalid') } as any);
      await expect(authApi.signIn('x@x.com', 'bad')).rejects.toThrow('invalid');
    });
  });

  describe('signUp', () => {
    it('normalizes email', async () => {
      vi.mocked(mockAuth.signUp).mockResolvedValue({ data: { user: { email: 'new@new.com' } }, error: null } as any);
      await authApi.signUp('  NEW@NEW.COM ', 'pass');
      expect(mockAuth.signUp).toHaveBeenCalledWith({ email: 'new@new.com', password: 'pass' });
    });
  });

  describe('signUpDirect', () => {
    it('calls RPC with normalized email', async () => {
      const rpc = supabase.rpc;
      vi.mocked(rpc).mockResolvedValue({ data: true, error: null } as any);
      await authApi.signUpDirect('  DIR@DIR.COM ', 'pass', null);
      expect(rpc).toHaveBeenCalledWith('create_customer_auth_rpc', { p_email: 'dir@dir.com', p_password: 'pass', p_username: null });
    });
  });

  describe('signOut', () => {
    it('calls auth.signOut', async () => {
      vi.mocked(mockAuth.signOut).mockResolvedValue({ error: null } as any);
      await authApi.signOut();
      expect(mockAuth.signOut).toHaveBeenCalled();
    });
  });

  describe('getUser', () => {
    it('returns user when found', async () => {
      vi.mocked(mockAuth.getUser).mockResolvedValue({ data: { user: { id: 1, email: 'u@u.com' } } } as any);
      const result = await authApi.getUser();
      expect(result!.email).toBe('u@u.com');
    });

    it('returns null when no user', async () => {
      vi.mocked(mockAuth.getUser).mockResolvedValue({ data: { user: null } } as any);
      const result = await authApi.getUser();
      expect(result).toBeNull();
    });
  });

  describe('onAuthChange', () => {
    it('passes callback to onAuthStateChange', () => {
      const cb = vi.fn();
      const sub = authApi.onAuthChange(cb);
      expect(mockAuth.onAuthStateChange).toHaveBeenCalled();
      expect(sub).toBeDefined();
    });
  });
});
