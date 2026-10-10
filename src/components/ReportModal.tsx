import React, { useState } from 'react';
import { X, AlertTriangle, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { ReportType, CommunityReport } from '../types';
import { api } from '../lib/api';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: [number, number];
  onReportSubmitted?: (report: CommunityReport) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onReportSubmitted,
}) => {
  const [reportType, setReportType] = useState<ReportType>('landslide');
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('NH-3 Solang corridor');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setIsSubmitting(true);
    try {
      const rep = await api.submitReport({
        report_type: reportType,
        title,
        location_name: locationName,
        description,
        latitude: currentLocation[0],
        longitude: currentLocation[1],
      });

      setSubmitted(true);
      if (onReportSubmitted) {
        onReportSubmitted(rep);
      }
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Report Problem / Road Hazard</h3>
              <p className="text-xs text-slate-400">Community Safety Alert for Manali</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close report modal"
            className="w-8 h-8 rounded-full bg-slate-750 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h4 className="text-lg font-bold text-white">Report Submitted to Control Room</h4>
            <p className="text-xs text-slate-300">
              Thank you for keeping fellow tourists safe! Authorities will review and corroborate your report.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Category selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
                Hazard / Incident Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'landslide', label: 'Landslide', emoji: '⛰️' },
                  { id: 'scam', label: 'Overcharge / Scam', emoji: '⚠️' },
                  { id: 'roadblock', label: 'Road Block', emoji: '🚧' },
                  { id: 'accident', label: 'Accident', emoji: '💥' },
                  { id: 'flood', label: 'Flash Flood', emoji: '🌊' },
                  { id: 'harassment', label: 'Harassment', emoji: '🚨' },
                ].map(item => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setReportType(item.id as ReportType)}
                    className={`p-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                      reportType === item.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span>{item.emoji}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase">
                Brief Headline / Issue
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Small rockfall across single lane near Palchan"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Location name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase">
                Landmark / Specific Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={locationName}
                  onChange={e => setLocationName(e.target.value)}
                  placeholder="e.g. Nehru Kund 500m curve"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                GPS locked to: {currentLocation[0].toFixed(4)}, {currentLocation[1].toFixed(4)}
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase">
                Additional Details (Optional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe road blockage, vehicle delays, weather severity or license details..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            {/* Submit buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-950 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
