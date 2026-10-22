import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { radii, spacing, typography, useColors, type ColorSet } from '@/src/theme';
import { AppText } from '@/components/ui/AppText';

export interface DialogButton {
  text: string;
  style?: 'cancel' | 'default' | 'destructive';
  onPress?: () => void;
}

interface DialogRequest {
  title: string;
  message?: string;
  buttons: DialogButton[];
}

interface DialogApi {
  /** Alert.alert-compatible: with no buttons a single OK button is shown. */
  show: (title: string, message?: string, buttons?: DialogButton[]) => void;
}

const DialogContext = createContext<DialogApi | null>(null);

const DEFAULT_BUTTONS: DialogButton[] = [{ text: 'OK' }];

export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error('useDialog must be used inside a DialogProvider');
  return api;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // Requests are shown one at a time; the head of the queue is on screen.
  const [queue, setQueue] = useState<DialogRequest[]>([]);

  const show = useCallback((title: string, message?: string, buttons?: DialogButton[]) => {
    const resolved = buttons && buttons.length > 0 ? buttons : DEFAULT_BUTTONS;
    setQueue((q) => [...q, { title, message, buttons: resolved }]);
  }, []);

  const api = useMemo<DialogApi>(() => ({ show }), [show]);
  const current = queue[0];

  const press = (button: DialogButton) => {
    setQueue((q) => q.slice(1));
    button.onPress?.();
  };

  // Cancel first (left of a two-button row, top of a stack), actions after it.
  const ordered = current
    ? [
        ...current.buttons.filter((b) => b.style === 'cancel'),
        ...current.buttons.filter((b) => b.style !== 'cancel'),
      ]
    : [];
  const cancelButton = current?.buttons.find((b) => b.style === 'cancel');

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal
        visible={!!current}
        transparent
        animationType="fade"
        onRequestClose={cancelButton ? () => press(cancelButton) : undefined}
      >
        <View style={styles.backdrop}>
          {current ? (
            <View style={styles.card} accessibilityViewIsModal>
              <AppText variant="heading" style={styles.title} accessibilityRole="header">
                {current.title}
              </AppText>
              {current.message ? (
                <AppText variant="body" color="textSecondary" style={styles.message}>
                  {current.message}
                </AppText>
              ) : null}
              <View style={ordered.length === 2 ? styles.row : styles.stack}>
                {ordered.map((button, index) => (
                  <DialogButtonView
                    key={`${index}-${button.text}`}
                    button={button}
                    styles={styles}
                    onPress={() => press(button)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </DialogContext.Provider>
  );
}

type DialogStyles = ReturnType<typeof makeStyles>;

function DialogButtonView({
  button,
  styles,
  onPress,
}: {
  button: DialogButton;
  styles: DialogStyles;
  onPress: () => void;
}) {
  const cancel = button.style === 'cancel';
  return (
    <TouchableOpacity
      style={[
        styles.button,
        cancel ? styles.cancel : button.style === 'destructive' ? styles.destructive : styles.action,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={button.text}
    >
      <AppText variant="cta" color={cancel ? 'textPrimary' : 'blackText'} style={styles.label}>
        {button.text}
      </AppText>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.scrim,
      justifyContent: 'center',
      paddingHorizontal: spacing.xxxl,
    },
    card: {
      backgroundColor: c.surfaceElevated,
      borderRadius: radii.card,
      borderWidth: 0.5,
      borderColor: c.borderActive,
      padding: spacing.xxl,
    },
    title: {
      fontSize: 24,
      lineHeight: 26,
      marginBottom: spacing.lg,
    },
    message: {
      fontSize: 16,
      lineHeight: 22,
      marginBottom: spacing.xxxl,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    stack: {
      gap: spacing.md,
    },
    button: {
      flex: 1,
      minHeight: 48,
      borderRadius: radii.button,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    cancel: {
      borderWidth: 1,
      borderColor: c.borderControl,
    },
    action: {
      backgroundColor: c.gold,
    },
    destructive: {
      backgroundColor: c.danger,
    },
    label: {
      ...typography.cta,
      fontSize: 16,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
  });
