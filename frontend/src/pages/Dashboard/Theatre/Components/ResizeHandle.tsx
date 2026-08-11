import type {
    KeyboardEvent as ReactKeyboardEvent,
    PointerEvent as ReactPointerEvent,
  } from 'react';
  
  interface ResizeHandleProps {
    label: string;
    onPointerDown: (e: ReactPointerEvent) => void;
    onKeyDown: (e: ReactKeyboardEvent) => void;
    onReset: () => void;
  }
  
  export default function ResizeHandle({ label, onPointerDown, onKeyDown, onReset }: ResizeHandleProps) {
    return (
      <div
        className="theatre__handle"
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        onDoubleClick={onReset}
      />
    );
  }