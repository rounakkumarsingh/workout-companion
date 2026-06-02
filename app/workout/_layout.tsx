import { Stack } from 'expo-router';

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
