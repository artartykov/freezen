import { useUiState } from '@shared/model';

function apply() {
  const { theme, largeText, wrap } = useUiState.getState();
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  root.dataset.text = largeText ? 'large' : 'normal';
  root.dataset.wrap = String(wrap);
}

export function syncAppearance() {
  apply();
  useUiState.subscribe(apply);
}
