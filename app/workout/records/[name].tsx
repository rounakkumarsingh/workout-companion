import { useLocalSearchParams } from 'expo-router';
import { ExerciseRecordsScreen } from '@/features/exercise-records/ExerciseRecordsScreen';

export default function WorkoutExerciseRecordsRoute() {
  const { name } = useLocalSearchParams<{ name: string }>();
  return <ExerciseRecordsScreen exerciseName={name} />;
}
