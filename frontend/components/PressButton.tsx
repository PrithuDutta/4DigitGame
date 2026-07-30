interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function PressButton({ label, onPress, disabled }: Props) {
  return (
    <button
      className="w-full rounded-xl bg-indigo-600 py-3 text-lg font-bold uppercase tracking-wider text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
      onClick={onPress}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
