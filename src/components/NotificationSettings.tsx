import { useState } from 'react';
import { Bell, BellOff, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationSettings() {
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    isLoading,
    subscribe, 
    unsubscribe 
  } = usePushNotifications();
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        showFeedback('success', 'Notifications disabled');
      }
    } else {
      const success = await subscribe();
      if (success) {
        showFeedback('success', 'Notifications enabled!');
      } else if (permission === 'denied') {
        showFeedback('error', 'Please enable notifications in browser settings');
      }
    }
  };

  if (!isSupported) {
    return (
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Push Notifications</p>
            <p className="text-xs text-muted-foreground">
              Not supported in this browser
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        {isSubscribed ? (
          <CheckCircle className="w-5 h-5 text-emerald-500" />
        ) : (
          <Bell className="w-5 h-5 text-muted-foreground" />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium">Push Notifications</p>
          <AnimatePresence mode="wait">
            {feedback ? (
              <motion.p
                key="feedback"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className={`text-xs flex items-center gap-1 ${
                  feedback.type === 'success' ? 'text-emerald-600' : 'text-destructive'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                {feedback.message}
              </motion.p>
            ) : (
              <motion.p
                key="status"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="text-xs text-muted-foreground"
              >
                {isSubscribed 
                  ? 'Get notified about nudges & surprises' 
                  : 'Enable to get partner nudges & surprise rituals'
                }
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <Button
          variant={isSubscribed ? 'outline' : 'default'}
          size="sm"
          onClick={handleToggle}
          disabled={isLoading}
        >
          {isLoading ? '...' : isSubscribed ? 'Disable' : 'Enable'}
        </Button>
      </div>
    </Card>
  );
}
