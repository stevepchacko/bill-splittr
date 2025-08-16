'use client';
import { useState, useRef } from 'react';
import { MdCameraAlt, MdUpload, MdEdit, MdKeyboardArrowRight } from 'react-icons/md';

interface BillPhotoUploadProps {
  onPhotoUpload: (file: File) => void;
  onManualEntry: () => void;
}

export default function BillPhotoUpload({ onPhotoUpload, onManualEntry }: BillPhotoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onPhotoUpload(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">
        Step 0: How would you like to add your bill?
      </h2>
  
      <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 md:items-stretch items-start">
        {/* Photo Upload Section */}
        <div className="space-y-4 flex flex-col">
          <h3 className="text-lg font-semibold mb-4">
            Upload Bill Photo (and parse with AI)
          </h3>
  
          <div className="flex-1 flex flex-col">
            {!previewUrl ? (
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors h-full flex flex-col justify-center ${
                  isDragOver
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <MdUpload className="text-3xl text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Drag and drop an image here, or click to browse
                    </p>
                    <p className="text-xs text-gray-500">
                      Supports: JPG, PNG, GIF, BMP, TIFF
                    </p>
                  </div>
  
                  <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex items-center gap-2 text-sm"
                    >
                      <MdUpload />
                      Browse Files
                    </button>
  
                    {isMobile() && (
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded flex items-center gap-2 text-sm"
                      >
                        <MdCameraAlt />
                        Take Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Bill preview"
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  <button
                    onClick={handleRemoveFile}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg"
                  >
                    <MdEdit />
                  </button>
                </div>
  
                <div className="text-sm text-gray-600">
                  <p>
                    <strong>File:</strong> {selectedFile?.name}
                  </p>
                  <p>
                    <strong>Size:</strong>{" "}
                    {selectedFile?.size
                      ? (selectedFile.size / 1024 / 1024).toFixed(2)
                      : "0"}{" "}
                    MB
                  </p>
                </div>
  
                <div className="flex justify-center">
                  <button
                    onClick={handleUpload}
                    className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded font-medium flex items-center gap-2 text-sm"
                  >
                    Process Photo
                    <MdKeyboardArrowRight />
                  </button>
                </div>
              </div>
            )}
          </div>
  
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
          />
        </div>
  
        {/* OR Divider */}
        <div className="flex items-center justify-center text-gray-500 font-medium text-sm">
          — OR —
        </div>
  
        {/* Manual Entry Section */}
        <div className="space-y-4 flex flex-col">
          <h3 className="text-lg font-semibold mb-4">Enter Manually</h3>
  
          <div className="bg-gray-50 rounded-lg p-6 text-center flex-1 flex flex-col justify-center">
            <div className="flex justify-center mb-3">
              <MdEdit className="text-3xl text-gray-400" />
            </div>
  
            <p className="text-sm text-gray-600 mb-4">
              Prefer to type in your bill details? Click below to start entering
              items manually.
            </p>
            <div className="flex justify-center">
              <button
                onClick={onManualEntry}
                className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded font-medium flex items-center gap-2 text-sm"
              >
                Start Manual Entry
                <MdKeyboardArrowRight />
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              <p>You can always go back and add a photo later</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );            
}
