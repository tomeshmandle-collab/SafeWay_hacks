import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  AlertTriangle, 
  Lock, 
  Link2, 
  Bug, 
  Hash, 
  Copy, 
  Check
} from 'lucide-react';
import { AuditBlock } from '../types';
import { computeBlockHash } from '../utils/crypto';
import { AppState } from '../utils/storage';

interface AuditLedgerViewProps {
  ledger: AuditBlock[];
  onRefreshLedger: () => void;
}

export const AuditLedgerView: React.FC<AuditLedgerViewProps> = ({
  ledger,
  onRefreshLedger,
}) => {
  const [verificationResults, setVerificationResults] = useState<{
    isValid: boolean;
    brokenBlockIndex: number | null;
    verifiedBlocks: { index: number; valid: boolean; computedHash: string }[];
  } | null>(null);

  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [tamperedBlocks, setTamperedBlocks] = useState<AuditBlock[]>(ledger);
  const [isTamperMode, setIsTamperMode] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    setTamperedBlocks(ledger);
  }, [ledger]);

  // Cryptographic Chain Verification (/verify)
  const handleVerifyChain = async () => {
    setIsVerifying(true);
    const chainToVerify = isTamperMode ? tamperedBlocks : ledger;
    const verifiedBlocks: { index: number; valid: boolean; computedHash: string }[] = [];
    let isValidChain = true;
    let brokenIndex: number | null = null;

    for (let i = 0; i < chainToVerify.length; i++) {
      const block = chainToVerify[i];
      const prevHash = i === 0 ? '0'.repeat(64) : chainToVerify[i - 1].block_hash;

      // Recompute SHA-256 hash
      const computed = await computeBlockHash(
        block.index,
        block.timestamp,
        block.action,
        block.actor,
        block.actor_role,
        block.payload_summary,
        prevHash
      );

      const hashMatches = computed === block.block_hash;
      const prevMatches = i === 0 || block.prev_hash === chainToVerify[i - 1].block_hash;
      const isBlockValid = hashMatches && prevMatches;

      verifiedBlocks.push({
        index: block.index,
        valid: isBlockValid,
        computedHash: computed,
      });

      if (!isBlockValid && brokenIndex === null) {
        isValidChain = false;
        brokenIndex = block.index;
      }
    }

    setVerificationResults({
      isValid: isValidChain,
      brokenBlockIndex: brokenIndex,
      verifiedBlocks,
    });
    setIsVerifying(false);
  };

  // Simulate Tampering with block #2 (SOS record)
  const handleToggleTamper = () => {
    if (!isTamperMode) {
      // Modify payload of block #2 without updating hash
      const corrupted = ledger.map((b) => {
        if (b.index === 2) {
          return {
            ...b,
            payload_summary: '[TAMPERED BY ATTACKER]: Maliciously altered emergency coordinates!',
          };
        }
        return b;
      });
      setTamperedBlocks(corrupted);
      setIsTamperMode(true);
    } else {
      setTamperedBlocks(ledger);
      setIsTamperMode(false);
    }
    setVerificationResults(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const currentChain = isTamperMode ? tamperedBlocks : ledger;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                SHA-256 Cryptographic Chain
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                Tamper-Evident Ledger
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Safety Audit Chain & Verification (/verify)
            </h2>
            <p className="text-xs text-slate-400">
              Every emergency SOS, responder assignment, hazard activation, and service approval is committed into an append-only hash chain.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleTamper}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 ${
                isTamperMode
                  ? 'bg-rose-600 text-white border-rose-500 animate-pulse shadow-lg shadow-rose-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              <span>{isTamperMode ? 'Tamper Active (Click to Revert)' : 'Simulate Tamper Attack'}</span>
            </button>

            <button
              onClick={handleVerifyChain}
              disabled={isVerifying}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-950 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>Verify Ledger Integrity</span>
            </button>
          </div>
        </div>

        {/* Verification Banner */}
        {verificationResults && (
          <div className={`mt-5 p-4 rounded-2xl border transition ${
            verificationResults.isValid
              ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/60 text-rose-200'
          }`}>
            <div className="flex items-start gap-3">
              {verificationResults.isValid ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <h4 className="font-bold text-sm">
                  {verificationResults.isValid
                    ? 'Cryptographic Verification Passed: All Blocks Valid'
                    : `Tampering Detected: Chain Broken at Block #${verificationResults.brokenBlockIndex}`}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {verificationResults.isValid ? (
                    <>
                      Re-walked {verificationResults.verifiedBlocks.length} sequential blocks from genesis. 
                      Every SHA-256 payload digest and parent hash link matches exactly. Proof of un-tampered record.
                    </>
                  ) : (
                    <>
                      Block #{verificationResults.brokenBlockIndex} payload does not match its committed SHA-256 block hash! 
                      Any retrospective alteration breaks the subsequent hash pointers.
                    </>
                  )}
                </p>
                <div className="text-[11px] text-slate-400 pt-1">
                  Status: <strong>Tamper-evident verification guarantee</strong> (PRD FR-43)
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Block List */}
      <div className="space-y-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Cryptographic Audit Blocks ({currentChain.length})
        </div>

        <div className="space-y-4">
          {currentChain.map((block, idx) => {
            const blockVerification = verificationResults?.verifiedBlocks.find((v) => v.index === block.index);
            const isCorrupted = blockVerification && !blockVerification.valid;

            return (
              <div
                key={block.index}
                className={`p-5 rounded-3xl border transition relative ${
                  isCorrupted
                    ? 'bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/40'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                {/* Block Chain Link Visual */}
                {idx > 0 && (
                  <div className="absolute -top-3 left-8 w-0.5 h-3 bg-slate-700" />
                )}

                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
                      #{block.index}
                    </span>
                    <span className="font-bold text-white text-sm">
                      {block.action}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {block.actor} ({block.actor_role})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">
                      {new Date(block.timestamp).toLocaleString()}
                    </span>
                    {blockVerification && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        blockVerification.valid
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300 animate-pulse'
                      }`}>
                        {blockVerification.valid ? '✓ Valid' : '✗ Tampered'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Payload Summary */}
                <div className={`p-3 rounded-2xl border text-xs mb-3 font-mono ${
                  block.payload_summary.includes('TAMPERED')
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 font-bold'
                    : 'bg-slate-950/70 border-slate-800 text-slate-200'
                }`}>
                  <span className="text-slate-500 block text-[10px] font-sans font-semibold uppercase">
                    Committed Action Payload
                  </span>
                  {block.payload_summary}
                </div>

                {/* Cryptographic Hashes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                  <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px] flex items-center gap-1 font-sans">
                      <Link2 className="w-3 h-3" />
                      <span>Previous Block Hash (Parent):</span>
                    </span>
                    <span className="text-slate-400 truncate block mt-0.5">
                      {block.prev_hash}
                    </span>
                  </div>

                  <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                    <div className="flex justify-between items-center text-[10px] font-sans text-slate-500">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3 text-emerald-400" />
                        <span>SHA-256 Current Block Hash:</span>
                      </span>
                      <button
                        onClick={() => copyToClipboard(block.block_hash)}
                        className="text-slate-400 hover:text-white"
                        title="Copy hash"
                      >
                        {copiedHash === block.block_hash ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <span className="text-emerald-400 truncate block mt-0.5 font-bold">
                      {block.block_hash}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
