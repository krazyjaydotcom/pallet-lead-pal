
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

interface IGFollowerImporterProps {
  onProspectAdd: (prospectData: any) => Promise<any>;
  existingProspects: Array<{ ig_handle?: string }>;
}

export const IGFollowerImporter = ({ onProspectAdd, existingProspects }: IGFollowerImporterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [handles, setHandles] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!handles.trim()) {
      toast.error('Please enter at least one Instagram handle');
      return;
    }

    setIsImporting(true);
    console.log('IGFollowerImporter: Starting import with handles:', handles);

    try {
      // Split handles by newlines and clean them up
      const handleList = handles
        .split('\n')
        .map(handle => handle.trim())
        .filter(handle => handle.length > 0)
        .map(handle => handle.replace('@', '')); // Remove @ if present

      console.log('IGFollowerImporter: Processed handle list:', handleList);

      // Filter out duplicates
      const existingHandles = new Set(
        existingProspects
          .map(p => p.ig_handle?.toLowerCase())
          .filter(Boolean)
      );

      const newHandles = handleList.filter(handle => 
        !existingHandles.has(handle.toLowerCase())
      );

      let successCount = 0;
      let errorCount = 0;
      const duplicateCount = handleList.length - newHandles.length;

      console.log('IGFollowerImporter: Filtered duplicates, processing:', newHandles.length, 'new handles');

      for (const handle of newHandles) {
        try {
          console.log('IGFollowerImporter: Adding prospect for handle:', handle);
          
          const prospectData = {
            name: handle, // Use handle as name initially
            ig_handle: handle,
            status: 'none',
            follow_up_count: 0,
            notes: 'Imported from Instagram handles',
          };

          await onProspectAdd(prospectData);
          successCount++;
          console.log('IGFollowerImporter: Successfully added:', handle);
        } catch (error) {
          console.error('IGFollowerImporter: Error adding handle:', handle, error);
          errorCount++;
        }
      }

      // Show import results
      let message = '';
      if (successCount > 0) {
        message += `Successfully imported ${successCount} handle${successCount === 1 ? '' : 's'}`;
      }
      if (duplicateCount > 0) {
        if (message) message += ', ';
        message += `${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'} skipped`;
      }
      if (errorCount > 0) {
        if (message) message += ', ';
        message += `${errorCount} failed`;
      }

      if (successCount > 0 || duplicateCount > 0) {
        toast.success(message || 'Import completed');
      } else if (errorCount > 0) {
        toast.error('All imports failed');
      }

      // Clear the form and close dialog on success
      if (successCount > 0) {
        setHandles('');
        setIsOpen(false);
      }
    } catch (error) {
      console.error('IGFollowerImporter: Import error:', error);
      toast.error('Failed to import handles');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Import IG Handles
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Instagram Handles</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="handles">Instagram Handles</Label>
            <Textarea
              id="handles"
              placeholder="Enter Instagram handles, one per line:&#10;@username1&#10;@username2&#10;username3"
              value={handles}
              onChange={(e) => setHandles(e.target.value)}
              rows={10}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter one handle per line. @ symbol is optional.
            </p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isImporting || !handles.trim()}>
              {isImporting ? 'Importing...' : 'Import Handles'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
