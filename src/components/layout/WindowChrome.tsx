export function WindowChrome() {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 bg-bg-secondary border-b border-border-light select-none" data-tauri-drag-region>
      <div className="flex gap-2">
        <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
        <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
        <div className="w-3 h-3 rounded-full bg-[#28C840]" />
      </div>
      <div className="text-[13px] font-medium text-text-secondary">
        xVideo
      </div>
      <div className="w-[60px]" />
    </div>
  );
}