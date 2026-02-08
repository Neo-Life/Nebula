import { defineStore } from 'pinia';
import axios from 'axios';

export const useAuthStore = defineStore({
  id: 'auth',
  state: () => ({
    username: '' as string,
    returnUrl: null as string | null,
  }),
  actions: {
    async login(username: string, password: string): Promise<void> {
      try {
        const res = await axios.post('/api/auth/login', {
          username: username,
          password: password,
        });

        if (res.data.status === 'error') {
          return Promise.reject(res.data.message);
        }

        this.username = res.data.data.username;
        localStorage.setItem('user', this.username);
        localStorage.setItem('token', res.data.data.token);
        localStorage.setItem('change_pwd_hint', res.data.data?.change_pwd_hint);
      } catch (error: unknown) {
        return Promise.reject(error);
      }
    },
    async logout() {
      this.username = '';
      this.returnUrl = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('change_pwd_hint');
    },
    has_token(): boolean {
      return !!localStorage.getItem('token');
    },
  },
});
