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
    <div className="mt-6 border-t pt-4 mb-6">
      <h3 className="text-lg font-semibold mb-3">Bill Summary</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="text-right">{formatCurrency(subtotal, locale, currency)}</span>
        </div>
        
        {showDetails && validExtraCharges.map(charge => {
          const amount = charge.type === 'percentage' 
            ? subtotal * (parseFloat(charge.value) / 100)
            : parseFloat(charge.value);
          return (
            <div key={charge.id} className="flex justify-between text-sm text-gray-600">
              <span>{charge.name} ({charge.type === 'percentage' ? `${charge.value}%` : 'fixed'}):</span>
              <span>{formatCurrency(amount, locale, currency)}</span>
            </div>
          );
        })}
        
        <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
          <span>Total:</span>
          <span>{formatCurrency(total, locale, currency)}</span>
        </div>
      </div>
    </div>
  );
}