import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useProjectStore } from './project';

export type UserRole = 'admin' | 'manager' | 'viewer' | 'globaladmin' | 'superadmin' | 'user';

export interface User {
  _id: string;
  id?: string;
  avatar?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  projects?: string[]; // Optional, if user has projects
  token?: string;
  contact: {
    company: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
      taxId: string;
    };
    bio: string;
    avatar: string;
  },
  social_media?: {
    linkedin?: string;
    x?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
    github?: string;
    telegram?: string;
    website?: string;
  };
}

const API_BASE = 'http://localhost:4242/api/users';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isAuthenticated = computed(() => !!user.value && !!user.value.token);
  const token = ref<string | null>(null);
  const error = ref<string | null>(null);

   async function login(email: string, password: string) {
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        error.value = err.error || 'Login failed';
        return false;
      }
      const data = await res.json();
      user.value = {
        _id: data.user._id,
        id: data.user._id || data.user.id,
        avatar: data.user.avatar || data.user.contact?.avatar || '',
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        email: data.user.email,
        role: data.user.role,
        token: data.token,
        projects: data.user.projects || [],
        contact: data.user.contact || { company: '', phone: '', address: { street: '', city: '', state: '', zip: '', country: '', taxId: '' }, bio: '', avatar: '' },
        social_media: data.user.social_media || {},
      };
      token.value = data.token;
    localStorage.setItem('user', JSON.stringify(user.value));
    localStorage.setItem('token', data.token);
      // If user has a default project, set it in the project store
      try {
        const projectStore = useProjectStore()
        if (user.value && Array.isArray(user.value.projects)) {
          const dp = user.value.projects.find((p: any) => p && p.default)
          if (dp) {
            const dpa: any = dp
            const id = typeof dp === 'string' ? dp : (dpa._id || dpa.id || null)
            if (id) projectStore.setCurrentProject(id)
          }
        }
      } catch (e) {}
      return true;
    } catch (e) {
      error.value = 'Network error';
      return false;
    }
  }

  async function register(payload: {
    firstName: string;
    lastName: string;
    company: string;
    email: string;
    password: string;
    role?: string;
    projects?: string[];
  }) {
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, data };
      } else {
        error.value = data.message || data.error || 'Signup failed.';
        return { success: false, error: error.value };
      }
    } catch (e) {
      error.value = 'Network or server error.';
      return { success: false, error: error.value };
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('selectedProjectId'); // Clear selected project on logout
  }

  function loadUser() {
    const stored = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (stored && storedToken) {
      user.value = JSON.parse(stored);
      token.value = storedToken;
      // sync default project into project store
      try {
        const projectStore = useProjectStore()
        if (user.value && Array.isArray(user.value.projects)) {
          const dp = user.value.projects.find((p: any) => p && p.default)
          if (dp) {
            const dpa: any = dp
            const id = typeof dp === 'string' ? dp : (dpa._id || dpa.id || null)
            if (id) projectStore.setCurrentProject(id)
          }
        }
      } catch (e) {}
    }
  }

  // Call on store init
  loadUser();

  async function updateUser(updated: Partial<User>) {
    if (!user.value) return false;
    try {
      const uid = user.value._id || user.value.id
      const res = await fetch(`${API_BASE}/update/${uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token.value ? { Authorization: `Bearer ${token.value}` } : {})
        },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        error.value = 'Failed to update user';
        return false;
      }
      const data = await res.json();
      // backend may return { user } or the raw user object
      const returned = data && data.user ? data.user : data;

      // merge returned fields into existing user but preserve token
      const preservedToken = user.value.token || token.value || null;
      user.value = { ...user.value, ...returned } as User;
      if (preservedToken) {
        user.value.token = preservedToken;
        token.value = preservedToken;
      }
      // also normalize avatar if backend returns nested contact.avatar
      if (user.value) {
        if ((data as any).avatar) user.value.avatar = (data as any).avatar
        else if ((data as any).contact?.avatar) user.value.avatar = (data as any).contact.avatar
      }
      localStorage.setItem('user', JSON.stringify(user.value));

      // If update returned projects with a default, sync selected project into project store/localStorage
      try {
        const projectStore = useProjectStore()
        if (user.value && Array.isArray(user.value.projects)) {
          const dp = user.value.projects.find((p: any) => p && p.default)
          if (dp) {
            const dpa: any = dp
            const id = typeof dp === 'string' ? dp : (dpa._id || dpa.id || null)
            if (id) projectStore.setCurrentProject(id)
          }
        }
      } catch (e) {}
      return true;
    } catch (e) {
      error.value = 'Network error';
      return false;
    }
  }

  // function to update just the avatar. This can be called from profile page when uploading new avatar.
  async function updateAvatar(avatarUrl: string, userId?: string) {
    if (!user.value && !userId) return false;
    try {
      const uid = userId || user.value!._id || user.value!.id
      const res = await fetch(`${API_BASE}/update/${uid}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token.value ? { Authorization: `Bearer ${token.value}` } : {})
          },
          body: JSON.stringify({ avatar: avatarUrl }),
        });
      if (!res.ok) {
        error.value = 'Failed to update avatar';
        return false;
      }
      const data = await res.json();
      const returned = data && data.user ? data.user : data;
      if (user.value) {
        user.value.avatar = returned.avatar || (returned.contact?.avatar) || avatarUrl;
        localStorage.setItem('user', JSON.stringify(user.value));
      }
      return true;
    } catch (e) {
      error.value = 'Network error';
      return false;
    }
  }

  // change password
  async function changePassword(currentPassword: string, newPassword: string) {
    if (!user.value) return { success: false, error: 'Not authenticated' };
    try {
      // Server expects { email, currentPassword, newPassword }
      const res = await fetch(`${API_BASE}/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token.value ? { Authorization: `Bearer ${token.value}` } : {})
          },
          body: JSON.stringify({ email: user.value.email, currentPassword, newPassword }),
        });
      const data = await res.json();
      if (!res.ok) {
        error.value = data.error || data.message || 'Failed to change password'
        return { success: false, error: error.value }
      }
      return { success: true }
    } catch (e) {
      error.value = 'Network error'
      return { success: false, error: error.value }
    }
  }

  return { user, isAuthenticated, token, error, login, logout, updateUser, register, updateAvatar, changePassword };
});
