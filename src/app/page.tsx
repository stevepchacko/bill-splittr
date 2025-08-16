'use client';
import { useState, useEffect, useRef } from 'react';
import BillItems from './components/BillItems';
import ExtraCharges from './components/ExtraCharges';
import BillSummary from './components/BillSummary';
import CurrencySelector from './components/CurrencySelector';
import SelectShares from './components/SelectShares';
import BillPhotoUpload from './components/BillPhotoUpload';
import { BillItem, ExtraCharge, Person, Shares } from './types';
import { getBrowserCurrency, formatCurrency } from './utils/currency';
import { processImageWithOCR } from './utils/ocr';
import { parseBillWithAI } from './utils/ai-parser';
import { MdClose, MdAdd } from 'react-icons/md';
import React from 'react';
import Input from './components/Input';
import html2canvas from 'html2canvas-pro';

export default function BillSplitter() {
  const [billName, setBillName] = useState('');
  const [billItems, setBillItems] = useState<BillItem[]>([{ id: 1, name: '', price: '', quantity: '1', equalSplit: true }]);
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [dataFromAI, setDataFromAI] = useState(false);
  const [shares, setShares] = useState<Shares>({});
  const [step, setStep] = useState(0);
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
    setExtraCharges(prevCharges => prevCharges.map(charge => {
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
  }, [subtotal]);

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

    if (people.length === 1) {
      const personId = people[0].id;
      const newShares = { ...shares };
      const itemShareIndex = newShares[personId]?.findIndex(s => s.itemId === itemId);
      
      if (itemShareIndex !== -1) {
        const billItem = billItems.find(i => i.id === itemId);
        if (billItem) {
          if (!equalSplit) {
            newShares[personId][itemShareIndex].quantity = parseInt(billItem.quantity);
          } else {
            newShares[personId][itemShareIndex].quantity = 1;
          }
          setShares(newShares);
        }
      }
    }
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

  const handlePhotoUpload = async (file: File) => {
    try {
      // Show loading state (you can add a loading spinner later)
      console.log('Processing image with OCR...');
      
      // Process the image with OCR
      const ocrResults = await processImageWithOCR(file);
      
      console.log('OCR Results:', ocrResults);
      console.log('OCR Results type:', typeof ocrResults);
      console.log('OCR Results length:', ocrResults?.length);
      
      if (!ocrResults || ocrResults.length === 0) {
        throw new Error('OCR returned no results');
      }
      
      // Parse the OCR results with AI
      console.log('Parsing OCR results with AI...');
      console.log('Sending to AI:', JSON.stringify(ocrResults));
      
      const parsedBillData = await parseBillWithAI(ocrResults);
      
      console.log('AI Parsed Bill Data:', parsedBillData);
      
      // Populate the bill data with AI results
      if (parsedBillData.items && parsedBillData.items.length > 0) {
        const populatedItems = parsedBillData.items.map(item => ({
          id: Date.now() + Math.random(), // Generate unique ID
          name: item.name || '',
          price: (parseFloat(item.price) || 0).toString(),
          quantity: (parseInt(item.quantity) || 1).toString(),
          equalSplit: true
        }));
        setBillItems(populatedItems);
      }
      
      if (parsedBillData.extraCharges && parsedBillData.extraCharges.length > 0) {
        const populatedCharges = parsedBillData.extraCharges.map(charge => ({
          id: Date.now() + Math.random(), // Generate unique ID
          name: charge.name || '',
          value: (parseFloat(charge.value) || 0).toString(),
          type: charge.type || 'amount',
          calculatedValue: charge.type === 'percentage' ? '0' : (parseFloat(charge.value) || 0).toString()
        }));
        setExtraCharges(populatedCharges);
      }
      
      // Set flag that data came from AI
      setDataFromAI(true);
      
      // Show success message
      alert(`AI parsing completed!\n\nBill Name: ${parsedBillData.billName || 'Not found'}\nItems: ${parsedBillData.items.length}\nExtra Charges: ${parsedBillData.extraCharges.length}\n\nAll items and charges have been populated for your review. You can now edit any amounts, names, or quantities.`);
      
      setStep(1);
    } catch (error) {
      console.error('Processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('OCR data could not be read clearly')) {
        alert('The receipt image could not be read clearly. Please try taking a clearer photo or use manual entry instead.');
        setStep(1); // Still proceed to step 1 with empty data
      } else {
        alert(`Processing failed: ${errorMessage}\n\nPlease try again or use manual entry.`);
      }
    }
  };

  const handleManualEntry = () => {
    setStep(1);
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
      
      {step === 0 && (
        <BillPhotoUpload
          onPhotoUpload={handlePhotoUpload}
          onManualEntry={handleManualEntry}
        />
      )}
      
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
          {dataFromAI && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">
                  AI-Parsed Data: Review and edit the items below. All fields are editable.
                </span>
              </div>
            </div>
          )}
          
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
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Step 2: Add Extra Charges</h2>
          
          {/* Bill Items Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Bill Items:</h3>
            
            {/* Desktop Header */}
            <div className="hidden sm:grid grid-cols-4 gap-4 mb-2 font-semibold text-sm text-gray-500">
              <span className="col-span-1">Item</span>
              <span className="text-center">Quantity</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Price</span>
            </div>

            {/* Items List */}
            {billItems.map(item => (
              <div key={item.id} className="sm:grid sm:grid-cols-4 sm:gap-4 py-2 border-b last:border-b-0">
                {/* Mobile View */}
                <div className="sm:hidden">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold break-words w-3/4">{item.name}</span>
                    <span className="text-right whitespace-nowrap">x{item.quantity}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                    <span>
                      Rate: {formatCurrency(parseFloat(item.price) || 0, currencyInfo.locale, currencyInfo.currency)}
                    </span>
                    <span className="font-medium">
                      Price: {formatCurrency((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), currencyInfo.locale, currencyInfo.currency)}
                    </span>
                  </div>
                </div>

                {/* Desktop View */}
                <div className="hidden sm:contents">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-center">x{item.quantity}</span>
                  <span className="text-right">{formatCurrency(parseFloat(item.price), currencyInfo.locale, currencyInfo.currency)}</span>
                  <span className="text-right">{formatCurrency(parseFloat(item.price) * parseInt(item.quantity), currencyInfo.locale, currencyInfo.currency)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Extra Charges Section */}
          <div className="mt-6 border-t pt-4">
            {dataFromAI && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">
                    AI-Parsed Extra Charges: Review and edit the charges below. All fields are editable.
                  </span>
                </div>
              </div>
            )}
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
                className="add-button px-4 flex items-center gap-2"
              >
                <MdAdd className="flex-shrink-0" />
                <span>Add Charge</span>
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
        <div ref={billRef} className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full text-black">
          <div className="mb-4">
            <h2 className="text-xl font-semibold hide-from-image">
              {billName ? 'Results:' : 'Step 5: Results'}
            </h2>
            {billName && (
              <p className="text-xl font-bold text-gray-800 mt-5">{billName}</p>
            )}
          </div>
          
          {/* Bill Items Section */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold border-b pb-2 mb-4">Bill Items:</h3>
            
            {/* Desktop Header */}
            <div className="hidden sm:grid grid-cols-4 gap-4 mb-2 font-semibold">
              <span className="col-span-1">Item</span>
              <span className="text-center">Quantity</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Price</span>
            </div>

            {/* Items List */}
            {billItems.map(item => (
              <div key={item.id} className="sm:grid sm:grid-cols-4 sm:gap-4 py-2 border-b last:border-b-0">
                {/* Mobile View */}
                <div className="sm:hidden">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold break-words w-3/4">{item.name}</span>
                    <span className="text-right whitespace-nowrap">x{item.quantity}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                    <span>
                      Rate: {formatCurrency(parseFloat(item.price) || 0, currencyInfo.locale, currencyInfo.currency)}
                    </span>
                    <span className="font-medium">
                      Price: {formatCurrency((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), currencyInfo.locale, currencyInfo.currency)}
                    </span>
                  </div>
                </div>

                {/* Desktop View */}
                <div className="hidden sm:contents">
                  <span className="break-words">{item.name}</span>
                  <span className="text-center">x{item.quantity}</span>
                  <span className="text-right">{formatCurrency(parseFloat(item.price), currencyInfo.locale, currencyInfo.currency)}</span>
                  <span className="text-right">{formatCurrency(parseFloat(item.price) * parseInt(item.quantity), currencyInfo.locale, currencyInfo.currency)}</span>
                </div>
              </div>
            ))}
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

      <div className="mt-4">
        {step === 5 ? (
          <div className="space-y-2 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
            <div className="w-full sm:w-auto">
              <button
                onClick={handleDownloadImage}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
              >
                Download as Image
              </button>
            </div>
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={() => setStep(step - 1)}
                className="w-1/2 sm:w-auto bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
              >
                Back
              </button>
              <button
                onClick={() => {
                  setStep(0);
                  setBillName('');
                  setBillItems([{ id: 1, name: '', price: '', quantity: '1', equalSplit: true }]);
                  setExtraCharges([]);
                  setPeople([]);
                  setShares({});
                  setDataFromAI(false);
                }}
                className="w-1/2 sm:w-auto bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
              >
                Start Over
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between gap-4">
            {step > 0 && (
              <button
                onClick={() => setStep(step === 1 ? 0 : step - 1)}
                className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
              >
                Back
              </button>
            )}
            {step > 0 && step < 5 && (
              <div className="relative group">
                <button 
                  onClick={() => setStep(step + 1)}
                  disabled={step === 4 && !isStep4Valid}
                  className={`py-2 px-4 rounded ${
                    step === 4 && !isStep4Valid 
                      ? 'bg-green-200 text-green-500 cursor-not-allowed' 
                      : 'bg-green-500 text-white hover:bg-green-600'
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
          </div>
        )}
      </div>
    </div>
  );
}