'use client';

import { useState } from 'react';
import { BulkUploadModal } from './BulkUploadModal';

export function BulkUploadButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-[#1a2e22] hover:bg-[#213d2a] border border-[#2a4a32] text-emerald-400 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors flex items-center gap-2"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Bulk upload
      </button>

      {open && <BulkUploadModal onClose={() => setOpen(false)} />}
    </>
  );
}
