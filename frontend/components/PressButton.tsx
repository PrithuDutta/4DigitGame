interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function PressButton({ label, onPress, disabled }: Props) {
  return (
    <button
      className="w-full max-w-xs rounded px-5 py-4 text-lg font-bold text-white transition-opacity disabled:opacity-40"
      style={{ background: "var(--accent-blue)" }}
      onClick={onPress}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
