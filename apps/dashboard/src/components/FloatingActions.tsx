'use client';

import { useState } from 'react';
import { AddSiteModal } from './AddSiteModal';
import { BulkUploadModal } from './BulkUploadModal';
import { useRouter } from 'next/navigation';

export function FloatingActions() {
  const [open, setOpen] = useState(false);
  const [showAddSite, setShowAddSite] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const router = useRouter();

  function handleCreated() {
    router.refresh();
  }

  function openAddSite() {
    setOpen(false);
    setShowAddSite(true);
  }

  function openBulkUpload() {
    setOpen(false);
    setShowBulkUpload(true);
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* FAB container */}
      <div className="fixed bottom-8 right-6 z-40 flex flex-col items-end gap-3">

        {/* Action options — slide up when open */}
        <div className={`flex flex-col items-end gap-2.5 transition-all duration-300 ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>

          {/* Bulk upload */}
          <div className="flex items-center gap-3">
            <span className="bg-[#0d1a14] border border-[#1a2e22] text-white text-xs font-mono px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
              Bulk upload
            </span>
            <button
              onClick={openBulkUpload}
              className="w-12 h-12 bg-[#0d1a14] border border-[#1a2e22] hover:border-emerald-500 hover:bg-[#1a2e22] text-emerald-400 rounded-full flex items-center justify-center shadow-lg transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </button>
          </div>

          {/* Add site */}
          <div className="flex items-center gap-3">
            <span className="bg-[#0d1a14] border border-[#1a2e22] text-white text-xs font-mono px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
              Add site
            </span>
            <button
              onClick={openAddSite}
              className="w-12 h-12 bg-emerald-400 hover:bg-emerald-300 text-black rounded-full flex items-center justify-center shadow-lg transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Main FAB button */}
        <button
          onClick={() => setOpen(o => !o)}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
            open
              ? 'bg-[#1a2e22] border border-[#2a4a32] text-white rotate-45'
              : 'bg-emerald-400 hover:bg-emerald-300 text-black'
          }`}
        >
          <svg
            width="22" height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="transition-transform duration-300"
          >
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Modals */}
      {showAddSite && (
        <AddSiteModal
          onClose={() => setShowAddSite(false)}
          onCreated={handleCreated}
        />
      )}
      {showBulkUpload && (
        <BulkUploadModal onClose={() => setShowBulkUpload(false)} />
      )}
    </>
  );
}
