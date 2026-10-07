// src/utils/synthesisModels.ts
var SYNTHESIS_MODELS = [
  { id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash", note: "Fast drafting" },
  { id: "openai/gpt-6.1-sol", label: "GPT-6.1 Sol", note: "Professional work" },
  { id: "anthropic/claude-opus-5.5", label: "Claude Opus 5.5", note: "Detailed analysis" },
  { id: "openai/gpt-6-astra", label: "GPT-6 Astra", note: "Deep analysis" }
];
var DEFAULT_SYNTHESIS_MODEL = SYNTHESIS_MODELS[0].id;
function normalizeSynthesisModel(model) {
  return SYNTHESIS_MODELS.some((choice) => choice.id === model) ? model : DEFAULT_SYNTHESIS_MODEL;
}
function synthesisModelLabel(model) {
  return SYNTHESIS_MODELS.find((choice) => choice.id === model)?.label || model;
}
export {
  DEFAULT_SYNTHESIS_MODEL,
  SYNTHESIS_MODELS,
  normalizeSynthesisModel,
  synthesisModelLabel
};
