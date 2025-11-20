import { Ritual } from './shareUtils';

export const generateICSFile = (ritual: Ritual, startDate?: Date) => {
  const now = new Date();
  const start = startDate || new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow by default
  
  // Parse duration
  const duration = parseDuration(ritual.time_estimate);
  const end = new Date(start.getTime() + duration);

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ritual//Ritual App//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@ritual.app`,
    `DTSTAMP:${formatDate(now)}`,
    `DTSTART:${formatDate(start)}`,
    `DTEND:${formatDate(end)}`,
    `SUMMARY:${ritual.title}`,
    `DESCRIPTION:${ritual.description}\\n\\nBudget: ${ritual.budget_band}\\nCategory: ${ritual.category || 'Ritual'}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return icsContent;
};

export const downloadICS = (ritual: Ritual, startDate?: Date) => {
  const icsContent = generateICSFile(ritual, startDate);
  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${ritual.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const parseDuration = (timeEstimate: string): number => {
  const match = timeEstimate.match(/(\d+(?:\.\d+)?)\s*(hour|hr|min|minute)/i);
  if (!match) return 60 * 60 * 1000; // Default 1 hour
  
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  
  if (unit.startsWith('hour') || unit === 'hr') {
    return value * 60 * 60 * 1000;
  } else {
    return value * 60 * 1000;
  }
};