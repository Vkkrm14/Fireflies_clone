import { create } from "zustand";

interface UiState {
  promoVisible: boolean;
  dismissPromo: () => void;
  captureOpen: boolean;
  setCaptureOpen: (open: boolean) => void;
  /** Set by Ctrl+K on pages without a search box; the top bar focuses its input and clears it. */
  pendingSearchFocus: boolean;
  setPendingSearchFocus: (pending: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  promoVisible: true,
  dismissPromo: () => set({ promoVisible: false }),
  captureOpen: false,
  setCaptureOpen: (open) => set({ captureOpen: open }),
  pendingSearchFocus: false,
  setPendingSearchFocus: (pending) => set({ pendingSearchFocus: pending }),
}));
