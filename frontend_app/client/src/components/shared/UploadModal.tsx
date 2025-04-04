import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [dataType, setDataType] = useState<'containers' | 'items'>('containers');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a CSV file',
          variant: 'destructive',
        });
      }
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a CSV file',
          variant: 'destructive',
        });
      }
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a CSV file to upload',
        variant: 'destructive',
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const endpoint = dataType === 'containers' 
        ? '/api/placements/upload-containers' 
        : '/api/placements/upload-items';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Invalidate relevant queries
      if (dataType === 'containers') {
        queryClient.invalidateQueries({ queryKey: ['/api/placements/containers'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/placements/items'] });
      }
      
      toast({
        title: 'Upload successful',
        description: `Successfully uploaded ${result.count} ${dataType}`,
      });
      
      // Close the modal and reset state
      onClose();
      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your file',
        variant: 'destructive',
      });
    }
  };
  
  const downloadTemplate = () => {
    const templates = {
      containers: 'containerId,zone,width,depth,height\nCONT-A,Crew Quarters,100,85,200\nCONT-B,Airlock,50,85,200',
      items: 'itemId,name,containerId,expiryDate,usageLimit,mass,width,depth,height\n001,Food Packet,CONT-A,2024-03-01,5,5,10,10,20\n002,Oxygen Cylinder,CONT-B,2025-06-01,2,15,15,15,50'
    };
    
    const blob = new Blob([templates[dataType]], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${dataType}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#1E3D59]">Upload Inventory Data</DialogTitle>
          <DialogDescription>
            Upload CSV files containing container or item data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mb-4">
          <RadioGroup 
            defaultValue="containers" 
            value={dataType} 
            onValueChange={(value) => setDataType(value as 'containers' | 'items')}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="containers" id="containers" />
              <Label htmlFor="containers">Containers</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="items" id="items" />
              <Label htmlFor="items">Items</Label>
            </div>
          </RadioGroup>
        </div>
        
        <div 
          className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer ${
            isDragging ? 'border-[#1E3D59] bg-[#1E3D59]/5' : 'border-gray-300 hover:bg-gray-50'
          } mb-4`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            id="file-upload"
            onChange={handleFileChange}
          />
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-medium text-[#1E3D59]">Click to upload</span> or drag and drop
          </p>
          <p className="mt-1 text-xs text-gray-500">
            CSV files only
          </p>
          {file && (
            <p className="mt-2 text-sm text-[#4CAF50] font-medium">
              Selected: {file.name}
            </p>
          )}
        </div>
        
        <div className="text-sm bg-gray-50 p-3 rounded-md mb-4 font-['Roboto_Mono']">
          <div className="flex justify-between items-center">
            <span>template_{dataType}.csv</span>
            <Button 
              variant="link" 
              className="text-[#1E3D59] p-0 h-auto"
              onClick={downloadTemplate}
            >
              Download Template
            </Button>
          </div>
        </div>
        
        <DialogFooter className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            className="bg-[#1E3D59] hover:bg-[#17304a]"
            disabled={!file}
          >
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
