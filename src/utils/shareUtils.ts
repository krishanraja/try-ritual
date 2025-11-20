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
  const text = `Try this 2-min ritual generator with me! 💕\n\nUse code: ${code}\n\nGet personalized date ideas based on our combined vibes. Takes 2 minutes total.`;
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