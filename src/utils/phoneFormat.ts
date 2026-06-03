/**
 * Formats phone number as user types
 * @param value - The input value
 * @returns Formatted phone number in (XXX) XXX-XXXX format
 */
export const formatPhoneNumber = (value: string): string => {
  // Remove all non-numeric characters
  const cleaned = value.replace(/\D/g, '');
  
  // Don't format if empty
  if (!cleaned) return '';
  
  // Format based on length
  if (cleaned.length <= 3) {
    return `(${cleaned}`;
  } else if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  } else {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  }
};

/**
 * Removes formatting from phone number
 * @param formattedPhone - The formatted phone number
 * @returns Clean phone number with only digits
 */
export const cleanPhoneNumber = (formattedPhone: string): string => {
  return formattedPhone.replace(/\D/g, '');
};