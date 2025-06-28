import { useId, forwardRef } from 'react';

interface InputProps {
  type?: 'text' | 'number';
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hideLabel?: boolean;
  placeholder?: string;
  min?: string;
  step?: string;
  className?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  type = 'text',
  value,
  onChange,
  label,
  hideLabel = false,
  placeholder,
  min,
  step,
  className = ''
}, ref) => {
  const id = useId();

  return (
    <div className="relative">
      <input
        id={id}
        ref={ref}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
        className={`peer w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      />
      {label && (
        <label
          htmlFor={id}
          className={hideLabel ? 'sr-only' : `absolute left-2 -top-2 px-1 text-xs text-gray-500 bg-white transition-all duration-200
            peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-2
            peer-focus:-top-2 peer-focus:text-xs peer-focus:text-gray-500 select-none cursor-pointer`}
        >
          {label}
        </label>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input; 