export interface Ritual {
  id: string | number;
  title: string;
  description: string;
  time_estimate: string;
  budget_band: string;
  category?: string;
}

export const shareToWhatsApp = (ritual: Ritual) => {
  const text = `💕 Let's do this together!\n\n${ritual.title}\n\n${ritual.description}\n\nTime: ${ritual.time_estimate} | Budget: ${ritual.budget_band}`;
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

export const shareCodeToWhatsApp = (code: string) => {
  const text = `Join our ritual space! 💕\n\nUse code: ${code}\n\nDownload the app and enter this code to start creating weekly rituals together.`;
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

export const shareCodeToSMS = (code: string) => {
  const text = `Join our ritual space! Use code: ${code}`;
  const url = `sms:&body=${encodeURIComponent(text)}`;
  window.location.href = url;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};