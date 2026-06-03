
export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  palletNeeds: string;
  serviceType: 'delivery' | 'pickup' | 'both';
  forklifitAccess: boolean;
  currentCustomer: boolean;
  date: string;
  submittedDate: string | null;
  status: 'New' | 'Contacted' | 'Client';
  notes: string;
  tags: string[];
  lastContact: string | null;
  followUpDate: string | null;
  ltvData?: {
    palletsPerMonth: number | null;
    palletType: 'standard' | 'custom';
    pricePerPallet: number | null;
    notSure: boolean;
  };
}
