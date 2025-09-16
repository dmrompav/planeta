import { create } from 'zustand';

type SelectedCountryState = {
  selectedCca2: string | null;
  setSelected: (cca2: string | null) => void;
};

export const useSelectedCountry = create<SelectedCountryState>((set) => ({
  selectedCca2: null,
  setSelected: (cca2) => set({ selectedCca2: cca2 }),
}));
