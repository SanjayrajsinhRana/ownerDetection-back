import React from 'react';
import { Camera, FileSpreadsheet, Code2, Sliders, Car, CheckCircle2, AlertCircle } from 'lucide-react';
import { GoogleSheetState } from '../types';

interface NavbarProps {
  activeTab: 'scanner' | 'sheet' | 'colab';
  onSelectTab: (tab: 'scanner' | 'sheet' | 'colab') => void;
  onOpenSettings: () => void;
  sheetState: GoogleSheetState;
  totalCarsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSettings,
  sheetState,
  totalCarsCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900">
                CarPark Direct
              </span>
              <span className="hidden rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 sm:inline-block border border-blue-200/60">
                OCR &amp; Google Chat
              </span>
            </div>
            <p className="hidden text-xs text-slate-500 md:block">
              Company Parking Plate Matcher &amp; Instant DM
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <button
            id="nav-tab-scanner"
            onClick={() => onSelectTab('scanner')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'scanner'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>Scan &amp; Message</span>
          </button>

          <button
            id="nav-tab-sheet"
            onClick={() => onSelectTab('sheet')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'sheet'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Parking Sheet</span>
            <span className="ml-0.5 rounded-full bg-slate-200 px-1.5 py-0.2 text-xs font-semibold text-slate-700">
              {totalCarsCount}
            </span>
          </button>

          <button
            id="nav-tab-colab"
            onClick={() => onSelectTab('colab')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'colab'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="h-4 w-4 text-amber-600" />
            <span className="hidden sm:inline">Google Colab &amp; HF</span>
            <span className="sm:hidden">Colab</span>
          </button>
        </nav>

        {/* Right tools & status */}
        <div className="flex items-center gap-2">
          {/* Sheet sync status chip */}
          <div
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium lg:flex border ${
              sheetState.isConnected
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
            title={
              sheetState.isConnected
                ? `Connected to Google Sheet: ${sheetState.recordsCount} vehicles`
                : 'Using local parking directory'
            }
          >
            {sheetState.isConnected ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span>{sheetState.isConnected ? 'Google Sheet Synced' : 'Ready'}</span>
          </div>

          {/* Engine settings button */}
          <button
            id="btn-open-settings"
            onClick={onOpenSettings}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            title="Configure Hugging Face Model & OCR Engine"
            aria-label="Configure OCR & Hugging Face settings"
          >
            <Sliders className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
