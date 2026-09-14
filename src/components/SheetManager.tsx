import React, { useState } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  Plus,
  Download,
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  ExternalLink,
  HelpCircle,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { EmployeeRecord, GoogleSheetState } from '../types';
import { normalizePlate } from '../data/mockEmployees';
import { getGoogleChatLinks } from '../utils/plateMatcher';

interface SheetManagerProps {
  employees: EmployeeRecord[];
  sheetState: GoogleSheetState;
  onSyncGoogleSheet: (url: string) => Promise<void>;
  onAddEmployee: (employee: EmployeeRecord) => void;
  onDeleteEmployee: (id: string) => void;
  onSelectEmployeeForChat: (employee: EmployeeRecord) => void;
}

export const SheetManager: React.FC<SheetManagerProps> = ({
  employees,
  sheetState,
  onSyncGoogleSheet,
  onAddEmployee,
  onDeleteEmployee,
  onSelectEmployeeForChat,
}) => {
  const [sheetUrlInput, setSheetUrlInput] = useState(sheetState.url);
  const [searchFilter, setSearchFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // New employee form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newDept, setNewDept] = useState('Engineering');
  const [newPhone, setNewPhone] = useState('');
  const [newCar, setNewCar] = useState('');
  const [newSpot, setNewSpot] = useState('');

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrlInput.trim()) return;
    await onSyncGoogleSheet(sheetUrlInput.trim());
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPlate.trim()) return;

    const newRecord: EmployeeRecord = {
      id: `emp-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim(),
      plateNumber: newPlate.trim().toUpperCase(),
      normalizedPlate: normalizePlate(newPlate),
      department: newDept.trim() || 'General',
      phone: newPhone.trim(),
      carModel: newCar.trim() || 'Vehicle',
      parkingBay: newSpot.trim() || 'Unassigned',
    };

    onAddEmployee(newRecord);
    setShowAddModal(false);
    // Reset form
    setNewName('');
    setNewEmail('');
    setNewPlate('');
    setNewPhone('');
    setNewCar('');
    setNewSpot('');
  };

  const filteredEmployees = employees.filter((emp) => {
    const q = searchFilter.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.plateNumber.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q) ||
      emp.parkingBay.toLowerCase().includes(q) ||
      emp.carModel.toLowerCase().includes(q)
    );
  });

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Car Registration Number', 'Department', 'Phone', 'Car Model', 'Parking Spot', 'Notes'];
    const rows = employees.map((emp) => [
      `"${emp.name}"`,
      `"${emp.email}"`,
      `"${emp.plateNumber}"`,
      `"${emp.department}"`,
      `"${emp.phone || ''}"`,
      `"${emp.carModel || ''}"`,
      `"${emp.parkingBay || ''}"`,
      `"${emp.notes || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Company_Parking_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6">
      {/* Google Sheet Sync Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">
                Company Parking Google Sheet Integration
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Connect your company&apos;s live Google Sheet with employee emails and car registration numbers
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowHelpGuide(!showHelpGuide)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            <HelpCircle className="h-4 w-4" />
            <span>{showHelpGuide ? 'Hide Setup Instructions' : 'How to connect your Sheet'}</span>
          </button>
        </div>

        {/* Setup instructions guide */}
        {showHelpGuide && (
          <div className="my-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-700 border border-slate-200/80 space-y-2">
            <p className="font-bold text-slate-900">How to link your Company Google Sheet in 30 seconds:</p>
            <ol className="list-decimal pl-5 space-y-1 text-slate-600 leading-relaxed">
              <li>
                Create or open your Google Sheet with these recommended header columns:{' '}
                <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">
                  Name, Email, Car Registration Number, Department, Phone, Car Model, Parking Spot
                </code>
              </li>
              <li>
                In Google Sheets, click <strong>File &gt; Share &gt; Publish to web</strong>. Choose <strong>Comma-separated values (.csv)</strong> and click <strong>Publish</strong>.
              </li>
              <li>
                Or set sharing to <strong>&quot;Anyone with the link can view&quot;</strong> and simply paste the standard URL below.
              </li>
            </ol>
          </div>
        )}

        <form onSubmit={handleSyncSubmit} className="mt-4 flex flex-col sm:flex-row items-stretch gap-3">
          <input
            type="url"
            value={sheetUrlInput}
            onChange={(e) => setSheetUrlInput(e.target.value)}
            placeholder="Paste Google Sheet URL (e.g. https://docs.google.com/spreadsheets/d/...)"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
          />

          <button
            type="submit"
            disabled={sheetState.isSyncing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${sheetState.isSyncing ? 'animate-spin' : ''}`} />
            <span>{sheetState.isSyncing ? 'Syncing...' : 'Sync Live Sheet'}</span>
          </button>
        </form>

        {sheetState.error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{sheetState.error}</span>
          </div>
        )}

        {sheetState.isConnected && !sheetState.error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>
              Connected! Loaded {employees.length} employee records from Google Sheet.{' '}
              {sheetState.lastSynced && `Last synced at ${sheetState.lastSynced}`}
            </span>
          </div>
        )}
      </div>

      {/* Directory Controls & Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by name, car plate, department, bay..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Vehicle</span>
            </button>
          </div>
        </div>

        {/* Employee Parking Records Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Car Plate #</th>
                <th className="py-3 px-4">Vehicle Model</th>
                <th className="py-3 px-4">Parking Bay</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-right">Instant Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filteredEmployees.map((emp) => {
                const chatLinks = getGoogleChatLinks(emp.email);
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {emp.avatar ? (
                          <img
                            src={emp.avatar}
                            alt={emp.name}
                            referrerPolicy="no-referrer"
                            className="h-8 w-8 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">{emp.name}</p>
                          <p className="text-[11px] text-slate-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-block rounded-md bg-amber-50 px-2.5 py-1 font-mono text-xs font-bold text-slate-900 border border-slate-300">
                        {emp.plateNumber}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800">
                      {emp.carModel || '—'}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {emp.parkingBay || 'General'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {emp.department || 'General'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectEmployeeForChat(emp)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                          title="Compose move-car message"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>Chat</span>
                        </button>

                        <a
                          href={chatLinks.primary}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                          title="Open Google Chat DM directly"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => onDeleteEmployee(emp.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Remove record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No vehicles found matching &quot;{searchFilter}&quot;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Add Colleague Vehicle to Parking Registry
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Sanjay Rana"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Email (for Chat DM) *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. sanjaysinh.rana@bacancy.com"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Plate Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                    placeholder="e.g. GJ 01 AB 1234"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 uppercase font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Car Make &amp; Color
                  </label>
                  <input
                    type="text"
                    value={newCar}
                    onChange={(e) => setNewCar(e.target.value)}
                    placeholder="e.g. White Hyundai i20"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Spot
                  </label>
                  <input
                    type="text"
                    value={newSpot}
                    onChange={(e) => setNewSpot(e.target.value)}
                    placeholder="e.g. Bay #14"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder="e.g. Software Engineering"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Save to Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
