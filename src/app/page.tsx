'use client';
import { useState, useEffect, useRef } from 'react';
import BillItems from './components/BillItems';
import ExtraCharges from './components/ExtraCharges';
import BillSummary from './components/BillSummary';
import CurrencySelector from './components/CurrencySelector';
import SelectShares from './components/SelectShares';
import { BillItem, ExtraCharge, Person, Shares } from './types';
import { getBrowserCurrency, formatCurrency } from './utils/currency';
import { MdClose, MdAdd } from 'react-icons/md';
import React from 'react';
import Input from './components/Input';
import html2canvas from 'html2canvas-pro';

export default function BillSplitter() {
  const [billName, setBillName] = useState('');
  const [billItems, setBillItems] = useState<BillItem[]>([{ id: 1, name: '', price: '', quantity: '1', equalSplit: true }]);
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [shares, setShares] = useState<Shares>({});
  const [step, setStep] = useState(1);
  const [currencyInfo, setCurrencyInfo] = useState({ locale: 'en-US', currency: 'USD' });

  const billRef = useRef<HTMLDivElement>(null);
  const personInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const fetchCurrencyInfo = async () => {
      const info = await getBrowserCurrency();
      setCurrencyInfo(info);
    };
    fetchCurrencyInfo();
  }, []);

  useEffect(() => {
    const lastInput = personInputsRef.current[personInputsRef.current.length - 1];
    if (lastInput) {
      lastInput.focus();
    }
  }, [people.length]);

  const handleCurrencyChange = (currency: string, locale: string) => {
    setCurrencyInfo({ currency, locale });
  };

  const subtotal = billItems.reduce((sum, item) => 
    sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0);

  const total = extraCharges.reduce((sum, charge) => {
    if (charge.name.trim() && !isNaN(parseFloat(charge.value)) && charge.value !== '0') {
      if (charge.type === 'percentage') {
        return sum + (subtotal * (parseFloat(charge.value) / 100));
      } else {
        return sum + parseFloat(charge.value);
      }
    }
    return sum;
  }, subtotal);

  const addBillItem = () => {
    setBillItems([...billItems, { id: Date.now(), name: '', price: '', quantity: '1', equalSplit: true }]);
  };

  const updateBillItem = (id: number, field: keyof BillItem, value: string) => {
    setBillItems(billItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeBillItem = (id: number) => {
    if (billItems.length > 1) {
      setBillItems(billItems.filter(item => item.id !== id));
    }
  };

  const addExtraCharge = () => {
    setExtraCharges([...extraCharges, { 
      id: Date.now(), 
      name: '', 
      value: '0', 
      type: 'amount',
      calculatedValue: '0' 
    }]);
  };

  const updateExtraCharge = (id: number, field: keyof ExtraCharge, value: string | 'amount' | 'percentage') => {
    setExtraCharges(extraCharges.map(charge => {
      if (charge.id === id) {
        const updatedCharge = { ...charge, [field]: value };
        
        if (field === 'value' || field === 'type') {
          if (updatedCharge.value === '') {
            updatedCharge.calculatedValue = '0';
          } else if (updatedCharge.type === 'percentage') {
            const amount = subtotal * (parseFloat(updatedCharge.value) / 100);
            updatedCharge.calculatedValue = amount.toFixed(2);
          } else {
            const amount = parseFloat(updatedCharge.value);
            updatedCharge.calculatedValue = amount.toFixed(2);
          }
        }
        
        return updatedCharge;
      }
      return charge;
    }));
  };

  // Recalculate extra charges when subtotal changes
  useEffect(() => {
    setExtraCharges(extraCharges.map(charge => {
      if (charge.value !== '') {
        if (charge.type === 'percentage') {
          const amount = subtotal * (parseFloat(charge.value) / 100);
          return {
            ...charge,
            calculatedValue: amount.toFixed(2)
          };
        } else {
          const amount = parseFloat(charge.value);
          return {
            ...charge,
            calculatedValue: amount.toFixed(2)
          };
        }
      }
      return charge;
    }));
  }, [subtotal, extraCharges]);

  const removeExtraCharge = (id: number) => {
    setExtraCharges(extraCharges.filter(charge => charge.id !== id));
  };

  const addPerson = () => {
    const newId = Date.now();
    setPeople([...people, { id: newId, name: '' }]);
    
    const newShares = { ...shares };
    newShares[newId] = billItems.map(item => ({ itemId: item.id, share: false }));
    setShares(newShares);
  };

  const updatePerson = (id: number, name: string) => {
    setPeople(people.map(person => 
      person.id === id ? { ...person, name } : person
    ));
  };

  const removePerson = (id: number) => {
    if (people.length > 1) {
      setPeople(people.filter(person => person.id !== id));
      
      const newShares = { ...shares };
      delete newShares[id];
      setShares(newShares);
    }
  };

  const updateShare = (personId: number, itemId: number, share: boolean, quantity?: number) => {
    const newShares = { ...shares };
    const itemIndex = newShares[personId].findIndex(s => s.itemId === itemId);
    
    if (itemIndex !== -1) {
      if (people.length === 1) {
        newShares[personId][itemIndex].share = true;
        newShares[personId][itemIndex].quantity = quantity;
      } else {
        newShares[personId][itemIndex].share = share;
        newShares[personId][itemIndex].quantity = quantity;
      }
      setShares(newShares);
    }
  };

  const updateEqualSplit = (itemId: number, equalSplit: boolean) => {
    setBillItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, equalSplit } : item
    ));
  };

  const calculatePersonTotals = () => {
    const personTotals: { [key: number]: number } = {};
    
    // Step 1: Calculate each person's subtotal from bill items
    const personSubtotals: { [key: number]: number } = {};
    people.forEach(person => {
      personSubtotals[person.id] = 0;
    });

    billItems.forEach(item => {
      const totalItemCost = parseFloat(item.price) * parseInt(item.quantity);
      const sharers = people.filter(p => shares[p.id]?.find(s => s.itemId === item.id)?.share);
      
      if (sharers.length > 0) {
        if (item.equalSplit) {
          const costPerSharer = totalItemCost / sharers.length;
          sharers.forEach(sharer => {
            personSubtotals[sharer.id] += costPerSharer;
          });
        } else { // Split by quantity
          const totalSharedQuantity = sharers.reduce((sum, sharer) => {
            const s = shares[sharer.id]?.find(s => s.itemId === item.id);
            return sum + (s?.quantity || 1); 
          }, 0);
          
          if (totalSharedQuantity > 0) {
            const costPerUnitOfQuantity = totalItemCost / totalSharedQuantity;
            sharers.forEach(sharer => {
              const personShare = shares[sharer.id]?.find(s => s.itemId === item.id);
              const personQuantity = personShare?.quantity || 1;
              personSubtotals[sharer.id] += costPerUnitOfQuantity * personQuantity;
            });
          }
        }
      }
    });

    // Step 2: Calculate extra charges based on each person's subtotal
    people.forEach(person => {
      const personItemTotal = personSubtotals[person.id];
      
      const personExtraTotal = extraCharges.reduce((sum, charge) => {
        if (charge.type === 'percentage') {
          return sum + (personItemTotal * (parseFloat(charge.value) / 100));
        } else { // 'amount'
          if (subtotal > 0) {
              return sum + (parseFloat(charge.value) * (personItemTotal / subtotal));
          }
          return sum;
        }
      }, 0);

      personTotals[person.id] = personItemTotal + personExtraTotal;
    });
    
    return personTotals;
  };

  const handleDownloadImage = async () => {
    const element = billRef.current;
    if (!element) return;

    // To ensure the downloaded image has a dynamic width based on content and no truncated text,
    // we clone the element, style it to be rendered off-screen with an appropriate width,
    // and remove any text-truncating classes before passing it to html2canvas.
    const clone = element.cloneNode(true) as HTMLElement;

    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0px';
    clone.style.width = 'fit-content';
    clone.style.minWidth = '600px';

    clone.querySelectorAll('.truncate').forEach(el => {
        el.classList.remove('truncate');
    });

    document.body.appendChild(clone);

    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: '#ffffff',
      ignoreElements: (el) => el.classList.contains('hide-from-image'),
    });
    
    document.body.removeChild(clone);

    const data = canvas.toDataURL('image/png');
    const link = document.createElement('a');

    link.href = data;
    link.download = billName ? `${billName.replace(/\s+/g, '-')}.png` : 'bill-receipt.png';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  let isStep4Valid = true;
  let step4Tooltip = '';

  if (step === 4) {
    const itemsWithoutSharers = billItems.some(item => {
      const sharers = people.filter(p => shares[p.id]?.find(s => s.itemId === item.id)?.share);
      return sharers.length === 0;
    });

    const itemsWithMismatch = billItems.some(item => {
      if (item.equalSplit) return false;
      const sharers = people.filter(p => shares[p.id]?.find(s => s.itemId === item.id)?.share);
      const allocatedQuantity = sharers.reduce((sum, sharer) => {
        const shareInfo = shares[sharer.id]?.find(s => s.itemId === item.id);
        return sum + (shareInfo?.quantity || 1);
      }, 0);
      return allocatedQuantity !== parseInt(item.quantity);
    });

    if (itemsWithoutSharers) {
      isStep4Valid = false;
      step4Tooltip = 'All items must have at least one person sharing.';
    } else if (itemsWithMismatch) {
      isStep4Valid = false;
      step4Tooltip = 'Quantities for all "Split Separately" items must be fully allocated.';
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-red-500 text-3xl font-bold">Bill Splittr</h1>
        <div className="w-40">
          <CurrencySelector 
            selectedCurrency={currencyInfo.currency}
            onCurrencyChange={handleCurrencyChange}
          />
        </div>
      </div>
      
      {step === 1 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 1: Add Bill Items</h2>
          <div className="mb-4">
            <Input
              value={billName}
              onChange={(value) => setBillName(value)}
              label="Bill Name (Optional)"
              placeholder=" "
            />
          </div>
          <div className="space-y-3">
            {billItems.map(item => (
              <BillItems
                key={item.id}
                item={item}
                onUpdate={updateBillItem}
                onRemove={removeBillItem}
              />
            ))}
          </div>
          <div className="flex justify-center mt-4">
            <button 
              onClick={addBillItem}
              className="add-button"
              title="Add Item"
            >
              <MdAdd />
            </button>
          </div>
          <BillSummary 
            subtotal={subtotal} 
            total={subtotal}
            locale={currencyInfo.locale}
            currency={currencyInfo.currency}
          />
        </div>
      )}
      
      {step === 2 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 2: Add Extra Charges</h2>
          
          {/* Bill Items Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Bill Items:</h3>
            <div className="grid grid-cols-[minmax(200px,1fr)_80px_100px_100px] gap-4">
              {/* Header Row */}
              <span className="font-medium text-gray-500 text-sm">Item</span>
              <span className="font-medium text-gray-500 text-sm text-right">Quantity</span>
              <span className="font-medium text-gray-500 text-sm text-right">Rate</span>
              <span className="font-medium text-gray-500 text-sm text-right">Price</span>
              
              {/* Data Rows */}
              {billItems.map(item => (
                <React.Fragment key={item.id}>
                  <span className="font-medium truncate">{item.name}</span>
                  <span className="text-right">x{item.quantity}</span>
                  <span className="text-right">{formatCurrency(parseFloat(item.price), currencyInfo.locale, currencyInfo.currency)}</span>
                  <span className="text-right">{formatCurrency(parseFloat(item.price) * parseInt(item.quantity), currencyInfo.locale, currencyInfo.currency)}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Extra Charges Section */}
          <div className="mt-6 border-t pt-4 mb-6">
            <h3 className="text-lg font-semibold mb-3">Extra Charges:</h3>
            <div className="space-y-3 mb-4">
              {extraCharges.map(charge => (
                <ExtraCharges
                  key={charge.id}
                  charge={charge}
                  onUpdate={updateExtraCharge}
                  onRemove={removeExtraCharge}
                  locale={currencyInfo.locale}
                  currency={currencyInfo.currency}
                />
              ))}
            </div>
            <div className="flex justify-center">
              <button 
                onClick={addExtraCharge}
                className="add-button"
                title="Add Extra Charge"
              >
                <MdAdd />
              </button>
            </div>
          </div>

          {/* Total Section */}
          <div className="pt-4">
            <BillSummary 
              subtotal={subtotal} 
              extraCharges={extraCharges} 
              total={total}
              showDetails={true}
              locale={currencyInfo.locale}
              currency={currencyInfo.currency}
            />
          </div>
        </div>
      )}
      
      {step === 3 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 3: Add People</h2>
          <div className="space-y-3">
            {people.map((person, index) => (
              <div key={person.id} className="flex items-center gap-4">
                <Input
                  ref={(el) => {
                    if (el) personInputsRef.current[index] = el;
                  }}
                  type="text"
                  value={person.name}
                  onChange={(value) => updatePerson(person.id, value)}
                  placeholder="Enter person's name"
                  label="Person's Name"
                  hideLabel={true}
                  className="flex-grow"
                />
                <button 
                  onClick={() => removePerson(person.id)}
                  className="remove-button"
                  title="Remove"
                >
                  <MdClose />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-4">
            <button 
              onClick={addPerson}
              className="add-button"
              title="Add Person"
            >
              <MdAdd />
            </button>
          </div>
        </div>
      )}
      
      {step === 4 && (
        <SelectShares
          billItems={billItems}
          people={people}
          shares={shares}
          updateShare={updateShare}
          updateEqualSplit={updateEqualSplit}
          locale={currencyInfo.locale}
          currency={currencyInfo.currency}
        />
      )}
      
      {step === 5 && (
        <div ref={billRef} className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold hide-from-image">
              {billName ? 'Results:' : 'Step 5: Results'}
            </h2>
            {billName && (
              <p className="text-xl font-bold text-gray-800 mt-5">{billName}</p>
            )}
          </div>
          
          {/* Bill Items Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Bill Items:</h3>
            <div className="grid grid-cols-[minmax(200px,1fr)_80px_100px_100px] gap-4">
              {/* Header Row */}
              <span className="font-medium text-gray-500 text-sm">Item</span>
              <span className="font-medium text-gray-500 text-sm text-right">Quantity</span>
              <span className="font-medium text-gray-500 text-sm text-right">Rate</span>
              <span className="font-medium text-gray-500 text-sm text-right">Price</span>
              
              {/* Data Rows */}
              {billItems.map(item => (
                <React.Fragment key={item.id}>
                  <span className="font-medium truncate">{item.name}</span>
                  <span className="text-right">x{item.quantity}</span>
                  <span className="text-right">{formatCurrency(parseFloat(item.price), currencyInfo.locale, currencyInfo.currency)}</span>
                  <span className="text-right">{formatCurrency(parseFloat(item.price) * parseInt(item.quantity), currencyInfo.locale, currencyInfo.currency)}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Extra Charges Section */}
          {extraCharges.length > 0 && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold mb-3">Extra Charges:</h3>
              <div className="grid grid-cols-[1fr_auto_auto] gap-4">
                {/* Header Row */}
                <span className="font-medium text-gray-500 text-sm">Charge</span>
                <span className="font-medium text-gray-500 text-sm text-right">% of Subtotal</span>
                <span className="font-medium text-gray-500 text-sm text-right">Amount</span>
                
                {/* Data Rows */}
                {extraCharges.map(charge => {
                  const actualAmount = charge.type === 'percentage' 
                    ? subtotal * (parseFloat(charge.value) / 100)
                    : parseFloat(charge.value);
                  const percentage = (actualAmount / subtotal * 100).toFixed(2);
                  return (
                    <React.Fragment key={charge.id}>
                      <span className="font-medium">{charge.name}</span>
                      <span className="text-gray-500 text-right">{percentage}%</span>
                      <span className="text-right">{formatCurrency(actualAmount, currencyInfo.locale, currencyInfo.currency)}</span>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bill Summary */}
          <div className="mb-6">
            <BillSummary 
              subtotal={subtotal} 
              extraCharges={extraCharges} 
              total={total} 
              showDetails={true}
              locale={currencyInfo.locale}
              currency={currencyInfo.currency}
            />
          </div>

          {/* Amounts Owed Section */}
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-3">Amounts Owed:</h3>
            {extraCharges.length > 0 && (
              <p className="text-sm text-gray-500 -mt-2 mb-3">
                (includes pro-rated extra charges)
              </p>
            )}
            <div className="grid grid-cols-[1fr_auto_auto] gap-4">
              {/* Header Row */}
              <span className="font-medium text-gray-500 text-sm">Name</span>
              <span className="font-medium text-gray-500 text-sm text-right">% of Total</span>
              <span className="font-medium text-gray-500 text-sm text-right">Amount</span>
              
              {/* Data Rows */}
              {people.map((person) => {
                const personTotal = calculatePersonTotals()[person.id];
                const percentage = (personTotal / total * 100).toFixed(2);
                
                const personShares = shares[person.id]?.filter(s => s.share) || [];
                const shareDetails = personShares.map(share => {
                  const item = billItems.find(i => i.id === share.itemId);
                  if (!item) return null;

                  if (item.equalSplit) {
                    return item.name;
                  } else {
                    return `${item.name} x${share.quantity || 1}`;
                  }
                }).filter(Boolean).join(', ');

                return (
                  <React.Fragment key={person.id}>
                    <div>
                      <span className="font-bold">{person.name}</span>
                      {shareDetails && (
                        <p className="text-xs italic text-gray-500">({shareDetails})</p>
                      )}
                    </div>
                    <span className="text-gray-500 text-right">{percentage}%</span>
                    <span className="text-right">{formatCurrency(personTotal, currencyInfo.locale, currencyInfo.currency)}</span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mt-4">
        <div>
          {step === 5 && (
            <button 
              onClick={handleDownloadImage}
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
            >
              Download as Image
            </button>
          )}
        </div>

        <div className="flex justify-end gap-4">
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
            >
              Back
            </button>
          )}
          {step < 5 && (
            <div className="relative group">
              <button 
                onClick={() => setStep(step + 1)}
                disabled={step === 4 && !isStep4Valid}
                className={`text-white py-2 px-4 rounded ${
                  step === 4 && !isStep4Valid 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                Next
              </button>
              {step === 4 && !isStep4Valid && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max p-2 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  {step4Tooltip}
                </div>
              )}
            </div>
          )}
          {step === 5 && (
            <button 
              onClick={() => {
                setStep(1);
                setBillName('');
                setBillItems([{ id: 1, name: '', price: '', quantity: '1', equalSplit: true }]);
                setExtraCharges([]);
                setPeople([]);
                setShares({});
              }}
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
            >
              Start Over
            </button>
          )}
        </div>
      </div>
    </div>
  );
}