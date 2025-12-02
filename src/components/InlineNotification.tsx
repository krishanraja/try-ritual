import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InlineNotificationProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onDismiss?: () => void;
}

export const InlineNotification = ({ type, message, onDismiss }: InlineNotificationProps) => {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />,
    error: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    info: <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
  };

  const backgrounds = {
    success: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900',
    error: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900',
    info: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${backgrounds[type]}`}
    >
      {icons[type]}
      <p className="text-sm font-medium text-foreground flex-1">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
};

interface NotificationContainerProps {
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  onDismiss: () => void;
}

export const NotificationContainer = ({ notification, onDismiss }: NotificationContainerProps) => {
  return (
    <AnimatePresence mode="wait">
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onDismiss={onDismiss}
        />
      )}
    </AnimatePresence>
  );
};
