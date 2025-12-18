import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AppState {
  currentUser: User | null;
  selectedChatUser: User | null;
  isAgreementPanelOpen: boolean;
  theme: 'light' | 'dark'; // <--- Added Theme
  
  // Actions
  setCurrentUser: (user: User) => void;
  setSelectedChatUser: (user: User | null) => void;
  toggleAgreementPanel: (isOpen: boolean) => void;
  toggleTheme: () => void; // <--- Added Action
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  selectedChatUser: null,
  isAgreementPanelOpen: false,
  theme: 'dark', // Default to Dark

  setCurrentUser: (user) => set({ currentUser: user }),
  setSelectedChatUser: (user) => set({ selectedChatUser: user }),
  toggleAgreementPanel: (isOpen) => set({ isAgreementPanelOpen: isOpen }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
}));