import type { AiModel, AiProvider } from '@shared/storage';

export function aiModelLabel(
  model: AiModel,
  providerNames: Record<AiProvider, string>,
) {
  return `${providerNames[model.provider]} · ${model.name}`;
}
