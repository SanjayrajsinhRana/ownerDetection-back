import React, { useState } from 'react';
import { Sliders, X, Sparkles, Key, Check, Info } from 'lucide-react';
import { HuggingFaceSettings } from '../types';

interface HuggingFaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: HuggingFaceSettings;
  onSave: (newSettings: HuggingFaceSettings) => void;
}

export const HuggingFaceModal: React.FC<HuggingFaceModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);
  const [preferredEngine, setPreferredEngine] = useState(settings.preferredEngine);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      apiKey: apiKey.trim(),
      model: model.trim() || 'microsoft/trocr-base-stage1',
      preferredEngine,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Hugging Face &amp; OCR Engine Settings
              </h3>
              <p className="text-xs text-slate-500">Configure vision models for license plate reading</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Primary OCR Engine
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPreferredEngine('huggingface')}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                  preferredEngine === 'huggingface'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-900 ring-2 ring-amber-500/30'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-sm font-bold mb-1">🤗 Hugging Face</span>
                <span className="text-xs font-bold">TrOCR Model</span>
                <span className="text-[10px] text-amber-700 font-semibold mt-0.5">Mandatory</span>
              </button>

              <button
                type="button"
                onClick={() => setPreferredEngine('auto')}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                  preferredEngine === 'auto'
                    ? 'border-blue-500 bg-blue-50/70 text-blue-700 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="h-4 w-4 mb-1 text-blue-600" />
                <span className="text-xs font-bold">Auto Hybrid</span>
                <span className="text-[10px] text-slate-500 mt-0.5">HF + AI Fallback</span>
              </button>

              <button
                type="button"
                onClick={() => setPreferredEngine('gemini')}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                  preferredEngine === 'gemini'
                    ? 'border-blue-500 bg-blue-50/70 text-blue-700 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-sm font-bold mb-1">⚡ AI Vision</span>
                <span className="text-xs font-bold">Gemini Flash</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Ultra Fast</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Hugging Face API Token (Optional)
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs text-slate-900 font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Your free token from <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">huggingface.co/settings/tokens</a>. Optional: free inference or automated server fallback is active if omitted.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Hugging Face Model Repository
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. microsoft/trocr-base-printed"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 font-mono focus:border-blue-500 focus:outline-none"
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setModel('microsoft/trocr-base-printed')}
                className={`rounded px-2 py-0.5 text-[10px] font-mono transition-colors ${model === 'microsoft/trocr-base-printed' ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                microsoft/trocr-base-printed (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setModel('microsoft/trocr-base-stage1')}
                className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 hover:bg-slate-200 font-mono"
              >
                microsoft/trocr-base-stage1
              </button>
              <button
                type="button"
                onClick={() => setModel('keremberke/yolov8n-license-plate-detection')}
                className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 hover:bg-slate-200 font-mono"
              >
                keremberke/yolov8n-license-plate
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-blue-50/70 p-3 text-xs text-blue-900 border border-blue-100 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Tip:</strong> The built-in engine extracts license plates from all countries (India GJ/MH/DL, USA, UK, etc.) and auto-detects car color and model to help identify the blocked vehicle instantly!
            </p>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
            >
              {savedSuccess ? <Check className="h-4 w-4" /> : null}
              <span>{savedSuccess ? 'Saved!' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
