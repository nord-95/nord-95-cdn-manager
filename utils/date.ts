/**
 * Utility functions for handling dates from Firestore and API responses
 */

/**
 * Safely formats a date that could be a Firestore timestamp, Date object, or string
 */
export function formatDate(date: any): string {
  if (!date) return 'Unknown';
  
  try {
    let dateObj: Date;
    
    // Handle Firestore timestamp with seconds property
    if (date.seconds) {
      dateObj = new Date(date.seconds * 1000);
    }
    // Handle Firestore timestamp with _seconds property
    else if (date._seconds) {
      dateObj = new Date(date._seconds * 1000);
    }
    // Handle regular Date object or ISO string
    else if (date instanceof Date) {
      dateObj = date;
    }
    // Handle string dates
    else if (typeof date === 'string') {
      dateObj = new Date(date);
    }
    // Handle numeric timestamp
    else if (typeof date === 'number') {
      dateObj = new Date(date);
    }
    else {
      console.warn('Unknown date format:', date);
      return 'Unknown';
    }
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date:', date);
      return 'Unknown';
    }
    
    return dateObj.toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return 'Unknown';
  }
}

/**
 * Safely formats a date with time that could be a Firestore timestamp, Date object, or string
 */
export function formatDateTime(date: any): string {
  if (!date) return 'Unknown';
  
  try {
    let dateObj: Date;
    
    // Handle Firestore timestamp with seconds property
    if (date.seconds) {
      dateObj = new Date(date.seconds * 1000);
    }
    // Handle Firestore timestamp with _seconds property
    else if (date._seconds) {
      dateObj = new Date(date._seconds * 1000);
    }
    // Handle regular Date object or ISO string
    else if (date instanceof Date) {
      dateObj = date;
    }
    // Handle string dates
    else if (typeof date === 'string') {
      dateObj = new Date(date);
    }
    // Handle numeric timestamp
    else if (typeof date === 'number') {
      dateObj = new Date(date);
    }
    else {
      console.warn('Unknown date format:', date);
      return 'Unknown';
    }
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date:', date);
      return 'Unknown';
    }
    
    return dateObj.toLocaleString();
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return 'Unknown';
  }
}
