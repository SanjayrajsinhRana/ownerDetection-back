import React, { useState, useEffect } from 'react';
import {
  Car,
  AlertCircle,
  Sparkles,
  Search,
  ExternalLink,
  PlusCircle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { PlateScanner } from './components/PlateScanner';
import { ColleagueMatchCard } from './components/ColleagueMatchCard';
import { SheetManager } from './components/SheetManager';
import { ColabStudio } from './components/ColabStudio';
import { HuggingFaceModal } from './components/HuggingFaceModal';
import {
  EmployeeRecord,
  ColleagueMatch,
  GoogleSheetState,
  HuggingFaceSettings,
  ScanResult,
} from './types';
import { INITIAL_EMPLOYEES, normalizePlate } from './data/mockEmployees';
import { findMatchingEmployees } from './utils/plateMatcher';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'sheet' | 'colab'>('scanner');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Persistence of employee parking directory
  const [employees, setEmployees] = useState<EmployeeRecord[]>(() => {
    try {
      const saved = localStorage.getItem('carpark_employees');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to read from localStorage', e);
    }
    return INITIAL_EMPLOYEES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('carpark_employees', JSON.stringify(employees));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }, [employees]);

  // Google Sheet state
  const [sheetState, setSheetState] = useState<GoogleSheetState>({
    url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=csv',
    isConnected: true,
    isSyncing: false,
    lastSynced: 'Just now (Company parking sheet)',
    error: null,
    recordsCount: INITIAL_EMPLOYEES.length,
  });

  // Hugging Face Settings
  const [hfSettings, setHfSettings] = useState<HuggingFaceSettings>(() => {
    try {
      const saved = localStorage.getItem('carpark_hf_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      apiKey: '',
      model: 'microsoft/trocr-base-printed',
      preferredEngine: 'huggingface',
    };
  });

  const handleSaveHfSettings = (newSettings: HuggingFaceSettings) => {
    setHfSettings(newSettings);
    try {
      localStorage.setItem('carpark_hf_settings', JSON.stringify(newSettings));
    } catch {}
  };

  // Match state
  const [currentMatch, setCurrentMatch] = useState<ColleagueMatch | null>(null);
  const [searchedPlate, setSearchedPlate] = useState('');
  const [noMatchFoundFor, setNoMatchFoundFor] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // When a plate is recognized via Camera / OCR
  const handlePlateRecognized = (plateNumber: string, _scanResult?: ScanResult) => {
    setSearchedPlate(plateNumber);
    setNoMatchFoundFor(null);

    const matches = findMatchingEmployees(plateNumber, employees);

    if (matches.length > 0) {
      setCurrentMatch(matches[0]);
    } else {
      setCurrentMatch(null);
      setNoMatchFoundFor(plateNumber);
    }
  };

  // Direct manual search
  const handleSearchDirect = (query: string) => {
    setSearchedPlate(query);
    setNoMatchFoundFor(null);

    // Try plate matching first
    const matches = findMatchingEmployees(query, employees);
    if (matches.length > 0) {
      setCurrentMatch(matches[0]);
      return;
    }

    // Try searching by name or email
    const cleanQ = query.toLowerCase();
    const nameMatch = employees.find(
      (e) =>
        e.name.toLowerCase().includes(cleanQ) ||
        e.email.toLowerCase().includes(cleanQ) ||
        e.plateNumber.toLowerCase().includes(cleanQ)
    );

    if (nameMatch) {
      setCurrentMatch({
        employee: nameMatch,
        matchType: 'exact',
        score: 0.95,
      });
    } else {
      setCurrentMatch(null);
      setNoMatchFoundFor(query);
    }
  };

  // Sync with live Google Sheet
  const handleSyncGoogleSheet = async (url: string) => {
    setSheetState((prev) => ({ ...prev, isSyncing: true, error: null, url }));

    try {
      const res = await fetch('/api/sheet-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: url }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch sheet (HTTP ${res.status})`);
      }

      const { csv } = await res.json();
      if (!csv) throw new Error('Received empty sheet data.');

      // Parse CSV text into records
      const lines = csv.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
      if (lines.length < 2) {
        throw new Error('Google Sheet must contain a header row and at least 1 row of employee data.');
      }

      // Simple CSV header parser
      const headers = lines[0].split(',').map((h: string) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

      // Helper to find column index
      const findIdx = (keywords: string[]) =>
        headers.findIndex((h: string) => keywords.some((k) => h.includes(k)));

      const nameIdx = findIdx(['name', 'employee', 'owner']);
      const emailIdx = findIdx(['email', 'mail', 'chat']);
      const plateIdx = findIdx(['plate', 'registration', 'reg', 'car no', 'vehicle no', 'number']);
      const deptIdx = findIdx(['dept', 'department', 'team', 'role']);
      const phoneIdx = findIdx(['phone', 'mobile', 'contact', 'tel']);
      const carIdx = findIdx(['car', 'model', 'vehicle', 'make']);
      const spotIdx = findIdx(['spot', 'bay', 'parking', 'slot', 'lot']);

      if (plateIdx === -1 && emailIdx === -1) {
        throw new Error('Could not identify "Car Registration Number" or "Email" columns in Google Sheet.');
      }

      const parsedRecords: EmployeeRecord[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Regex to split CSV respecting quotes
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v: string) =>
          v.replace(/^["']|["']$/g, '').trim()
        );

        const plate = (row[plateIdx] || '').toUpperCase();
        if (!plate) continue;

        parsedRecords.push({
          id: `sheet-${i}-${Date.now()}`,
          name: row[nameIdx] || `Colleague ${i}`,
          email: row[emailIdx] || '',
          plateNumber: plate,
          normalizedPlate: normalizePlate(plate),
          department: row[deptIdx] || 'General',
          phone: row[phoneIdx] || '',
          carModel: row[carIdx] || 'Vehicle',
          parkingBay: row[spotIdx] || `Spot #${i}`,
        });
      }

      if (parsedRecords.length === 0) {
        throw new Error('No valid vehicle registration rows were found in the sheet.');
      }

      setEmployees(parsedRecords);
      setSheetState({
        url,
        isConnected: true,
        isSyncing: false,
        lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: null,
        recordsCount: parsedRecords.length,
      });
    } catch (err: any) {
      console.error('Sheet sync error:', err);
      setSheetState((prev) => ({
        ...prev,
        isSyncing: false,
        error: err.message || 'Failed to sync Google Sheet. Check link and sharing settings.',
      }));
    }
  };

  const handleAddEmployee = (newEmp: EmployeeRecord) => {
    setEmployees((prev) => [newEmp, ...prev]);
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSelectEmployeeForChat = (employee: EmployeeRecord) => {
    setCurrentMatch({
      employee,
      matchType: 'exact',
      score: 1.0,
    });
    setSearchedPlate(employee.plateNumber);
    setActiveTab('scanner');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => setShowSettingsModal(true)}
        sheetState={sheetState}
        totalCarsCount={employees.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tab 1: Scanner & Parking Finder */}
        {activeTab === 'scanner' && (
          <div className="space-y-6">
            {/* Context headline banner */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/60 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  Limited Parking Spot Solver
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  Click Car Plate &rarr; Match Owner &rarr; 1-Click Google Chat
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl">
                  Point your camera at any blocked or double-parked vehicle. We extract the registration plate with OCR, cross-reference your company Google Sheet, and open a direct Google Chat with a pre-drafted move request.
                </p>
              </div>

              {/* Status summary pill */}
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200/80 shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
                  {employees.length}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Company Cars Indexed</p>
                  <p className="text-[11px] text-slate-500">Google Sheet registry active</p>
                </div>
              </div>
            </div>

            {/* If a match was found, highlight prominently */}
            {currentMatch && (
              <ColleagueMatchCard
                match={currentMatch}
                searchedPlate={searchedPlate}
                onClear={() => {
                  setCurrentMatch(null);
                  setSearchedPlate('');
                }}
              />
            )}

            {/* If no match found */}
            {noMatchFoundFor && !currentMatch && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-amber-900">
                      No Registered Colleague Found for &quot;{noMatchFoundFor}&quot;
                    </h3>
                    <p className="mt-1 text-xs text-amber-800">
                      This plate is not currently listed in your company parking sheet. It might belong to a visitor, client, or newly joined team member.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('sheet');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 transition-colors"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>Register this vehicle to Sheet</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoMatchFoundFor(null)}
                        className="text-xs font-medium text-amber-900 hover:underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Plate Scanner (Camera + File + Test Plates) */}
            <PlateScanner
              onPlateRecognized={handlePlateRecognized}
              onSearchDirect={handleSearchDirect}
              isProcessing={isProcessing}
              hfSettings={hfSettings}
            />
          </div>
        )}

        {/* Tab 2: Google Sheet Registry Manager */}
        {activeTab === 'sheet' && (
          <SheetManager
            employees={employees}
            sheetState={sheetState}
            onSyncGoogleSheet={handleSyncGoogleSheet}
            onAddEmployee={handleAddEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onSelectEmployeeForChat={handleSelectEmployeeForChat}
          />
        )}

        {/* Tab 3: Google Colab & Hugging Face Studio */}
        {activeTab === 'colab' && <ColabStudio />}
      </main>

      {/* Hugging Face & Engine Settings Modal */}
      <HuggingFaceModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={hfSettings}
        onSave={handleSaveHfSettings}
      />

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-2 px-4 text-xs text-slate-500">
          <p>
            CarPark Direct • License Plate OCR &amp; Google Chat Dispatcher
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('colab')}
              className="hover:text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>Colab Code (.ipynb)</span>
              <ExternalLink className="h-3 w-3" />
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="hover:text-blue-600 hover:underline"
            >
              Hugging Face Engine
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
