interface ScratchPanelProps {
    value: string;
    onChange: (value: string) => void;
  }
  
  export default function ScratchPanel({ value, onChange }: ScratchPanelProps) {
    return (
      <textarea
        className="theatre__scratch"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Names improvised on the fly, promises made, loose threads to follow up…"
        aria-label="Scratch notes"
      />
    );
  }