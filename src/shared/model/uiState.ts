import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UiState = {
  onboardingCompleted: boolean;
  completeOnboarding: () => void;
};

export const useUiState = create<UiState>()(
  persist(
    (set) => ({
      onboardingCompleted: false,
      completeOnboarding: () => set({ onboardingCompleted: true }),
    }),
    { name: 'freezen-ui', version: 1 },
  ),
);
