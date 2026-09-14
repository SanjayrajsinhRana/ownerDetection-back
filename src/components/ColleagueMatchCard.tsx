import React, { useState } from 'react';
import {
  MessageSquare,
  ExternalLink,
  Copy,
  Check,
  Phone,
  Mail,
  MapPin,
  Car,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { ColleagueMatch } from '../types';
import { getGoogleChatLinks, generateCarMoveMessage } from '../utils/plateMatcher';

interface ColleagueMatchCardProps {
  match: ColleagueMatch;
  searchedPlate: string;
  onClear: () => void;
}

export const ColleagueMatchCard: React.FC<ColleagueMatchCardProps> = ({
  match,
  searchedPlate,
  onClear,
}) => {
  const { employee, matchType, score } = match;
  const [urgency, setUrgency] = useState<'polite' | 'meeting' | 'urgent'>('polite');
  const [customSpot, setCustomSpot] = useState('blocking my car / spot');
  const [copied, setCopied] = useState(false);

  // Generate current message based on selection
  const draftMessage = generateCarMoveMessage(
    employee.name,
    employee.plateNumber,
    employee.carModel,
    customSpot,
    urgency
  );

  const chatLinks = getGoogleChatLinks(employee.email);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(draftMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API not available
      const el = document.createElement('textarea');
      el.value = draftMessage;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenGoogleChatAndCopy = async () => {
    await handleCopyMessage();
    // Open Google Chat DM in new window/tab
    window.open(chatLinks.primary, '_blank', 'noopener,noreferrer');
  };

  const isExact = matchType === 'exact' || score >= 0.95;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg transition-all">
      {/* Status banner */}
      <div
        className={`flex items-center justify-between px-5 py-3 ${
          isExact
            ? 'bg-emerald-50 border-b border-emerald-100 text-emerald-900'
            : 'bg-amber-50 border-b border-amber-100 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-2">
          {isExact ? (
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          )}
          <div>
            <span className="font-semibold text-sm">
              {isExact ? 'Vehicle Owner Identified' : 'Closest Plate Match Found'}
            </span>
            <span className="ml-2 text-xs opacity-75">
              {Math.round(score * 100)}% confidence
            </span>
          </div>
        </div>

        <button
          onClick={onClear}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline"
        >
          Clear Result
        </button>
      </div>

      <div className="p-5 sm:p-6">
        {/* Employee Info Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            {employee.avatar ? (
              <img
                src={employee.avatar}
                alt={employee.name}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-md shadow-slate-200 ring-2 ring-slate-100"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xl shadow-md">
                {employee.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
            )}

            <div>
              <h3 className="text-xl font-bold text-slate-900">{employee.name}</h3>
              <p className="text-sm font-medium text-blue-600">{employee.department}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {employee.email}
                </span>
                {employee.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {employee.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Plate badge */}
          <div className="flex flex-col items-end sm:items-end w-full sm:w-auto">
            <div className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-800 bg-amber-50 px-3 py-1.5 shadow-sm">
              <span className="rounded bg-blue-700 px-1 text-[10px] font-black text-white">
                IND
              </span>
              <span className="font-mono text-base font-black tracking-widest text-slate-900">
                {employee.plateNumber}
              </span>
            </div>
            {searchedPlate && searchedPlate !== employee.plateNumber && (
              <span className="mt-1 text-[11px] text-slate-400">
                Detected: {searchedPlate}
              </span>
            )}
          </div>
        </div>

        {/* Vehicle & Parking Bay Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Registered Vehicle</p>
              <p className="text-sm font-semibold text-slate-800">{employee.carModel || 'Car'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Assigned / Usual Spot</p>
              <p className="text-sm font-semibold text-slate-800">{employee.parkingBay || 'General Parking'}</p>
            </div>
          </div>
        </div>

        {employee.notes && (
          <p className="text-xs text-slate-500 bg-slate-50/60 rounded-lg p-2.5 mb-4 border border-slate-100 italic">
            Note: {employee.notes}
          </p>
        )}

        {/* Message Composer & Google Chat Trigger */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5 mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Direct Google Chat Message Generator
            </span>

            {/* Urgency presets */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setUrgency('polite')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  urgency === 'polite'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Polite Request
              </button>
              <button
                type="button"
                onClick={() => setUrgency('meeting')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  urgency === 'meeting'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Clock className="inline h-3 w-3 mr-1" />
                Meeting Exiting
              </button>
              <button
                type="button"
                onClick={() => setUrgency('urgent')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  urgency === 'urgent'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Urgent
              </button>
            </div>
          </div>

          {/* Context location modifier */}
          <div className="mb-2.5 flex items-center gap-2">
            <span className="text-xs text-slate-600 whitespace-nowrap">Location/Bay:</span>
            <input
              type="text"
              value={customSpot}
              onChange={(e) => setCustomSpot(e.target.value)}
              placeholder="e.g. blocking spot #14 / my car"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Generated Message preview */}
          <div className="relative rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 shadow-inner">
            {draftMessage}
          </div>

          {/* Primary Action Button: 1-Click Launch Google Chat */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              id="btn-open-google-chat"
              onClick={handleOpenGoogleChatAndCopy}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] transition-all cursor-pointer"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Open Google Chat &amp; Copy Message</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </button>

            <button
              id="btn-copy-only"
              onClick={handleCopyMessage}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                copied
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              title="Copy text message to clipboard"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>

          {/* Secondary alternatives */}
          <div className="mt-3 flex items-center justify-between border-t border-blue-100/80 pt-3 text-xs text-slate-500">
            <span>Other communication options:</span>
            <div className="flex items-center gap-3">
              {employee.phone && (
                <>
                  <a
                    href={`https://wa.me/${employee.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(draftMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-emerald-600 hover:underline inline-flex items-center gap-1"
                  >
                    WhatsApp
                  </a>
                  <span className="text-slate-300">•</span>
                  <a
                    href={`tel:${employee.phone}`}
                    className="font-medium text-slate-700 hover:underline inline-flex items-center gap-1"
                  >
                    Call
                  </a>
                  <span className="text-slate-300">•</span>
                </>
              )}
              <a
                href={`mailto:${employee.email}?subject=${encodeURIComponent(`Parking: Vehicle ${employee.plateNumber}`)}&body=${encodeURIComponent(draftMessage)}`}
                className="font-medium text-blue-600 hover:underline"
              >
                Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
