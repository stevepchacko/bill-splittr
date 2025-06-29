import React, { useState } from 'react';
import { BillItem, Person, Shares } from '../types';
import { formatCurrency } from '../utils/currency';

interface SelectSharesProps {
  billItems: BillItem[];
  people: Person[];
  shares: Shares;
  updateShare: (personId: number, itemId: number, share: boolean, quantity?: number) => void;
  updateEqualSplit?: (itemId: number, equalSplit: boolean) => void;
  locale: string;
  currency: string;
}

export default function SelectShares({ 
  billItems, 
  people, 
  shares, 
  updateShare,
  updateEqualSplit,
  locale = 'en-US',
  currency = 'USD'
}: SelectSharesProps) {
  const [editingQuantity, setEditingQuantity] = useState<{[key: string]: boolean}>({});

  const handleAddPerson = (personId: number, itemId: number, equalSplit: boolean) => {
    const currentShares = shares[personId] || [];
    const existingShare = currentShares.find(s => s.itemId === itemId);
    
    if (existingShare?.share) {
      updateShare(personId, itemId, false);
      return;
    }

    const sharingPeople = people.filter(person => {
      const personShares = shares[person.id] || [];
      const itemShare = personShares.find(s => s.itemId === itemId);
      return itemShare?.share || false;
    });

    const hasCustomQuantities = sharingPeople.some(person => {
      const personShares = shares[person.id] || [];
      const itemShare = personShares.find(s => s.itemId === itemId);
      return itemShare?.quantity && itemShare.quantity > 1;
    });

    if (equalSplit) {
      updateShare(personId, itemId, true, 1);
    } else if (hasCustomQuantities) {
      setEditingQuantity(prev => ({ ...prev, [`${itemId}-${personId}`]: true }));
    } else {
      updateShare(personId, itemId, true, 1);
    }
  };

  const handleQuantityChange = (personId: number, itemId: number, newQuantity: number) => {
    if (newQuantity > 0) {
      updateShare(personId, itemId, true, newQuantity);
      setEditingQuantity(prev => {
        const newState = { ...prev };
        delete newState[`${itemId}-${personId}`];
        return newState;
      });
    }
  };

  const getTotalAllocatedQuantity = (itemId: number) => {
    return people.reduce((total, person) => {
      const personShares = shares[person.id] || [];
      const itemShare = personShares.find(s => s.itemId === itemId);
      if (itemShare?.share) {
        return total + (itemShare.quantity || 1);
      }
      return total;
    }, 0);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Step 4: Select Shares</h2>
      <p className="mb-4">Select which items each person is sharing:</p>
      
      <div className="space-y-4">
        {billItems.map(item => {
          const itemQuantity = parseInt(item.quantity);
          const sharingPeople = people.filter(person => {
            const personShares = shares[person.id] || [];
            const itemShare = personShares.find(s => s.itemId === item.id);
            return itemShare?.share || false;
          });
          const unselectedPeople = people.filter(person => {
            const personShares = shares[person.id] || [];
            const itemShare = personShares.find(s => s.itemId === item.id);
            return !itemShare?.share;
          });
          
          const allocatedQuantity = getTotalAllocatedQuantity(item.id);
          const quantityMismatch = allocatedQuantity !== itemQuantity;
          
          return (
            <div key={item.id} className="border rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex-1 min-w-[200px]">
                  <h3 className="font-semibold text-lg">
                    {item.name} ({formatCurrency(parseFloat(item.price), locale, currency)}) 
                    <span className="text-gray-600 font-normal ml-2">× {item.quantity}</span>
                  </h3>
                </div>
                
                <button
                  onClick={() => updateEqualSplit?.(item.id, !item.equalSplit)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors w-full sm:w-40 text-center select-none ${
                    item.equalSplit
                    ? 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200'
                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200'
                  }`}
                >
                  {item.equalSplit ? 'Equal Split' : 'Split Separately'}
                </button>
              </div>
                  
              {unselectedPeople.length > 0 &&
                <div className="mt-3">
                  <p className="text-sm text-gray-500 mb-2">
                    Click to add contributors:
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-wrap gap-2 flex-1">
                      {unselectedPeople.map(person => (
                        <span
                          key={person.id}
                          className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-500 transition-colors cursor-pointer hover:bg-gray-300"
                          onClick={() => handleAddPerson(person.id, item.id, item.equalSplit || false)}
                        >
                          {person.name}
                        </span>
                      ))}
                    </div>
                    
                    <div className="ml-4 flex-shrink-0">
                      {unselectedPeople.length > 0 && (
                        <button
                          className="px-3 py-1 rounded-lg text-sm font-medium bg-blue-200 text-blue-800 cursor-pointer hover:bg-blue-300 transition-colors leading-tight text-center"
                          onClick={() => {
                            unselectedPeople.forEach(person => {
                              handleAddPerson(person.id, item.id, item.equalSplit || false);
                            });
                          }}
                        >
                          <span>Add</span>
                          <span className="sm:hidden"><br /></span>
                          <span>&nbsp;All</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              }
              
              {sharingPeople.length > 0 && (
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Contributors: (click to remove):</p>
                    {!(item.equalSplit) && (
                      <p className={`text-sm font-medium ${quantityMismatch ? 'text-red-500' : 'text-green-500'}`}>
                        Allocated: {allocatedQuantity} / {itemQuantity}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-wrap gap-2 items-center">
                      {sharingPeople.map(person => {
                        const personShares = shares[person.id] || [];
                        const itemShare = personShares.find(s => s.itemId === item.id);
                        const quantity = itemShare?.quantity || 1;
                        const isEditing = editingQuantity[`${item.id}-${person.id}`];
                        const key = `${item.id}-${person.id}`;
                        
                        return (
                          <div key={person.id} className="flex items-center gap-1">
                            <span
                              className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200 cursor-pointer"
                              onClick={() => updateShare(person.id, item.id, false)}
                            >
                              {person.name}
                            </span>
                            
                            {!(item.equalSplit) && (
                              isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="1"
                                    max={itemQuantity}
                                    defaultValue={quantity}
                                    className="w-12 px-1 py-1 border rounded text-xs"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const newQuantity = parseInt((e.target as HTMLInputElement).value) || 1;
                                        handleQuantityChange(person.id, item.id, newQuantity);
                                      } else if (e.key === 'Escape') {
                                        setEditingQuantity(prev => {
                                          const newState = { ...prev };
                                          delete newState[key];
                                          return newState;
                                        });
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const newQuantity = parseInt(e.target.value) || 1;
                                      handleQuantityChange(person.id, item.id, newQuantity);
                                    }}
                                    autoFocus
                                  />
                                  <span className="text-xs text-gray-500">/ {itemQuantity}</span>
                                </div>
                              ) : (
                                <button
                                  className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700 hover:bg-gray-300"
                                  onClick={() => setEditingQuantity(prev => ({ ...prev, [key]: true }))}
                                >
                                  {quantity}
                                </button>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {sharingPeople.length > 1 && (
                        <button
                          className="px-3 py-1 rounded-lg text-sm font-medium bg-red-200 text-red-800 cursor-pointer hover:bg-red-300 transition-colors leading-tight text-center"
                          onClick={() => {
                            sharingPeople.forEach(person => {
                              updateShare(person.id, item.id, false);
                            });
                          }}
                        >
                          <span>Remove</span>
                          <span className="sm:hidden"><br /></span>
                          <span>&nbsp;All</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {sharingPeople.length > 0 && (
                    <div className="text-sm text-gray-500 mt-2 text-right">
                      {item.equalSplit ? (
                        sharingPeople.length > 1 &&
                        <span>
                          {formatCurrency(parseFloat(item.price) / sharingPeople.length, locale, currency)} each
                        </span>
                      ) : (
                        <span>
                          {formatCurrency(parseFloat(item.price), locale, currency)} per item
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}