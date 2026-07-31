export function AdminBadgeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L19.794 7.5V16.5L12 21L4.206 16.5V7.5L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 9.5A2.5 2.5 0 1 0 12 14.5A2.5 2.5 0 1 0 12 9.5Z" stroke="currentColor" strokeWidth="2" />
      <path d="M12 5V7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 12H16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7.5 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 19V16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronLeftIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 7L7 19A2 2 0 0 0 9 21H15A2 2 0 0 0 17 19L18 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 7V5A1 1 0 0 1 10 4H14A1 1 0 0 1 15 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export async function copyToClipboard(r1) {
  if (!navigator?.clipboard?.writeText) {
    return;
  }
  let r5 = r1.trim();
  if (r5) {
    await navigator.clipboard.writeText(r5);
  }
}
