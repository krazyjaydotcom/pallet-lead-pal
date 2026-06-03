import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { Search, ExternalLink, Trash2, PhoneCall } from 'lucide-react';
import { Prospect } from './ProspectManager';

interface ProspectSpreadsheetProps {
  prospects: Prospect[];
  onUpdateStatus: (prospectId: string, newStatus: Prospect['status'], followUpIncrement?: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
  onLogActivity?: (
    prospectId: string,
    eventType: 'touch_point' | 'call_pitched' | 'call_booked' | 'status_change' | 'note_added' | 'follow_up_increment',
    metadata?: Record<string, any>
  ) => Promise<void>;
}

const statusColors = {
  none: 'bg-slate-100 text-slate-800 border-slate-200',
  '1st contact': 'bg-blue-100 text-blue-800 border-blue-200',
  follow_up: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  training: 'bg-purple-100 text-purple-800 border-purple-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  no_response: 'bg-gray-100 text-gray-800 border-gray-200',
  ghost: 'bg-red-100 text-red-800 border-red-200',
};

const statusLabels = {
  none: 'No Status',
  '1st contact': '1st Contact',
  follow_up: 'Follow Up',
  training: 'Training',
  confirmed: 'Confirmed',
  no_response: 'No Response',
  ghost: 'Ghost',
};

export const ProspectSpreadsheet = ({ prospects, onUpdateStatus, onRefresh, onLogActivity }: ProspectSpreadsheetProps) => {
  const { user } = useAuth();
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [newProspect, setNewProspect] = useState({
    name: '',
    ig_handle: '',
    phone: '',
    email: '',
    notes: '',
    status: 'none' as Prospect['status'],
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const PROSPECTS_PER_PAGE = 20;

  // Filter and paginate prospects
  const filteredProspects = useMemo(() => {
    if (!searchTerm.trim()) return prospects;
    
    const term = searchTerm.toLowerCase();
    return prospects.filter(prospect => 
      prospect.ig_handle?.toLowerCase().includes(term) ||
      prospect.notes?.toLowerCase().includes(term)
    );
  }, [prospects, searchTerm]);

  const totalPages = Math.ceil(filteredProspects.length / PROSPECTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PROSPECTS_PER_PAGE;
  const paginatedProspects = filteredProspects.slice(startIndex, startIndex + PROSPECTS_PER_PAGE);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (editingCell && (inputRef.current || textareaRef.current)) {
      (inputRef.current || textareaRef.current)?.focus();
    }
  }, [editingCell]);

  const handleCellClick = (prospectId: string, field: string, currentValue: string) => {
    if (field === 'status') return; // Status is handled by dropdown
    setEditingCell(`${prospectId}-${field}`);
    setEditingValue(currentValue || '');
  };

  const handleCellSave = async (prospectId: string, field: string) => {
    try {
      const { error } = await supabase
        .from('prospects')
        .update({ [field]: editingValue })
        .eq('id', prospectId);

      if (error) throw error;
      if (field === 'notes') {
        try { await onLogActivity?.(prospectId, 'note_added', { length: (editingValue || '').length }); } catch {}
      }

      await onRefresh();
      setEditingCell(null);
      toast.success('Prospect updated');
    } catch (error) {
      console.error('Error updating prospect:', error);
      toast.error('Failed to update prospect');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, prospectId: string, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellSave(prospectId, field);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

   const handleAddProspect = async () => {
     if (!newProspect.ig_handle.trim()) {
       toast.error('IG handle is required');
       return;
     }
 
     try {
       const { error } = await supabase
         .from('prospects')
         .insert({
           user_id: user?.id,
           follow_up_count: 0,
           ig_handle: newProspect.ig_handle,
           notes: newProspect.notes,
           status: newProspect.status,
           name: newProspect.name?.trim() || newProspect.ig_handle.trim(),
         });

      if (error) throw error;
      
      await onRefresh();
      setNewProspect({
        name: '',
        ig_handle: '',
        phone: '',
        email: '',
        notes: '',
        status: 'none',
      });
      toast.success('Prospect added successfully!');
    } catch (error) {
      console.error('Error adding prospect:', error);
      toast.error('Failed to add prospect');
    }
  };

  const handleDeleteProspect = async (prospectId: string, prospectName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${prospectName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('prospects')
        .delete()
        .eq('id', prospectId);

      if (error) throw error;

      await onRefresh();
      toast.success('Prospect deleted successfully');
    } catch (error) {
      console.error('Error deleting prospect:', error);
      toast.error('Failed to delete prospect');
    }
  };

  const renderIGHandleCell = (prospect: Prospect) => {
    const cellKey = `${prospect.id}-ig_handle`;
    const currentValue = prospect.ig_handle?.toString() || '';
    const isEditing = editingCell === cellKey;

    if (isEditing) {
      return (
        <Input
          ref={inputRef}
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={() => handleCellSave(prospect.id, 'ig_handle')}
          onKeyDown={(e) => handleKeyDown(e, prospect.id, 'ig_handle')}
          className="w-full"
        />
      );
    }

    const handleIGClick = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (currentValue) {
        const cleanHandle = currentValue.replace('@', '');
        const igUrl = `https://instagram.com/${cleanHandle}`;
        window.open(igUrl, '_blank', 'noopener,noreferrer');
        try {
          await onLogActivity?.(prospect.id, 'touch_point', { channel: 'instagram', handle: cleanHandle });
          toast.success('Touch logged');
        } catch {}
      }
    };

    const handleEditClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleCellClick(prospect.id, 'ig_handle', currentValue);
    };

    if (currentValue) {
      return (
        <div className="flex items-center gap-2 group">
          <div
            className="min-h-[40px] p-2 cursor-pointer hover:bg-blue-50 rounded flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors flex-1"
            onClick={handleIGClick}
            title={`Visit @${currentValue.replace('@', '')} on Instagram`}
          >
            <span>@{currentValue.replace('@', '')}</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </div>
          <button
            className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-foreground transition-opacity px-1"
            onClick={handleEditClick}
            title="Edit handle"
          >
            edit
          </button>
        </div>
      );
    }

    return (
      <div
        className="min-h-[40px] p-2 cursor-pointer hover:bg-muted/50 rounded"
        onClick={() => handleCellClick(prospect.id, 'ig_handle', currentValue)}
      >
        <span className="text-muted-foreground italic">Click to add</span>
      </div>
    );
  };

  const renderEditableCell = (prospect: Prospect, field: keyof Prospect, isTextarea = false) => {
    const cellKey = `${prospect.id}-${field}`;
    const currentValue = prospect[field]?.toString() || '';
    const isEditing = editingCell === cellKey;

    if (isEditing) {
      if (isTextarea) {
        return (
          <Textarea
            ref={textareaRef}
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={() => handleCellSave(prospect.id, field)}
            onKeyDown={(e) => handleKeyDown(e, prospect.id, field)}
            className="min-h-[60px] resize-none"
            rows={2}
          />
        );
      }
      return (
        <Input
          ref={inputRef}
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={() => handleCellSave(prospect.id, field)}
          onKeyDown={(e) => handleKeyDown(e, prospect.id, field)}
          className="w-full"
        />
      );
    }

    // Special handling for email field
    if (field === 'email' && currentValue) {
      return (
        <div className="flex items-center gap-2 group">
          <a
            href={`mailto:${currentValue}`}
            className="min-h-[40px] p-2 cursor-pointer hover:bg-blue-50 rounded flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors flex-1"
            title={`Send email to ${currentValue}`}
          >
            <span>{currentValue}</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          <button
            className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-foreground transition-opacity px-1"
            onClick={() => handleCellClick(prospect.id, field, currentValue)}
            title="Edit email"
          >
            edit
          </button>
        </div>
      );
    }

    return (
      <div
        className="min-h-[40px] p-2 cursor-pointer hover:bg-muted/50 rounded"
        onClick={() => handleCellClick(prospect.id, field, currentValue)}
      >
        {currentValue || <span className="text-muted-foreground italic">Click to add</span>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prospects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredProspects.length} prospect{filteredProspects.length !== 1 ? 's' : ''}
          {searchTerm && ` found for "${searchTerm}"`}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">IG Handle</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="w-[100px]">Follow-ups</TableHead>
              <TableHead className="w-[240px]">Notes</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProspects.map((prospect) => (
              <TableRow key={prospect.id} className="hover:bg-muted/30">
                <TableCell>{renderIGHandleCell(prospect)}</TableCell>
                <TableCell>
                  <Select
                    value={prospect.status}
                    onValueChange={(value) => onUpdateStatus(prospect.id, value as Prospect['status'])}
                  >
                    <SelectTrigger className={statusColors[prospect.status as keyof typeof statusColors]}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([status, label]) => (
                        <SelectItem key={status} value={status}>
                          <Badge variant="secondary" className={statusColors[status as keyof typeof statusColors]}>
                            {label}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{prospect.follow_up_count}</Badge>
                </TableCell>
                <TableCell>{renderEditableCell(prospect, 'notes', true)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => { try { await onLogActivity?.(prospect.id, 'call_pitched'); toast.success('Pitched logged'); } catch {} }}
                      disabled={prospect.status === 'confirmed' || prospect.status === 'ghost'}
                      title="Log call pitched"
                    >
                      <PhoneCall className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateStatus(prospect.id, 'follow_up', true)}
                      disabled={prospect.status === 'confirmed' || prospect.status === 'ghost'}
                      title="Increment follow-up"
                    >
                      +1
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteProspect(prospect.id, prospect.name)}
                      title="Delete prospect"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            
            {/* Add new prospect row */}
            <TableRow className="bg-muted/20">
              <TableCell>
                <Input
                  placeholder="@handle"
                  value={newProspect.ig_handle}
                  onChange={(e) => setNewProspect(prev => ({ ...prev, ig_handle: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddProspect()}
                />
              </TableCell>
              <TableCell>
                <Select
                  value={newProspect.status}
                  onValueChange={(value) => setNewProspect(prev => ({ ...prev, status: value as Prospect['status'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([status, label]) => (
                      <SelectItem key={status} value={status}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <div className="text-center text-muted-foreground">0</div>
              </TableCell>
              <TableCell>
                <Textarea
                  placeholder="Notes..."
                  value={newProspect.notes}
                  onChange={(e) => setNewProspect(prev => ({ ...prev, notes: e.target.value }))}
                  className="min-h-[40px] resize-none"
                  rows={1}
                />
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  onClick={handleAddProspect}
                  disabled={!newProspect.ig_handle.trim()}
                >
                  Add
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
      
      <div className="text-sm text-muted-foreground">
        <p>💡 Tips: Click any cell to edit • Press Enter to save • Press Escape to cancel • Use +1 button to increment follow-ups</p>
        <p>Showing {startIndex + 1}-{Math.min(startIndex + PROSPECTS_PER_PAGE, filteredProspects.length)} of {filteredProspects.length} prospects</p>
      </div>
    </div>
  );
};