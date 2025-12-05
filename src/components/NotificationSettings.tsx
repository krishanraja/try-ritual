import { Bell, BellOff, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';

export function NotificationSettings() {
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    isLoading,
    subscribe, 
    unsubscribe 
  } = usePushNotifications();
  const { toast } = useToast();

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast({
          title: 'Notifications disabled',
          description: 'You won\'t receive push notifications anymore.',
        });
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast({
          title: 'Notifications enabled!',
          description: 'You\'ll get notified about nudges and surprises.',
        });
      } else if (permission === 'denied') {
        toast({
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
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
          <p className="text-xs text-muted-foreground">
            {isSubscribed 
              ? 'Get notified about nudges & surprises' 
              : 'Enable to get partner nudges & surprise rituals'
            }
          </p>
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
