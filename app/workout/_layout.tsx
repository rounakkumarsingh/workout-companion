import { Stack } from 'expo-router';

// Opening an exercise directly (Resume) keeps the workout list beneath it.
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function WorkoutLayout() {
  return (
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
    </Stack>
  );
}
