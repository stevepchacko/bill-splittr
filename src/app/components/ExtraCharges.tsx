import { ExtraCharge } from '../types';
import { formatCurrency } from '../utils/currency';
import Input from './Input';
import { MdClose } from 'react-icons/md';

interface ExtraChargeProps {
  charge: ExtraCharge;
  onUpdate: (id: number, field: keyof ExtraCharge, value: string | 'amount' | 'percentage') => void;
  onRemove: (id: number) => void;
  locale?: string;
  currency?: string;
}

export default function ExtraCharges({ charge, onUpdate, onRemove, locale = 'en-US', currency = 'USD' }: ExtraChargeProps) {
  return (
    <div className="space-y-3">
      <Input
        type="text"
        value={charge.name}
        onChange={(value) => onUpdate(charge.id, 'name', value)}
        label="Charge Name"
        placeholder=""
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <select 
            value={charge.type} 
            onChange={(e) => onUpdate(charge.id, 'type', e.target.value as 'amount' | 'percentage')}
            className="border rounded px-3 py-2 w-36"
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
        </div>
        
        <div className="flex-grow flex items-center justify-end gap-4">
          <div className="text-right">
            {charge.type === 'percentage' ? (
              <span className="text-gray-600">
                {charge.value}% = {formatCurrency(parseFloat(charge.calculatedValue || '0'), locale, currency)}
              </span>
            ) : (
              <span className="text-gray-600">
                {formatCurrency(parseFloat(charge.calculatedValue || '0'), locale, currency)}
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
      </div>
    </div>
  );
}