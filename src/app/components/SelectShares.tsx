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

  const handleAddPerson = (personId: number, itemId: number, itemQuantity: number, equalSplit: boolean) => {
    const currentShares = shares[personId] || [];
    const existingShare = currentShares.find(s => s.itemId === itemId);
    
    if (existingShare?.share) {
      // Person is already sharing, remove them
      updateShare(personId, itemId, false);
      return;
    }

    // Check if any existing sharers have custom quantities (not equal share)
    const sharingPeople = people.filter(person => {
      const personShares = shares[person.id] || [];
      const itemShare = personShares.find(s => s.itemId === itemId);
      return itemShare?.share || false;
    });

    // Check if any existing sharers have quantities > 1 (custom quantities)
    const hasCustomQuantities = sharingPeople.some(person => {
      const personShares = shares[person.id] || [];
      const itemShare = personShares.find(s => s.itemId === itemId);
      return itemShare?.quantity && itemShare.quantity > 1;
    });

    if (equalSplit) {
      // Force equal split - add person with equal share
      updateShare(personId, itemId, true, 1);
    } else if (hasCustomQuantities) {
      // If there are custom quantities, add new person with quantity input
      setEditingQuantity(prev => ({ ...prev, [`${itemId}-${personId}`]: true }));
    } else {
      // All equal shares (quantity 1 or undefined), add the person with quantity 1
      updateShare(personId, itemId, true, 1);
    }
  };

  const handleQuantityChange = (personId: number, itemId: number, newQuantity: number, itemQuantity: number) => {
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

  const hasQuantityOverflow = (itemId: number, itemQuantity: number, equalSplit: boolean) => {
    if (equalSplit) {
      // For equal split items, no overflow (multiple people can share equally)
      return false;
    }

    const sharingPeople = people.filter(person => {
      const personShares = shares[person.id] || [];
      const itemShare = personShares.find(s => s.itemId === itemId);
      return itemShare?.share || false;
    });

    // Check if any people have custom quantities (not equal share)
    const hasCustomQuantities = sharingPeople.some(person => {
      const personShares = shares[person.id] || [];
      const itemShare = personShares.find(s => s.itemId === itemId);
      // Custom quantity means they have a quantity > 1
      return itemShare?.quantity && itemShare.quantity > 1;
    });

    if (hasCustomQuantities) {
      // Only check overflow for custom quantities
      return getTotalAllocatedQuantity(itemId) > itemQuantity;
    } else {
      // For equal shares, no overflow (multiple people can share equally)
      return false;
    }
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
          
          const allocatedQuantity = getTotalAllocatedQuantity(item.id);
          const quantityMismatch = allocatedQuantity !== itemQuantity;
          
          return (
            <div key={item.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">
                      {item.name} ({formatCurrency(parseFloat(item.price), locale, currency)}) 
                      <span className="text-gray-600 font-normal ml-2">× {item.quantity}</span>
                    </h3>
                    
                    <button
                      onClick={() => updateEqualSplit?.(item.id, !item.equalSplit)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors w-40 text-center select-none ${
                        item.equalSplit
                        ? 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200'
                        : 'bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200'
                      }`}
                    >
                      {item.equalSplit ? 'Equal Split' : 'Split Separately'}
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex flex-wrap gap-2">
                      {people.filter(person => {
                        const personShares = shares[person.id] || [];
                        const itemShare = personShares.find(s => s.itemId === item.id);
                        return !itemShare?.share; 
                      }).map(person => (
                        <span
                          key={person.id}
                          className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-500 transition-colors cursor-pointer hover:bg-gray-300"
                          onClick={() => handleAddPerson(person.id, item.id, itemQuantity, item.equalSplit || false)}
                        >
                          {person.name}
                        </span>
                      ))}
                    </div>
                    
                    <div className="ml-4">
                      {sharingPeople.length < people.length && (
                        <span
                          className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500 text-white cursor-pointer hover:bg-blue-600 transition-colors"
                          onClick={() => {
                            people.forEach(person => {
                              const personShares = shares[person.id] || [];
                              const itemShare = personShares.find(s => s.itemId === item.id);
                              if (!itemShare?.share) {
                                handleAddPerson(person.id, item.id, itemQuantity, item.equalSplit || false);
                              }
                            });
                          }}
                        >
                          Add All
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Active chips for sharing people */}
              {sharingPeople.length > 0 && (
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Sharing this item:</p>
                    {!(item.equalSplit) && (
                      <p className={`text-sm font-medium ${quantityMismatch ? 'text-red-500' : 'text-green-500'}`}>
                        Allocated: {allocatedQuantity} / {itemQuantity}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-wrap gap-2 flex-1">
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
                                        handleQuantityChange(person.id, item.id, newQuantity, itemQuantity);
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
                                      handleQuantityChange(person.id, item.id, newQuantity, itemQuantity);
                                    }}
                                    autoFocus
                                  />
                                  <span className="text-xs text-gray-500">/ {itemQuantity}</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setEditingQuantity(prev => ({ ...prev, [key]: true }))}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                                >
                                  {quantity}
                                </button>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <span
                      className="ml-4 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200 cursor-pointer hover:bg-red-200 transition-colors"
                      onClick={() => {
                        sharingPeople.forEach(person => {
                          updateShare(person.id, item.id, false);
                        });
                      }}
                    >
                      Remove All
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}