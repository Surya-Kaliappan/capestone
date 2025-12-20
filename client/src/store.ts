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
  theme: 'light' | 'dark';
  timeFormat: '12h' | '24h'; 
  
  // Actions
  setCurrentUser: (user: User | null) => void;
  setSelectedChatUser: (user: User | null) => void;
  toggleAgreementPanel: (isOpen: boolean) => void;
  toggleTheme: () => void;
  toggleTimeFormat: () => void; 
  logout: () => void;           
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  selectedChatUser: null,
  isAgreementPanelOpen: false,
  theme: 'dark',
  timeFormat: '12h', // Default

  setCurrentUser: (user) => set({ currentUser: user }),
  setSelectedChatUser: (user) => set({ selectedChatUser: user }),
  toggleAgreementPanel: (isOpen) => set({ isAgreementPanelOpen: isOpen }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  toggleTimeFormat: () => set((state) => ({ timeFormat: state.timeFormat === '12h' ? '24h' : '12h' })),
  
  logout: () => set({ 
    currentUser: null, 
    selectedChatUser: null, 
    isAgreementPanelOpen: false 
  }),
}));