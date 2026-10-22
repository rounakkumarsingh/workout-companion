import { useLocalSearchParams } from 'expo-router';
import { ExerciseRecordsScreen } from '@/features/exercise-records/ExerciseRecordsScreen';

export default function ProgressExerciseRecordsRoute() {
  const { name } = useLocalSearchParams<{ name: string }>();
  return <ExerciseRecordsScreen exerciseName={name} />;
}
