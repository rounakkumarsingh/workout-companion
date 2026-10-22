import { Stack } from 'expo-router';
import { DialogProvider } from '@/components/ui/ConfirmDialog';

// Opening an exercise directly (Resume) keeps the workout list beneath it.
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function WorkoutLayout() {
  // A root Modal cannot present over this native modal route (iOS), so it has its own host.
  return (
    <DialogProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="[exerciseLogId]/index" />
        <Stack.Screen name="summary" />
        <Stack.Screen name="pr-celebration" />
        <Stack.Screen name="records/[name]" />
      </Stack>
    </DialogProvider>
  );
}
