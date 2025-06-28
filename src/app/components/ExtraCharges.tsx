import { ExtraCharge } from '../types';
import { formatCurrency } from '../utils/currency';
import Input from './Input';
import { MdClose } from 'react-icons/md';

interface ExtraChargeProps {
  charge: ExtraCharge;
  subtotal: number;
  onUpdate: (id: number, field: keyof ExtraCharge, value: string | 'amount' | 'percentage') => void;
  onRemove: (id: number) => void;
  locale?: string;
  currency?: string;
}

export default function ExtraCharges({ charge, subtotal, onUpdate, onRemove, locale = 'en-US', currency = 'USD' }: ExtraChargeProps) {
  return (
    <div className="flex items-center gap-4 mb-3 flex-wrap">
      <div className="flex-grow">
        <Input
          type="text"
          value={charge.name}
          onChange={(value) => onUpdate(charge.id, 'name', value)}
          label="Charge Name"
          placeholder=""
        />
      </div>
      
      <select 
        value={charge.type} 
        onChange={(e) => onUpdate(charge.id, 'type', e.target.value as 'amount' | 'percentage')}
        className="border rounded px-3 py-2"
      >
        <option value="amount">Amount ({currency})</option>
        <option value="percentage">Percentage (%)</option>
      </select>
      
      <div className="w-24">
        <Input
          type="number"
          value={charge.value}
          onChange={(value) => onUpdate(charge.id, 'value', value)}
          label={charge.type === 'percentage' ? 'Percentage' : 'Amount'}
          placeholder=""
          min="0"
          step={charge.type === 'percentage' ? '0.1' : '0.01'}
        />
      </div>
      
      <div className="w-24 text-right">
        {charge.type === 'percentage' ? (
          <span className="text-gray-600">
            {charge.value}% = {formatCurrency(parseFloat(charge.calculatedValue || '0'), locale, currency)}
          </span>
        ) : (
          <span className="text-gray-600">
            ${formatCurrency(parseFloat(charge.calculatedValue || '0'), locale, currency)}
          </span>
        )}
      </div>
      
      <button 
        onClick={() => onRemove(charge.id)}
        className="remove-button"
        title="Remove"
      >
        <MdClose />
      </button>
    </div>
  );
}