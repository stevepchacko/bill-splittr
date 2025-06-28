import { ExtraCharge } from '../types';
import { formatCurrency } from '../utils/currency';
import React from 'react';

interface BillSummaryProps {
  subtotal: number;
  extraCharges?: ExtraCharge[];
  total: number;
  showDetails?: boolean;
  locale?: string;
  currency?: string;
}

export default function BillSummary({ 
  subtotal, 
  extraCharges = [], 
  total, 
  showDetails = false,
  locale = 'en-US',
  currency = 'USD'
}: BillSummaryProps) {
  const validExtraCharges = extraCharges.filter(charge => 
    charge.name.trim() && !isNaN(parseFloat(charge.value)) && charge.value !== '0'
  );

  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="text-lg font-semibold mb-3">Bill Summary</h3>
      <div className="grid grid-cols-[1fr_auto] gap-4">
        {/* Subtotal Row */}
        <span>Subtotal:</span>
        <span className="text-right">{formatCurrency(subtotal, locale, currency)}</span>
        
        {/* Extra Charges Rows */}
        {showDetails && validExtraCharges.map(charge => {
          const amount = charge.type === 'percentage' 
            ? subtotal * (parseFloat(charge.value) / 100)
            : parseFloat(charge.value);
          return (
            <React.Fragment key={charge.id}>
              <span>{charge.name} ({charge.type === 'percentage' ? `${charge.value}%` : 'fixed'}):</span>
              <span className="text-right">{formatCurrency(amount, locale, currency)}</span>
            </React.Fragment>
          );
        })}
        
        {/* Total Row */}
        <span className="font-bold">Total:</span>
        <span className="font-bold text-right">{formatCurrency(total, locale, currency)}</span>
      </div>
    </div>
  );
}