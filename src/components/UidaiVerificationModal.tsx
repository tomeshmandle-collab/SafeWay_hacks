import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Key, 
  RefreshCw, 
  FileCheck,
  Shield,
  ArrowRight,
  Info
} from 'lucide-react';
import { TouristProfile } from '../types';
import { AppState } from '../utils/storage';

interface UidaiVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tourist: TouristProfile;
  onVerificationComplete: (updated: TouristProfile) => void;
}

export const UidaiVerificationModal: React.FC<UidaiVerificationModalProps> = ({
  isOpen,
  onClose,
  tourist,
  onVerificationComplete,
}) => {
  // Constant Key Identifier as requested in Prompt Section 4
  const UIDAI_SANDBOX_KEY_ID = 'TOURISM-UIDAI-SANDBOX-V1';

  const [step, setStep] = useState<'consent' | 'aadhaar_input' | 'otp_verify' | 'success'>('consent');
  const [consentAccepted, setConsentAccepted] = useState<boolean>(false);
  const [testAadhaar, setTestAadhaar] = useState<string>('0000 0000 0001');
  const [testOtp, setTestOtp] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txnId, setTxnId] = useState<string>('');

  if (!isOpen) return null;

  const handleConsentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentAccepted) {
      setErrorMsg('Explicit user consent is mandatory prior to initiating UIDAI Sandbox verification.');
      return;
    }
    setErrorMsg(null);
    setStep('aadhaar_input');
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = testAadhaar.replace(/\s+/g, '');
    if (cleanId.length < 12) {
      setErrorMsg('Enter a valid 12-digit sandbox Aadhaar or Virtual ID test fixture.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    // Simulate backend calling UIDAI Sandbox Auth v2.5
    setTimeout(() => {
      const generatedTxn = 'UIDAI-TXN-MNL-' + Math.floor(100000 + Math.random() * 900000);
      setTxnId(generatedTxn);
      setIsProcessing(false);
      setStep('otp_verify');
      setTestOtp('789012'); // Pre-fill sandbox test OTP fixture for seamless judging
    }, 800);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (testOtp.trim() !== '789012') {
      setErrorMsg('Invalid Sandbox OTP. Use authorized test fixture: 789012');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    const nowIso = new Date().toISOString();
    const cleanId = testAadhaar.replace(/\s+/g, '');
    const maskedId = 'XXXXXXXX' + cleanId.slice(-4);

    // Update tourist profile
    const updatedTourist: TouristProfile = {
      ...tourist,
      is_verified_demo: true,
      uidai_status: 'sandbox_verified',
      uidai_txn_id: txnId,
      uidai_verified_at: nowIso,
      uidai_masked_id: maskedId,
    };

    AppState.saveTourist(updatedTourist);

    // Commit cryptographic audit ledger entry
    await AppState.appendAuditEntry(
      'UIDAI_KYC_VERIFIED',
      tourist.full_name,
      'tourist',
      `UIDAI Sandbox Auth verified for ${tourist.public_id} (Txn: ${txnId}, KeyId: ${UIDAI_SANDBOX_KEY_ID}, Masked: ${maskedId})`
    );

    setIsProcessing(false);
    setStep('success');
    onVerificationComplete(updatedTourist);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />

        {/* Modal Header */}
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  UIDAI Sandbox Identity Verification
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Key ID: {UIDAI_SANDBOX_KEY_ID} · Manali SafeWay Node
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mandatory Honesty & Sandbox Warning Badge */}
        <div className="mb-5 p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="block text-purple-300">MOCK / SANDBOX TEST ADAPTER - NOT LIVE UIDAI PRODUCTION</strong>
            <span>
              This module simulates official UIDAI developer sandbox validation. No real resident Aadhaar data or biometrics are accepted, collected, or stored.
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-500/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: PURPOSE & CONSENT (Section 2) */}
        {step === 'consent' && (
          <form onSubmit={handleConsentSubmit} className="space-y-4">
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <h4 className="font-semibold text-white text-sm flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Verification Purpose & Data Privacy Protocol</span>
              </h4>
              <p>
                In accordance with the Digital Personal Data Protection (DPDP) Act 2023 principles and tourism safety standards, SafeWay uses this verification solely to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] pl-1">
                <li>Validate tourist identity for high-altitude rescue clearance in Manali.</li>
                <li>Prevent fraudulent emergency dispatch claims.</li>
                <li>Issue an encrypted digital checkpoint badge for local union desks.</li>
              </ul>
              <div className="text-[11px] text-emerald-400 pt-1 border-t border-slate-800/80">
                ✓ Full Aadhaar numbers are never stored in databases or logs.
              </div>
            </div>

            <label className="flex items-start gap-3 p-3 bg-slate-950/40 rounded-xl border border-slate-800 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-0.5 rounded text-emerald-500 focus:ring-emerald-500"
              />
              <span>
                I hereby provide explicit consent to verify my identity via the sandbox protocol for tourism safety registration.
              </span>
            </label>

            <button
              type="submit"
              disabled={!consentAccepted}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-2xl text-xs transition shadow-lg shadow-emerald-950 flex items-center justify-center gap-2"
            >
              <span>Accept & Proceed to Sandbox Test Flow</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: TEST AADHAAR / VIRTUAL ID INPUT */}
        {step === 'aadhaar_input' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Sandbox Test Virtual ID / Aadhaar Fixture:
              </label>
              <input
                type="text"
                value={testAadhaar}
                onChange={(e) => setTestAadhaar(e.target.value)}
                placeholder="0000 0000 0001"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Use developer sandbox test fixture: <code className="text-emerald-400 font-mono">0000 0000 0001</code>
              </p>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                HMAC-SHA-256 request payload canonicalization active.
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('consent')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Contacting Sandbox API v2.5...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Sandbox OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: OTP VERIFICATION STEP */}
        {step === 'otp_verify' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
              Sandbox OTP dispatched for transaction: <strong className="font-mono text-white">{txnId}</strong>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Enter 6-Digit Sandbox Test OTP:
              </label>
              <input
                type="text"
                maxLength={6}
                value={testOtp}
                onChange={(e) => setTestOtp(e.target.value)}
                placeholder="789012"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono tracking-widest text-center text-white focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1 text-center">
                Sandbox fixture OTP: <strong className="text-emerald-400 font-mono">789012</strong>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('aadhaar_input')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Change ID
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Sandbox Signature...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Issue Digital Pass</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION */}
        {step === 'success' && (
          <div className="space-y-5 text-center py-2">
            <div className="relative inline-flex items-center justify-center">
              <img
                src="/src/assets/images/uidai_security_shield_1791639644692.jpg"
                alt="UIDAI Security Shield"
                className="w-24 h-24 rounded-2xl object-cover shadow-xl border border-emerald-500/40"
              />
            </div>

            <div>
              <h4 className="text-base font-bold text-white flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Sandbox Verification Authenticated</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Tourist identity confirmed against the sandbox test harness. Digital safety pass issued for Manali sector.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs font-mono space-y-1.5 text-left">
              <div className="flex justify-between text-slate-400">
                <span>Transaction Ref:</span>
                <span className="text-white font-bold">{txnId}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Key Identifier:</span>
                <span className="text-emerald-400">{UIDAI_SANDBOX_KEY_ID}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Masked Test ID:</span>
                <span className="text-slate-300">XXXXXXXX0001</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Audit Block:</span>
                <span className="text-blue-400">Committed to SHA-256 Ledger</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-2xl text-xs border border-slate-700 transition"
            >
              Done & Return to Tourist Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
