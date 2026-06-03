import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Lead } from "@/types/Lead";

interface CSVImporterProps {
  onImport: (leads: Lead[]) => void;
  existingLeads: Lead[];
}

const CSVImporter: React.FC<CSVImporterProps> = ({ onImport, existingLeads }) => {
  const [csvData, setCsvData] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const parseCSV = (csv: string): Lead[] => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) {
      toast.error('CSV must have at least a header row and one data row');
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const leads: Lead[] = [];
    let duplicateCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, '')); // Remove quotes
      
      if (values.length !== headers.length) {
        console.warn(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`);
        continue;
      }

      const name = getValue(headers, values, ['name', 'customer', 'contact', 'point of contact']);
      const email = getValue(headers, values, ['email', 'e-mail', 'mail']);
      const phone = getValue(headers, values, ['phone', 'telephone', 'mobile']);
      const company = getValue(headers, values, ['company', 'business', 'organization', 'company name']);

      // Check for duplicates - match by name/email combination or name/phone combination
      const isDuplicate = existingLeads.some(existing => 
        (name && existing.name?.toLowerCase() === name.toLowerCase()) &&
        (
          (email && existing.email?.toLowerCase() === email.toLowerCase()) ||
          (phone && existing.phone === phone) ||
          (company && existing.company?.toLowerCase() === company.toLowerCase())
        )
      );

      if (isDuplicate) {
        duplicateCount++;
        console.warn(`Skipping duplicate lead: ${name} (${email || phone})`);
        continue;
      }

      const palletNeedsValue = getValue(headers, values, ['pallet needs', 'pallets', 'service', 'type']);
      const serviceTypeValue = getValue(headers, values, ['service type', 'type', 'delivery', 'pickup']) || palletNeedsValue;

      const lead: Lead = {
        id: crypto.randomUUID(),
        name,
        phone,
        email,
        company,
        palletNeeds: palletNeedsValue,
        serviceType: getServiceType(serviceTypeValue, palletNeedsValue),
        forklifitAccess: getBooleanValue(getValue(headers, values, ['forklift', 'forklift access', 'access'])),
        currentCustomer: getBooleanValue(getValue(headers, values, ['current customer', 'existing customer', 'customer'])),
        date: new Date().toISOString().split('T')[0], // Today's date when imported
        submittedDate: getValue(headers, values, ['date', 'created', 'submitted', 'submitted date']) || null,
        status: 'New',
        notes: getValue(headers, values, ['notes', 'comments', 'remarks']),
        tags: [],
        lastContact: null,
        followUpDate: null
      };

      leads.push(lead);
    }

    if (duplicateCount > 0) {
      toast.info(`Skipped ${duplicateCount} duplicate leads`);
    }

    return leads;
  };

  const getValue = (headers: string[], values: string[], possibleNames: string[]): string => {
    for (const name of possibleNames) {
      const index = headers.findIndex(h => h.includes(name));
      if (index !== -1 && values[index]) {
        return values[index];
      }
    }
    return '';
  };

  const getBooleanValue = (value: string): boolean => {
    if (!value) return false;
    // Remove quotes and normalize the value
    const cleanValue = value.replace(/['"]/g, '').trim().toLowerCase();
    return cleanValue === 'true' || cleanValue === 'yes' || cleanValue === '1' || cleanValue === 'y';
  };

  const getServiceType = (serviceTypeValue: string, palletNeedsValue: string = ''): 'delivery' | 'pickup' | 'both' => {
    const combinedValue = `${serviceTypeValue} ${palletNeedsValue}`.toLowerCase();
    
    // Check for "Pallet Removal" or variations
    if (combinedValue.includes('pallet removal') || 
        combinedValue.includes('removal') ||
        combinedValue.includes('pickup') || 
        combinedValue.includes('pallet pickup') ||
        combinedValue.includes('pallet pickups') ||
        combinedValue.includes('collection') || 
        combinedValue.includes('remove') ||
        combinedValue.includes('take away') ||
        combinedValue.includes('takeaway')) {
      return 'pickup';
    }
    
    // Check for "both" scenarios
    if (combinedValue.includes('both') || 
        (combinedValue.includes('delivery') && (combinedValue.includes('pickup') || combinedValue.includes('removal')))) {
      return 'both';
    }
    
    return 'delivery'; // default
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvData(content);
      toast.success('CSV file loaded successfully');
    };

    reader.onerror = () => {
      toast.error('Error reading file');
    };

    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!csvData.trim()) {
      toast.error('Please paste CSV data or upload a CSV file');
      return;
    }

    try {
      const leads = parseCSV(csvData);
      if (leads.length > 0) {
        onImport(leads);
        setCsvData('');
        setIsOpen(false);
      }
    } catch (error) {
      toast.error('Error parsing CSV data. Please check the format.');
      console.error('CSV parsing error:', error);
    }
  };

  const sampleCSV = `Name,Phone,Email,Company,Pallet Needs,Service Type,Forklift Access,Current Customer,Date,Notes
John Smith,555-0123,john@acme.com,Acme Corp,Wood Pallets,Delivery,Yes,No,2024-01-15,New warehouse opening
Sarah Davis,555-0456,sarah@logistics.com,Metro Logistics,Plastic Pallets,Pickup,No,Yes,2024-01-18,Hand loading required`;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="mt-1"
            />
          </div>

          <div className="text-center text-gray-500">
            <span>OR</span>
          </div>

          <div>
            <Label htmlFor="csv-data">Paste CSV Data</Label>
            <textarea
              id="csv-data"
              className="w-full h-48 p-3 border rounded-md font-mono text-sm"
              placeholder="Paste your CSV data here..."
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
            />
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Expected CSV Format:</h4>
                <p className="text-sm text-gray-600">
                  The importer will automatically map columns based on common names. Here's a sample format:
                </p>
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                  {sampleCSV}
                </pre>
                
                <div className="text-sm text-gray-600 mt-2">
                  <strong>Supported column names (case insensitive):</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li><strong>Point of Contact:</strong> name, customer, contact, point of contact</li>
                    <li><strong>Phone:</strong> phone, telephone, mobile</li>
                    <li><strong>Email:</strong> email, e-mail, mail</li>
                    <li><strong>Company Name:</strong> company, business, organization, company name</li>
                    <li><strong>Pallet Needs:</strong> pallet needs, pallets, service, type</li>
                    <li><strong>Service Type:</strong> service type, type (Pallet Removal/Pallet Pickups/both)</li>
                    <li><strong>Forklift Access:</strong> forklift, forklift access, access (Yes/No, True/False, 1/0)</li>
                    <li><strong>Current Customer:</strong> current customer, existing customer, customer (Yes/No, True/False, 1/0)</li>
                    <li><strong>Submitted Date:</strong> date, created, submitted, submitted date</li>
                    <li><strong>Notes:</strong> notes, comments, remarks</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport}>
              Import Leads
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImporter;
