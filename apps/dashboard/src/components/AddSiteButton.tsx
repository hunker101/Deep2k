'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddSiteModal } from './AddSiteModal';

export function AddSiteButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleCreated() {
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-emerald-400 hover:bg-emerald-300 text-black text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
      >
        + Add site
      </button>

      {open && (
        <AddSiteModal
          onClose={() => setOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
