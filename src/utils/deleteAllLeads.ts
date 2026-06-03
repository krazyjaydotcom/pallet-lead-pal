import { supabase } from '@/integrations/supabase/client';

export const deleteAllLeads = async () => {
  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // This will delete all rows

    if (error) throw error;
    
    console.log('All leads deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting all leads:', error);
    return false;
  }
};

// Disabled: auto-execution removed to prevent accidental data loss
