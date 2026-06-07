export const TOTAL_WEEKS = 12 as const;
export const MAX_SESSIONS_PER_WEEK = 5 as const;

// ============================================================
// 1. Canonical / Static Types
// ============================================================

export type DayType =
  | 'Upper'
  | 'Lower'
  | 'OptionalCardioHIIT'
  | 'Pull'
  | 'Push'
  | 'Legs'
  | 'FullRest';

export type DayFocus = 'StrengthFocus' | 'HypertrophyFocus';

export type ActivityType = 'Training' | 'OptionalCardioHIIT' | 'FullRest';

export type Technique = 'N/A' | 'Failure';

export type BlockName = 'Foundation' | 'Ramping';

export interface Exercise {
  readonly name: string;
  readonly demoVideoUrl: string | null;
  readonly notes: string;
}

export interface Substitution {
  readonly exerciseName: string;
  readonly slot: 1 | 2;
  readonly substituteName: string;
  readonly blockName: BlockName | null;
}

export interface Block {
  readonly name: BlockName;
  readonly weekStart: number;
  readonly weekEnd: number;
  readonly description: string;
}

// ============================================================
// 2. Prescription Types
// ============================================================

export interface ExercisePrescription {
  readonly exerciseName: string;
  readonly sortOrder: number;
  readonly technique: Technique;
  readonly warmupSetsMin: number;
  readonly warmupSetsMax: number;
  readonly workingSets: number;
  readonly repRange: string;
  readonly earlySetRpe: string | null;
  readonly lastSetRpe: string;
  readonly rest: string;
}

export interface DayPrescription {
  readonly dayIndex: number;
  readonly dayType: DayType;
  readonly dayFocus: DayFocus | null;
  readonly activityType: ActivityType;
  readonly exercises: readonly ExercisePrescription[];
}

export interface Week {
  readonly weekNumber: number;
  readonly blockName: BlockName;
  readonly days: readonly DayPrescription[];
}

// ============================================================
// 3. Execution / Tracking Types (type definitions only)
// ============================================================

export type WorkoutSessionStatus = 'in_progress' | 'completed' | 'abandoned';

export type WeightUnit = 'lbs' | 'kg';

export type CardioIntensityType = 'low_moderate' | 'high_intensity';

export type PhotoAngle = 'front' | 'side' | 'rear';

export interface WorkoutSession {
  readonly id: string;
  readonly weekNumber: number;
  readonly dayType: DayType;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly status: WorkoutSessionStatus;
}

export interface ExerciseLog {
  readonly id: string;
  readonly workoutSessionId: string;
  readonly exerciseName: string;
  readonly prescribedExerciseName: string;
  readonly substitutionNote: string | null;
  readonly sortOrder: number;
}

export interface WorkoutSetLog {
  readonly id: string;
  readonly exerciseLogId: string;
  readonly setIndex: number;
  readonly weight: number;
  readonly reps: number;
  readonly loggedRpe: number | null;
  readonly loggedAt: string | null;
}

export interface BodyweightEntry {
  readonly id: string;
  readonly weight: number;
  readonly unit: WeightUnit;
  readonly measuredAt: string;
  readonly note: string | null;
}

export interface CardioSession {
  readonly id: string;
  readonly weekNumber: number;
  readonly intensityType: CardioIntensityType;
  readonly activity: string;
  readonly durationMinutes: number;
  readonly note: string | null;
  readonly loggedAt: string;
}

export interface ProgressPhoto {
  readonly id: string;
  readonly fileUri: string;
  readonly angle: PhotoAngle;
  readonly takenAt: string;
  readonly note: string | null;
}

// ============================================================
// Internal Helpers
// ============================================================

function ex(
  exerciseName: string,
  sortOrder: number,
  technique: Technique,
  warmupSetsMin: number,
  warmupSetsMax: number,
  workingSets: number,
  repRange: string,
  earlySetRpe: string | null,
  lastSetRpe: string,
  rest: string,
): ExercisePrescription {
  return {
    exerciseName,
    sortOrder,
    technique,
    warmupSetsMin,
    warmupSetsMax,
    workingSets,
    repRange,
    earlySetRpe,
    lastSetRpe,
    rest,
  };
}

function trainingDay(
  dayIndex: number,
  dayType: DayType,
  dayFocus: DayFocus,
  exercises: readonly ExercisePrescription[],
): DayPrescription {
  return { dayIndex, dayType, dayFocus, activityType: 'Training', exercises };
}

function cardioDay(): DayPrescription {
  return {
    dayIndex: 3,
    dayType: 'OptionalCardioHIIT',
    dayFocus: null,
    activityType: 'OptionalCardioHIIT',
    exercises: [],
  };
}

function restDay(): DayPrescription {
  return {
    dayIndex: 7,
    dayType: 'FullRest',
    dayFocus: null,
    activityType: 'FullRest',
    exercises: [],
  };
}

// ============================================================
// Canonical Exercise Metadata
// ============================================================

const EXERCISES = {
  // -- Upper Day Exercises --
  '45° Incline Barbell Press': {
    name: '45° Incline Barbell Press',
    demoVideoUrl: 'https://youtu.be/vqQ9ok0dEgk',
    notes:
      '1 second pause at the bottom of each rep while maintaining tension on the pecs.',
  },
  '45° Incline DB Press': {
    name: '45° Incline DB Press',
    demoVideoUrl: 'https://youtu.be/vqQ9ok0dEgk',
    notes:
      '1 second pause at the bottom of each rep while maintaining tension on the pecs.',
  },
  'Cable Crossover Ladder': {
    name: 'Cable Crossover Ladder',
    demoVideoUrl: 'https://youtu.be/0TP9kVcWGic',
    notes:
      'Do one set with low cable position, one set with medium-height cable position, and one set with a high cable position. If you only have one or two sets, choose the one or two cable positions you prefer.',
  },
  'Pec Deck': {
    name: 'Pec Deck',
    demoVideoUrl: 'https://youtu.be/CI88L1VNvEs',
    notes:
      'Focus on bringing your elbows together \u2014 not your hands.',
  },
  'Wide-Grip Pull-Up': {
    name: 'Wide-Grip Pull-Up',
    demoVideoUrl: 'https://youtu.be/yGnp0HU8BnA',
    notes:
      '1.5x shoulder width overhand grip. Slow 2\u20133 second negative. Feel your lats pulling apart on the way down.',
  },
  'Dual-Handle Lat Pulldown': {
    name: 'Dual-Handle Lat Pulldown',
    demoVideoUrl: 'https://youtu.be/NwQ5Ch5t5Vk',
    notes:
      'Lean back by ~15\u00b0 and drive your elbows down as you squeeze your shoulder blades together. This should feel like a mix of lats and mid-traps.',
  },
  'High-Cable Lateral Raise': {
    name: 'High-Cable Lateral Raise',
    demoVideoUrl: null,
    notes:
      'Focus on squeezing your lateral delt to move the weight.',
  },
  'Pendlay Deficit Row': {
    name: 'Pendlay Deficit Row',
    demoVideoUrl: 'https://youtu.be/MmuyHKYCLps',
    notes:
      'Stand on a bumper plate. Focus on getting a big stretch and touch your stomach/chest on each rep!',
  },
  'Smith Machine Row': {
    name: 'Smith Machine Row',
    demoVideoUrl: 'https://youtu.be/Wmivm40AV3Q',
    notes:
      'Focus on squeezing your shoulder blades together, keeping your elbows at a ~45\u00b0 angle.',
  },
  'Overhead Cable Triceps Extension (Bar)': {
    name: 'Overhead Cable Triceps Extension (Bar)',
    demoVideoUrl: 'https://youtu.be/9_I1PqZAjdA',
    notes:
      'Optionally pause for 0.5\u20131 second in the stretched aspect of each rep.',
  },
  'Bayesian Cable Curl': {
    name: 'Bayesian Cable Curl',
    demoVideoUrl: 'https://youtu.be/CWH5J_7kzjM',
    notes:
      'If you have a left-right bicep size imbalance, do these 1 arm at a time, starting with the weaker arm. Take the weaker arm to the listed RPE. Then match the reps with the other arm (stop once you\u2019ve matched the reps, even if the RPE is lower). If you don\u2019t have a size imbalance, do these both arms at the same time.',
  },

  // -- Lower Day Exercises --
  'Lying Leg Curl': {
    name: 'Lying Leg Curl',
    demoVideoUrl: 'https://youtu.be/sX4tGtcc62k',
    notes:
      'Set the machine so that you get the biggest stretch possible at the bottom. Prevent your butt from popping up as you curl.',
  },
  'Smith Machine Squat': {
    name: 'Smith Machine Squat',
    demoVideoUrl: null,
    notes:
      'Once you are under the bar, set up your feet as you would a normal squat and then bring them forward ~3\u20136 inches. This will cause you to lean back into the bar slightly, allowing for a more upright squat, while also placing more tension on the quads. If your heels are raising at the bottom, you may need to bring your feet more forward. If your feet feel like they are slipping or your lower back is rounding at the bottom, try bringing your feet back a bit.',
  },
  'Smith Machine Static Lunge w/ Elevated Front Foot': {
    name: 'Smith Machine Static Lunge w/ Elevated Front Foot',
    demoVideoUrl: 'https://youtu.be/SEjKxJGg_C8',
    notes:
      'Elevate your front foot on a small box. Minimize contribution from your back leg.',
  },
  'Barbell RDL': {
    name: 'Barbell RDL',
    demoVideoUrl: null,
    notes:
      'To keep tension on the hamstrings, stop about 75% of the way to full lockout on each rep (i.e. stay in the bottom 3/4 of the range of motion).',
  },
  '45\u00b0 Hyperextension': {
    name: '45\u00b0 Hyperextension',
    demoVideoUrl: 'https://youtu.be/lEeCPhlFZig',
    notes:
      'Squeeze your glutes hard at the top of each rep. Slow controlled reps on the way down, followed by an explosive positive.',
  },
  'Leg Extension': {
    name: 'Leg Extension',
    demoVideoUrl: 'https://youtu.be/uFbNtqP966A',
    notes:
      'Set the seat back as far as it will go while still feeling comfortable. Grab the handles as hard as you can to pull your butt down into the seat. Use a 2\u20133 second negative. Feel your quads pulling apart on the negative.',
  },
  'Standing Calf Raise': {
    name: 'Standing Calf Raise',
    demoVideoUrl: 'https://youtu.be/6lR2JdxUh7w',
    notes:
      '1\u20132 second pause at the bottom of each rep. Instead of just going up onto your toes, think about rolling your ankle back and forth on the balls of your feet.',
  },
  'Cable Crunch': {
    name: 'Cable Crunch',
    demoVideoUrl: 'https://youtu.be/epBrpaGHMcg',
    notes:
      'Round your lower back as you crunch. Maintain a mind-muscle connection with your 6-pack.',
  },
  'Leg Press Calf Press': {
    name: 'Leg Press Calf Press',
    demoVideoUrl: 'https://youtu.be/S6DTPNZ_-F4',
    notes:
      '1\u20132 second pause at the bottom of each rep. Instead of just going up onto your toes, think about rolling your ankle back and forth on the balls of your feet.',
  },
  'Machine Crunch': {
    name: 'Machine Crunch',
    demoVideoUrl: null,
    notes:
      'Round your lower back as you crunch. Maintain a mind-muscle connection with your 6-pack.',
  },

  // -- Pull Day Exercises --
  'Neutral-Grip Lat Pulldown': {
    name: 'Neutral-Grip Lat Pulldown',
    demoVideoUrl: null,
    notes:
      'Do these pulldowns with the handle more out in front of you, more like a cross between a pullover and a pulldown. Focus on feeling your lats working more than the weight you\'re using.',
  },
  'Lean-Back Lat Pulldown': {
    name: 'Lean-Back Lat Pulldown',
    demoVideoUrl: null,
    notes:
      'Initiate the pulldown with a straight up posture. As you pull the bar down, lean back by about 15\u201330\u00b0 to get the mid-back more involved. Softly touch the bar to your chest on every rep and, even though you\'re leaning back, still control the weight!',
  },
  'Chest-Supported Machine Row': {
    name: 'Chest-Supported Machine Row',
    demoVideoUrl: null,
    notes:
      'Flare elbows out at roughly 45\u00b0 and squeeze your shoulder blades together hard at the top of each rep.',
  },
  'Chest-Supported T-Bar Row': {
    name: 'Chest-Supported T-Bar Row',
    demoVideoUrl: null,
    notes:
      'Flare elbows out at roughly 45\u00b0 and squeeze your shoulder blades together hard at the top of each rep.',
  },
  '1-Arm 45\u00b0 Cable Rear Delt Flye': {
    name: '1-Arm 45\u00b0 Cable Rear Delt Flye',
    demoVideoUrl: null,
    notes:
      'Pause for 1\u20132 seconds in the squeeze of each rep. Contract the rear delts hard!',
  },
  'Machine Shrug': {
    name: 'Machine Shrug',
    demoVideoUrl: null,
    notes:
      'Brief pause at the top of the bottom of ROM. Think about pulling your shoulders up to your ears!',
  },
  'Cable Paused Shrug-In': {
    name: 'Cable Paused Shrug-In',
    demoVideoUrl: null,
    notes:
      'Shrug up and in. Think about shrugging "up to your ears." 1\u20132 second pause in the squeeze (at the top) of each rep, then another 1\u20132 second pause in the stretch (at the bottom) of each rep.',
  },
  'EZ-Bar Cable Curl': {
    name: 'EZ-Bar Cable Curl',
    demoVideoUrl: null,
    notes:
      'Set up the cable at the lowest position. Maintain constant tension on the biceps. Slow, controlled reps!',
  },
  'Cable Rope Hammer Curl': {
    name: 'Cable Rope Hammer Curl',
    demoVideoUrl: null,
    notes:
      'Squeeze the rope hard as you curl the weight up. Smooth, controlled reps.',
  },
  'Machine Preacher Curl': {
    name: 'Machine Preacher Curl',
    demoVideoUrl: null,
    notes:
      'Smooth, controlled reps. Mind-muscle connection with the biceps.',
  },
  'DB Concentration Curl': {
    name: 'DB Concentration Curl',
    demoVideoUrl: null,
    notes:
      'Smooth, controlled reps. Mind-muscle connection with the biceps.',
  },

  // -- Push Day Exercises --
  'Barbell Bench Press': {
    name: 'Barbell Bench Press',
    demoVideoUrl: null,
    notes:
      'Set up a comfortable arch, quick pause on the chest and explode up on each rep.',
  },
  'Machine Chest Press': {
    name: 'Machine Chest Press',
    demoVideoUrl: null,
    notes:
      '1 second pause at the bottom of each rep while maintaining tension on the pecs.',
  },
  'Machine Shoulder Press': {
    name: 'Machine Shoulder Press',
    demoVideoUrl: null,
    notes:
      'Ensure that your elbows break at least 90\u00b0. Mind-muscle connection with your delts. Smooth, controlled reps.',
  },
  'Seated DB Shoulder Press': {
    name: 'Seated DB Shoulder Press',
    demoVideoUrl: null,
    notes:
      'Ensure that your elbows break at least 90\u00b0. Mind-muscle connection with your delts. Smooth, controlled reps.',
  },
  'Bottom-Half DB Flye': {
    name: 'Bottom-Half DB Flye',
    demoVideoUrl: 'https://youtu.be/qJzc-iHKGdg',
    notes:
      'All reps and sets are to be performed in the bottom half of the ROM. Focus on feeling a deep stretch in your pecs at the bottom of each rep.',
  },
  'Bottom-Half Seated Cable Flye': {
    name: 'Bottom-Half Seated Cable Flye',
    demoVideoUrl: null,
    notes:
      'All reps and sets are to be performed in the bottom half of the ROM. Focus on feeling a deep stretch in your pecs at the bottom of each rep.',
  },
  'Cable Triceps Kickback': {
    name: 'Cable Triceps Kickback',
    demoVideoUrl: null,
    notes:
      'There are two ways you can do this: upright or bent over. Choose the one that feels more comfortable for you. The main thing is that when you\'re in the full squeeze, your shoulder should be positioned back behind your torso.',
  },
  'EZ-Bar Skull Crusher': {
    name: 'EZ-Bar Skull Crusher',
    demoVideoUrl: 'https://youtu.be/fbLTzgTKOR8',
    notes:
      'Optionally pause for 0.5\u20131 second in the stretched aspect of each rep.',
  },
  'Triceps Pressdown (Bar)': {
    name: 'Triceps Pressdown (Bar)',
    demoVideoUrl: 'https://youtu.be/o4eazahiXQw',
    notes:
      'Focus on squeezing your triceps to move the weight.',
  },
  'Lying Leg Raise': {
    name: 'Lying Leg Raise',
    demoVideoUrl: null,
    notes:
      'Perform these slowly, focus on keeping your lower back against the ground throughout the set.',
  },
  'Ab Wheel Rollout': {
    name: 'Ab Wheel Rollout',
    demoVideoUrl: 'https://youtu.be/gGTgyCU9gcg',
    notes:
      'Don\'t just bend at your hips, use your abs to lower yourself down under control and pull yourself back up. If you don\'t have the core strength to get all the way extended at the bottom, try to progressively increase the ROM week to week.',
  },

  // -- Legs Day Exercises --
  'Leg Press': {
    name: 'Leg Press',
    demoVideoUrl: 'https://youtu.be/1yKAQLVV_XI',
    notes:
      'Feet lower on the platform for more quad focus. Get as deep as you can without excessive back rounding. Control the negative and do a slight pause at the bottom of each rep.',
  },
  'Hack Squat': {
    name: 'Hack Squat',
    demoVideoUrl: 'https://youtu.be/TWUnnDK8rck',
    notes:
      'Use a controlled negative (don\'t free fall) and then explode on the positive.',
  },
  'Seated Leg Curl': {
    name: 'Seated Leg Curl',
    demoVideoUrl: 'https://youtu.be/yv0aAY7M1mk',
    notes:
      'Lean forward over the machine to get a maximum stretch in your hamstrings.',
  },
  'Walking Lunge': {
    name: 'Walking Lunge',
    demoVideoUrl: null,
    notes:
      'Take medium strides. Minimize contribution from the back leg.',
  },
  'Machine Hip Abduction': {
    name: 'Machine Hip Abduction',
    demoVideoUrl: 'https://youtu.be/pozooPg6PBE',
    notes:
      'If possible, use pads to increase the range of motion on the machine. Lean forward and grab onto the machine rails to stretch the glutes further.',
  },

  // -- Substitution-Only Exercises (no full metadata entry, referenced as subs) --
  '45\u00b0 Incline Machine Press': {
    name: '45\u00b0 Incline Machine Press',
    demoVideoUrl: 'https://youtu.be/b8fYnZ-usP0',
    notes: '',
  },
  'Wide-Grip Lat Pulldown': {
    name: 'Wide-Grip Lat Pulldown',
    demoVideoUrl: 'https://youtu.be/IYXRrYXfVLc',
    notes: '',
  },
  'Single-Arm DB Row': {
    name: 'Single-Arm DB Row',
    demoVideoUrl: 'https://youtu.be/roKtfQZbxzg',
    notes: '',
  },
  'Overhead Cable Triceps Extension (Rope)': {
    name: 'Overhead Cable Triceps Extension (Rope)',
    demoVideoUrl: 'https://youtu.be/GYoUoVNlbGc',
    notes: '',
  },
  'DB Skull Crusher': {
    name: 'DB Skull Crusher',
    demoVideoUrl: 'https://youtu.be/fbLTzgTKOR8',
    notes: '',
  },
  'Seated Super-Bayesian High Cable Curl': {
    name: 'Seated Super-Bayesian High Cable Curl',
    demoVideoUrl: 'https://youtu.be/jQ9rkfvAbIc',
    notes: '',
  },
  'Incline DB Stretch Curl': {
    name: 'Incline DB Stretch Curl',
    demoVideoUrl: 'https://youtu.be/Z0NIYS9nyoQ',
    notes: '',
  },
  'DB Bulgarian Split Squat': {
    name: 'DB Bulgarian Split Squat',
    demoVideoUrl: 'https://youtu.be/htDXu61MPio',
    notes: '',
  },
  'High-Bar Back Squat': {
    name: 'High-Bar Back Squat',
    demoVideoUrl: 'https://youtu.be/V-B_Y-OvOTQ',
    notes: '',
  },
  'DB RDL': {
    name: 'DB RDL',
    demoVideoUrl: null,
    notes: '',
  },
  'Snatch-Grip RDL': {
    name: 'Snatch-Grip RDL',
    demoVideoUrl: null,
    notes: '',
  },
  'Reverse Nordic': {
    name: 'Reverse Nordic',
    demoVideoUrl: 'https://youtu.be/D-kqUKEQZZ0',
    notes: '',
  },
  'Sissy Squat': {
    name: 'Sissy Squat',
    demoVideoUrl: 'https://youtu.be/eWAjlO4FWPQ',
    notes: '',
  },
  'Seated Calf Raise': {
    name: 'Seated Calf Raise',
    demoVideoUrl: 'https://youtu.be/6pfj0G7VKdM',
    notes: '',
  },
  'Decline Weighted Crunch': {
    name: 'Decline Weighted Crunch',
    demoVideoUrl: 'https://youtu.be/ZheUsKqU81M',
    notes: '',
  },
  'Neutral-Grip Pull-Up': {
    name: 'Neutral-Grip Pull-Up',
    demoVideoUrl: null,
    notes: '',
  },
  'Incline Chest-Supported DB Row': {
    name: 'Incline Chest-Supported DB Row',
    demoVideoUrl: null,
    notes: '',
  },
  'Rope Face Pull': {
    name: 'Rope Face Pull',
    demoVideoUrl: null,
    notes: '',
  },
  'Reverse Pec Deck': {
    name: 'Reverse Pec Deck',
    demoVideoUrl: null,
    notes: '',
  },
  'DB Shrug': {
    name: 'DB Shrug',
    demoVideoUrl: null,
    notes: '',
  },
  'EZ-Bar Curl': {
    name: 'EZ-Bar Curl',
    demoVideoUrl: null,
    notes: '',
  },
  'DB Curl': {
    name: 'DB Curl',
    demoVideoUrl: null,
    notes: '',
  },
  'EZ-Bar Preacher Curl': {
    name: 'EZ-Bar Preacher Curl',
    demoVideoUrl: null,
    notes: '',
  },
  'DB Preacher Curl': {
    name: 'DB Preacher Curl',
    demoVideoUrl: null,
    notes: '',
  },
  'DB Bench Press': {
    name: 'DB Bench Press',
    demoVideoUrl: null,
    notes: '',
  },
  'Cable Shoulder Press': {
    name: 'Cable Shoulder Press',
    demoVideoUrl: null,
    notes: '',
  },
  'Low-to-High Cable Crossover': {
    name: 'Low-to-High Cable Crossover',
    demoVideoUrl: null,
    notes: '',
  },
  'DB Triceps Kickback': {
    name: 'DB Triceps Kickback',
    demoVideoUrl: null,
    notes: '',
  },
  'Bench Dip': {
    name: 'Bench Dip',
    demoVideoUrl: null,
    notes: '',
  },
  'Hanging Leg Raise': {
    name: 'Hanging Leg Raise',
    demoVideoUrl: null,
    notes: '',
  },
  'Modified Candlestick': {
    name: 'Modified Candlestick',
    demoVideoUrl: null,
    notes: '',
  },
  'Smith Machine Static Lunge': {
    name: 'Smith Machine Static Lunge',
    demoVideoUrl: 'https://youtu.be/GOqHdmshRKY',
    notes: '',
  },
  'DB Walking Lunge': {
    name: 'DB Walking Lunge',
    demoVideoUrl: 'https://youtu.be/BC_eDtrB-M4',
    notes: '',
  },
  'Nordic Ham Curl': {
    name: 'Nordic Ham Curl',
    demoVideoUrl: 'https://youtu.be/fzpYiRtzmFA',
    notes: '',
  },
  'DB Step-Up': {
    name: 'DB Step-Up',
    demoVideoUrl: null,
    notes: '',
  },
  'Goblet Squat': {
    name: 'Goblet Squat',
    demoVideoUrl: null,
    notes: '',
  },
  'DB Static Lunge': {
    name: 'DB Static Lunge',
    demoVideoUrl: 'https://youtu.be/hci6iKFtTkg',
    notes: '',
  },
  'Cable Hip Abduction': {
    name: 'Cable Hip Abduction',
    demoVideoUrl: 'https://youtu.be/552L1K3Rb_Q',
    notes: '',
  },
  'Lateral Band Walk': {
    name: 'Lateral Band Walk',
    demoVideoUrl: 'https://youtu.be/sOYvvFPYdsU',
    notes: '',
  },
  'Lean-Back Machine Pulldown': {
    name: 'Lean-Back Machine Pulldown',
    demoVideoUrl: null,
    notes: '',
  },
  'Pull-Up': {
    name: 'Pull-Up',
    demoVideoUrl: null,
    notes: '',
  },
  'DB Hammer Curl': {
    name: 'DB Hammer Curl',
    demoVideoUrl: null,
    notes: '',
  },
  'Hammer Preacher Curl': {
    name: 'Hammer Preacher Curl',
    demoVideoUrl: null,
    notes: '',
  },
  'Concentration Cable Curl': {
    name: 'Concentration Cable Curl',
    demoVideoUrl: null,
    notes: '',
  },
  'Katana Triceps Extension': {
    name: 'Katana Triceps Extension',
    demoVideoUrl: null,
    notes: '',
  },
  'Triceps Pressdown (Rope)': {
    name: 'Triceps Pressdown (Rope)',
    demoVideoUrl: null,
    notes: '',
  },
  'Swiss Ball Rollout': {
    name: 'Swiss Ball Rollout',
    demoVideoUrl: null,
    notes: '',
  },
  'Long-Lever Plank': {
    name: 'Long-Lever Plank',
    demoVideoUrl: null,
    notes: '',
  },
  'Glute-Ham Raise': {
    name: 'Glute-Ham Raise',
    demoVideoUrl: 'https://youtu.be/9ksG-O0ZUto',
    notes: '',
  },
  'Cable Pull-Through': {
    name: 'Cable Pull-Through',
    demoVideoUrl: 'https://youtu.be/eFsNZc69m10',
    notes: '',
  },
  'High-Cable Cuffed Lateral Raise': {
    name: 'High-Cable Cuffed Lateral Raise',
    demoVideoUrl: 'https://youtu.be/8m2jNHBP580',
    notes: '',
  },
  'Lean-In DB Lateral Raise': {
    name: 'Lean-In DB Lateral Raise',
    demoVideoUrl: null,
    notes: '',
  },
} as const satisfies Record<string, Exercise>;

// ============================================================
// Canonical Exercise IDs (type-safe accessor)
// ============================================================

export type ExerciseId = keyof typeof EXERCISES;

// ============================================================
// Substitution Options
// ============================================================

const SUBSTITUTIONS: readonly Substitution[] = [
  // Upper Day - Foundation
  { exerciseName: '45\u00b0 Incline Barbell Press', slot: 1, substituteName: '45\u00b0 Incline DB Press', blockName: null },
  { exerciseName: '45\u00b0 Incline Barbell Press', slot: 2, substituteName: '45\u00b0 Incline Machine Press', blockName: null },
  { exerciseName: 'Cable Crossover Ladder', slot: 1, substituteName: 'Pec Deck', blockName: null },
  { exerciseName: 'Cable Crossover Ladder', slot: 2, substituteName: 'Bottom-Half DB Flye', blockName: null },
  { exerciseName: 'Wide-Grip Pull-Up', slot: 1, substituteName: 'Wide-Grip Lat Pulldown', blockName: null },
  { exerciseName: 'Wide-Grip Pull-Up', slot: 2, substituteName: 'Dual-Handle Lat Pulldown', blockName: null },
  { exerciseName: 'High-Cable Lateral Raise', slot: 1, substituteName: 'High-Cable Cuffed Lateral Raise', blockName: null },
  { exerciseName: 'High-Cable Lateral Raise', slot: 2, substituteName: 'Lean-In DB Lateral Raise', blockName: null },
  { exerciseName: 'Pendlay Deficit Row', slot: 1, substituteName: 'Smith Machine Row', blockName: null },
  { exerciseName: 'Pendlay Deficit Row', slot: 2, substituteName: 'Single-Arm DB Row', blockName: null },
  { exerciseName: 'Overhead Cable Triceps Extension (Bar)', slot: 1, substituteName: 'Overhead Cable Triceps Extension (Rope)', blockName: null },
  { exerciseName: 'Overhead Cable Triceps Extension (Bar)', slot: 2, substituteName: 'DB Skull Crusher', blockName: null },
  { exerciseName: 'Bayesian Cable Curl', slot: 1, substituteName: 'Seated Super-Bayesian High Cable Curl', blockName: null },
  { exerciseName: 'Bayesian Cable Curl', slot: 2, substituteName: 'Incline DB Stretch Curl', blockName: null },

  // Upper Day - Ramping
  { exerciseName: '45\u00b0 Incline DB Press', slot: 1, substituteName: '45\u00b0 Incline Barbell Press', blockName: null },
  { exerciseName: '45\u00b0 Incline DB Press', slot: 2, substituteName: '45\u00b0 Incline Machine Press', blockName: null },
  { exerciseName: 'Pec Deck', slot: 1, substituteName: 'Cable Crossover Ladder', blockName: null },
  { exerciseName: 'Pec Deck', slot: 2, substituteName: 'Bottom-Half DB Flye', blockName: null },
  { exerciseName: 'Dual-Handle Lat Pulldown', slot: 1, substituteName: 'Wide-Grip Lat Pulldown', blockName: null },
  { exerciseName: 'Dual-Handle Lat Pulldown', slot: 2, substituteName: 'Wide-Grip Pull-Up', blockName: null },
  { exerciseName: 'Smith Machine Row', slot: 1, substituteName: 'Pendlay Deficit Row', blockName: null },
  { exerciseName: 'Smith Machine Row', slot: 2, substituteName: 'Single-Arm DB Row', blockName: null },

  // Lower Day - Foundation
  { exerciseName: 'Lying Leg Curl', slot: 1, substituteName: 'Seated Leg Curl', blockName: null },
  { exerciseName: 'Lying Leg Curl', slot: 2, substituteName: 'Nordic Ham Curl', blockName: null },
  { exerciseName: 'Smith Machine Squat', slot: 1, substituteName: 'DB Bulgarian Split Squat', blockName: null },
  { exerciseName: 'Smith Machine Squat', slot: 2, substituteName: 'High-Bar Back Squat', blockName: null },
  { exerciseName: 'Barbell RDL', slot: 1, substituteName: 'DB RDL', blockName: null },
  { exerciseName: 'Barbell RDL', slot: 2, substituteName: 'Snatch-Grip RDL', blockName: null },
  { exerciseName: 'Leg Extension', slot: 1, substituteName: 'Reverse Nordic', blockName: null },
  { exerciseName: 'Leg Extension', slot: 2, substituteName: 'Sissy Squat', blockName: null },
  { exerciseName: 'Standing Calf Raise', slot: 1, substituteName: 'Seated Calf Raise', blockName: null },
  { exerciseName: 'Standing Calf Raise', slot: 2, substituteName: 'Leg Press Calf Press', blockName: null },
  { exerciseName: 'Cable Crunch', slot: 1, substituteName: 'Decline Weighted Crunch', blockName: null },
  { exerciseName: 'Cable Crunch', slot: 2, substituteName: 'Machine Crunch', blockName: null },

  // Lower Day - Ramping
  { exerciseName: 'Smith Machine Static Lunge w/ Elevated Front Foot', slot: 1, substituteName: 'DB Bulgarian Split Squat', blockName: null },
  { exerciseName: 'Smith Machine Static Lunge w/ Elevated Front Foot', slot: 2, substituteName: 'High-Bar Back Squat', blockName: null },
  { exerciseName: '45\u00b0 Hyperextension', slot: 1, substituteName: 'Glute-Ham Raise', blockName: null },
  { exerciseName: '45\u00b0 Hyperextension', slot: 2, substituteName: 'Cable Pull-Through', blockName: null },
  { exerciseName: 'Leg Press Calf Press', slot: 1, substituteName: 'Seated Calf Raise', blockName: null },
  { exerciseName: 'Leg Press Calf Press', slot: 2, substituteName: 'Standing Calf Raise', blockName: null },
  { exerciseName: 'Machine Crunch', slot: 1, substituteName: 'Decline Weighted Crunch', blockName: null },
  { exerciseName: 'Machine Crunch', slot: 2, substituteName: 'Cable Crunch', blockName: null },

  // Pull Day - Foundation
  { exerciseName: 'Neutral-Grip Lat Pulldown', slot: 1, substituteName: 'Neutral-Grip Pull-Up', blockName: null },
  { exerciseName: 'Neutral-Grip Lat Pulldown', slot: 2, substituteName: 'Dual-Handle Lat Pulldown', blockName: null },
  { exerciseName: 'Chest-Supported Machine Row', slot: 1, substituteName: 'Chest-Supported T-Bar Row', blockName: null },
  { exerciseName: 'Chest-Supported Machine Row', slot: 2, substituteName: 'Incline Chest-Supported DB Row', blockName: null },
  { exerciseName: '1-Arm 45\u00b0 Cable Rear Delt Flye', slot: 1, substituteName: 'Rope Face Pull', blockName: null },
  { exerciseName: '1-Arm 45\u00b0 Cable Rear Delt Flye', slot: 2, substituteName: 'Reverse Pec Deck', blockName: null },
  { exerciseName: 'Machine Shrug', slot: 1, substituteName: 'Cable Paused Shrug-In', blockName: null },
  { exerciseName: 'Machine Shrug', slot: 2, substituteName: 'DB Shrug', blockName: null },
  { exerciseName: 'EZ-Bar Cable Curl', slot: 1, substituteName: 'EZ-Bar Curl', blockName: null },
  { exerciseName: 'EZ-Bar Cable Curl', slot: 2, substituteName: 'DB Curl', blockName: null },
  { exerciseName: 'Machine Preacher Curl', slot: 1, substituteName: 'EZ-Bar Preacher Curl', blockName: null },
  { exerciseName: 'Machine Preacher Curl', slot: 2, substituteName: 'DB Preacher Curl', blockName: null },

  // Pull Day - Ramping
  { exerciseName: 'Lean-Back Lat Pulldown', slot: 1, substituteName: 'Lean-Back Machine Pulldown', blockName: null },
  { exerciseName: 'Lean-Back Lat Pulldown', slot: 2, substituteName: 'Pull-Up', blockName: null },
  { exerciseName: 'Chest-Supported T-Bar Row', slot: 1, substituteName: 'Chest-Supported Machine Row', blockName: null },
  { exerciseName: 'Chest-Supported T-Bar Row', slot: 2, substituteName: 'Incline Chest-Supported DB Row', blockName: null },
  { exerciseName: 'Cable Paused Shrug-In', slot: 1, substituteName: 'Machine Shrug', blockName: null },
  { exerciseName: 'Cable Paused Shrug-In', slot: 2, substituteName: 'DB Shrug', blockName: null },
  { exerciseName: 'Cable Rope Hammer Curl', slot: 1, substituteName: 'DB Hammer Curl', blockName: null },
  { exerciseName: 'Cable Rope Hammer Curl', slot: 2, substituteName: 'Hammer Preacher Curl', blockName: null },
  { exerciseName: 'DB Concentration Curl', slot: 1, substituteName: 'Concentration Cable Curl', blockName: null },
  { exerciseName: 'DB Concentration Curl', slot: 2, substituteName: 'DB Preacher Curl', blockName: null },

  // Push Day - Foundation
  { exerciseName: 'Barbell Bench Press', slot: 1, substituteName: 'Machine Chest Press', blockName: null },
  { exerciseName: 'Barbell Bench Press', slot: 2, substituteName: 'DB Bench Press', blockName: null },
  { exerciseName: 'Machine Shoulder Press', slot: 1, substituteName: 'Cable Shoulder Press', blockName: null },
  { exerciseName: 'Machine Shoulder Press', slot: 2, substituteName: 'Seated DB Shoulder Press', blockName: null },
  { exerciseName: 'Bottom-Half DB Flye', slot: 1, substituteName: 'Bottom-Half Seated Cable Flye', blockName: null },
  { exerciseName: 'Bottom-Half DB Flye', slot: 2, substituteName: 'Low-to-High Cable Crossover', blockName: null },
  { exerciseName: 'Cable Triceps Kickback', slot: 1, substituteName: 'DB Triceps Kickback', blockName: null },
  { exerciseName: 'Cable Triceps Kickback', slot: 2, substituteName: 'Bench Dip', blockName: null },
  { exerciseName: 'Lying Leg Raise', slot: 1, substituteName: 'Hanging Leg Raise', blockName: null },
  { exerciseName: 'Lying Leg Raise', slot: 2, substituteName: 'Modified Candlestick', blockName: null },

  // Push Day - Ramping
  { exerciseName: 'Machine Chest Press', slot: 1, substituteName: 'Barbell Bench Press', blockName: null },
  { exerciseName: 'Machine Chest Press', slot: 2, substituteName: 'DB Bench Press', blockName: null },
  { exerciseName: 'Seated DB Shoulder Press', slot: 1, substituteName: 'Cable Shoulder Press', blockName: null },
  { exerciseName: 'Seated DB Shoulder Press', slot: 2, substituteName: 'Machine Shoulder Press', blockName: null },
  { exerciseName: 'Bottom-Half Seated Cable Flye', slot: 1, substituteName: 'Bottom-Half DB Flye', blockName: null },
  { exerciseName: 'Bottom-Half Seated Cable Flye', slot: 2, substituteName: 'Low-to-High Cable Crossover', blockName: null },
  { exerciseName: 'EZ-Bar Skull Crusher', slot: 1, substituteName: 'DB Skull Crusher', blockName: null },
  { exerciseName: 'EZ-Bar Skull Crusher', slot: 2, substituteName: 'Katana Triceps Extension', blockName: null },
  { exerciseName: 'Triceps Pressdown (Bar)', slot: 1, substituteName: 'Triceps Pressdown (Rope)', blockName: null },
  { exerciseName: 'Triceps Pressdown (Bar)', slot: 2, substituteName: 'DB Triceps Kickback', blockName: null },
  { exerciseName: 'Ab Wheel Rollout', slot: 1, substituteName: 'Swiss Ball Rollout', blockName: null },
  { exerciseName: 'Ab Wheel Rollout', slot: 2, substituteName: 'Long-Lever Plank', blockName: null },

  // Legs Day - Foundation
  { exerciseName: 'Leg Press', slot: 1, substituteName: 'Smith Machine Static Lunge', blockName: null },
  { exerciseName: 'Leg Press', slot: 2, substituteName: 'DB Walking Lunge', blockName: null },
  { exerciseName: 'Seated Leg Curl', slot: 1, substituteName: 'Lying Leg Curl', blockName: null },
  { exerciseName: 'Seated Leg Curl', slot: 2, substituteName: 'Nordic Ham Curl', blockName: null },
  { exerciseName: 'Walking Lunge', slot: 1, substituteName: 'DB Step-Up', blockName: 'Foundation' },
  { exerciseName: 'Walking Lunge', slot: 2, substituteName: 'Goblet Squat', blockName: 'Foundation' },
  { exerciseName: 'Machine Hip Abduction', slot: 1, substituteName: 'Cable Hip Abduction', blockName: null },
  { exerciseName: 'Machine Hip Abduction', slot: 2, substituteName: 'Lateral Band Walk', blockName: null },

  // Legs Day - Ramping
  { exerciseName: 'Hack Squat', slot: 1, substituteName: 'Leg Press', blockName: null },
  { exerciseName: 'Hack Squat', slot: 2, substituteName: 'DB Walking Lunge', blockName: null },
  { exerciseName: 'Walking Lunge', slot: 1, substituteName: 'Smith Machine Static Lunge', blockName: 'Ramping' },
  { exerciseName: 'Walking Lunge', slot: 2, substituteName: 'DB Static Lunge', blockName: 'Ramping' },
];

// ============================================================
// Program Blocks
// ============================================================

const BLOCKS: readonly Block[] = [
  {
    name: 'Foundation',
    weekStart: 1,
    weekEnd: 5,
    description:
      'Lower volume; technique mastery; 1 working set per exercise. Establishes consistency and baseline training volume.',
  },
  {
    name: 'Ramping',
    weekStart: 6,
    weekEnd: 12,
    description:
      'Higher volume; intensification techniques; 2\u20133 working sets per exercise. Builds work capacity and peaks intensity.',
  },
] as const;

// ============================================================
// Weekly Prescriptions (Fully Expanded)
// ============================================================

// ---- Foundation Block: Week 1 ----

const _w1_upper = trainingDay(1, 'Upper', 'StrengthFocus', [
  ex('45\u00b0 Incline Barbell Press', 1, 'N/A', 2, 3, 1, '6-8', null, '~6', '3-5 min'),
  ex('Cable Crossover Ladder', 2, 'N/A', 1, 2, 1, '8-10', null, '~7', '1-2 min'),
  ex('Wide-Grip Pull-Up', 3, 'N/A', 1, 2, 1, '8-10', null, '~6', '2-3 min'),
  ex('High-Cable Lateral Raise', 4, 'N/A', 1, 2, 1, '8-10', null, '~6', '1-2 min'),
  ex('Pendlay Deficit Row', 5, 'N/A', 1, 2, 1, '6-8', null, '~6', '2-3 min'),
  ex('Overhead Cable Triceps Extension (Bar)', 6, 'N/A', 1, 1, 1, '8-10', null, '~7', '1-2 min'),
  ex('Bayesian Cable Curl', 7, 'N/A', 1, 1, 1, '8-10', null, '~7', '1-2 min'),
]);

const _w1_lower = trainingDay(2, 'Lower', 'StrengthFocus', [
  ex('Lying Leg Curl', 1, 'N/A', 2, 2, 1, '8-10', null, '~7', '1-2 min'),
  ex('Smith Machine Squat', 2, 'N/A', 2, 4, 1, '6-8', null, '~6', '3-5 min'),
  ex('Barbell RDL', 3, 'N/A', 2, 4, 1, '6-8', null, '~6', '2-3 min'),
  ex('Leg Extension', 4, 'N/A', 1, 2, 1, '8-10', null, '~7', '1-2 min'),
  ex('Standing Calf Raise', 5, 'N/A', 1, 2, 1, '6-8', null, '~7', '1-2 min'),
  ex('Cable Crunch', 6, 'N/A', 1, 1, 1, '8-10', null, '~7', '1-2 min'),
]);

const _w1_pull = trainingDay(4, 'Pull', 'HypertrophyFocus', [
  ex('Neutral-Grip Lat Pulldown', 1, 'N/A', 2, 3, 1, '8-10', null, '~6', '2-3 min'),
  ex('Chest-Supported Machine Row', 2, 'N/A', 2, 3, 1, '8-10', null, '~6', '2-3 min'),
  ex('1-Arm 45\u00b0 Cable Rear Delt Flye', 3, 'N/A', 1, 2, 1, '10-12', null, '~7', '1-2 min'),
  ex('Machine Shrug', 4, 'N/A', 2, 3, 1, '10-12', null, '~6', '1-2 min'),
  ex('EZ-Bar Cable Curl', 5, 'N/A', 1, 1, 1, '10-12', null, '~7', '1-2 min'),
  ex('Machine Preacher Curl', 6, 'N/A', 1, 1, 1, '12-15', null, '~7', '1-2 min'),
]);

const _w1_push = trainingDay(5, 'Push', 'HypertrophyFocus', [
  ex('Barbell Bench Press', 1, 'N/A', 2, 4, 1, '8-10', null, '~6', '3-5 min'),
  ex('Machine Shoulder Press', 2, 'N/A', 2, 3, 1, '8-10', null, '~6', '2-3 min'),
  ex('Bottom-Half DB Flye', 3, 'N/A', 1, 2, 1, '10-12', null, '~7', '1-2 min'),
  ex('Cable Triceps Kickback', 4, 'N/A', 1, 1, 1, '12-15', null, '~7', '1-2 min'),
  ex('Lying Leg Raise', 5, 'N/A', 1, 2, 1, '10-20', null, '~7', '1-2 min'),
]);

const _w1_legs = trainingDay(6, 'Legs', 'HypertrophyFocus', [
  ex('Leg Press', 1, 'N/A', 2, 4, 1, '8-10', null, '~6', '2-3 min'),
  ex('Seated Leg Curl', 2, 'N/A', 1, 2, 1, '10-12', null, '~7', '1-2 min'),
  ex('Walking Lunge', 3, 'N/A', 2, 3, 1, '8-10', null, '~6', '2-3 min'),
  ex('Machine Hip Abduction', 4, 'N/A', 1, 2, 1, '10-12', null, '~7', '1-2 min'),
]);

// ---- Foundation Block: Week 2 ----
// Identical exercise list to W1 with RPE ~1 higher

const _w2_upper = trainingDay(1, 'Upper', 'StrengthFocus', [
  ex('45\u00b0 Incline Barbell Press', 1, 'N/A', 2, 3, 1, '6-8', null, '~7', '3-5 min'),
  ex('Cable Crossover Ladder', 2, 'N/A', 1, 2, 1, '8-10', null, '~8', '1-2 min'),
  ex('Wide-Grip Pull-Up', 3, 'N/A', 1, 2, 1, '8-10', null, '~7', '2-3 min'),
  ex('High-Cable Lateral Raise', 4, 'N/A', 1, 2, 1, '8-10', null, '~8', '1-2 min'),
  ex('Pendlay Deficit Row', 5, 'N/A', 1, 2, 1, '6-8', null, '~7', '2-3 min'),
  ex('Overhead Cable Triceps Extension (Bar)', 6, 'N/A', 1, 1, 1, '8-10', null, '~8', '1-2 min'),
  ex('Bayesian Cable Curl', 7, 'N/A', 1, 1, 1, '8-10', null, '~8', '1-2 min'),
]);

const _w2_lower = trainingDay(2, 'Lower', 'StrengthFocus', [
  ex('Lying Leg Curl', 1, 'N/A', 2, 2, 1, '8-10', null, '~8', '1-2 min'),
  ex('Smith Machine Squat', 2, 'N/A', 2, 4, 1, '6-8', null, '~7', '3-5 min'),
  ex('Barbell RDL', 3, 'N/A', 2, 4, 1, '6-8', null, '~7', '2-3 min'),
  ex('Leg Extension', 4, 'N/A', 1, 2, 1, '8-10', null, '~8', '1-2 min'),
  ex('Standing Calf Raise', 5, 'N/A', 1, 2, 1, '6-8', null, '~8', '1-2 min'),
  ex('Cable Crunch', 6, 'N/A', 1, 1, 1, '8-10', null, '~8', '1-2 min'),
]);

const _w2_pull = trainingDay(4, 'Pull', 'HypertrophyFocus', [
  ex('Neutral-Grip Lat Pulldown', 1, 'N/A', 2, 3, 1, '8-10', null, '~7', '2-3 min'),
  ex('Chest-Supported Machine Row', 2, 'N/A', 2, 3, 1, '8-10', null, '~7', '2-3 min'),
  ex('1-Arm 45\u00b0 Cable Rear Delt Flye', 3, 'N/A', 1, 2, 1, '10-12', null, '~8', '1-2 min'),
  ex('Machine Shrug', 4, 'N/A', 2, 3, 1, '10-12', null, '~7', '1-2 min'),
  ex('EZ-Bar Cable Curl', 5, 'N/A', 1, 1, 1, '10-12', null, '~8', '1-2 min'),
  ex('Machine Preacher Curl', 6, 'N/A', 1, 1, 1, '12-15', null, '~8', '1-2 min'),
]);

const _w2_push = trainingDay(5, 'Push', 'HypertrophyFocus', [
  ex('Barbell Bench Press', 1, 'N/A', 2, 4, 1, '8-10', null, '~7', '3-5 min'),
  ex('Machine Shoulder Press', 2, 'N/A', 2, 3, 1, '8-10', null, '~7', '2-3 min'),
  ex('Bottom-Half DB Flye', 3, 'N/A', 1, 2, 1, '10-12', null, '~8', '1-2 min'),
  ex('Cable Triceps Kickback', 4, 'N/A', 1, 1, 1, '12-15', null, '~8', '1-2 min'),
  ex('Lying Leg Raise', 5, 'N/A', 1, 2, 1, '10-20', null, '~8', '1-2 min'),
]);

const _w2_legs = trainingDay(6, 'Legs', 'HypertrophyFocus', [
  ex('Leg Press', 1, 'N/A', 2, 4, 1, '8-10', null, '~7', '2-3 min'),
  ex('Seated Leg Curl', 2, 'N/A', 1, 2, 1, '10-12', null, '~8', '1-2 min'),
  ex('Walking Lunge', 3, 'N/A', 2, 3, 1, '8-10', null, '~7', '2-3 min'),
  ex('Machine Hip Abduction', 4, 'N/A', 1, 2, 1, '10-12', null, '~8', '1-2 min'),
]);

// ---- Foundation Block: Week 3 ----
// 2 working sets, Set RPE ~7, Last RPE ~7 or ~8

const _w3_upper = trainingDay(1, 'Upper', 'StrengthFocus', [
  ex('45\u00b0 Incline Barbell Press', 1, 'N/A', 2, 3, 2, '6-8', '~7', '~7', '3-5 min'),
  ex('Cable Crossover Ladder', 2, 'N/A', 1, 2, 2, '8-10', '~7', '~8', '1-2 min'),
  ex('Wide-Grip Pull-Up', 3, 'N/A', 1, 2, 2, '8-10', '~7', '~7', '2-3 min'),
  ex('High-Cable Lateral Raise', 4, 'N/A', 1, 2, 2, '8-10', '~7', '~8', '1-2 min'),
  ex('Pendlay Deficit Row', 5, 'N/A', 1, 2, 2, '6-8', '~7', '~7', '2-3 min'),
  ex('Overhead Cable Triceps Extension (Bar)', 6, 'N/A', 1, 1, 2, '8-10', '~7', '~8', '1-2 min'),
  ex('Bayesian Cable Curl', 7, 'N/A', 1, 1, 2, '8-10', '~7', '~8', '1-2 min'),
]);

const _w3_lower = trainingDay(2, 'Lower', 'StrengthFocus', [
  ex('Lying Leg Curl', 1, 'N/A', 2, 2, 2, '8-10', '~7', '~7', '1-2 min'),
  ex('Smith Machine Squat', 2, 'N/A', 2, 4, 2, '6-8', '~7', '~7', '3-5 min'),
  ex('Barbell RDL', 3, 'N/A', 2, 4, 2, '6-8', '~7', '~7', '2-3 min'),
  ex('Leg Extension', 4, 'N/A', 1, 2, 2, '8-10', '~7', '~8', '1-2 min'),
  ex('Standing Calf Raise', 5, 'N/A', 1, 2, 2, '6-8', '~7', '~7', '1-2 min'),
  ex('Cable Crunch', 6, 'N/A', 1, 1, 2, '8-10', '~7', '~8', '1-2 min'),
]);

const _w3_pull = trainingDay(4, 'Pull', 'HypertrophyFocus', [
  ex('Neutral-Grip Lat Pulldown', 1, 'N/A', 2, 3, 2, '8-10', '~7', '~7', '2-3 min'),
  ex('Chest-Supported Machine Row', 2, 'N/A', 2, 3, 2, '8-10', '~7', '~7', '2-3 min'),
  ex('1-Arm 45\u00b0 Cable Rear Delt Flye', 3, 'N/A', 1, 2, 2, '10-12', '~7', '~8', '1-2 min'),
  ex('Machine Shrug', 4, 'N/A', 2, 3, 2, '10-12', '~7', '~7', '1-2 min'),
  ex('EZ-Bar Cable Curl', 5, 'N/A', 1, 1, 2, '10-12', '~7', '~8', '1-2 min'),
  ex('Machine Preacher Curl', 6, 'N/A', 1, 1, 2, '12-15', '~7', '~8', '1-2 min'),
]);

const _w3_push = trainingDay(5, 'Push', 'HypertrophyFocus', [
  ex('Barbell Bench Press', 1, 'N/A', 2, 4, 2, '8-10', '~7', '~7', '3-5 min'),
  ex('Machine Shoulder Press', 2, 'N/A', 2, 3, 2, '8-10', '~7', '~7', '2-3 min'),
  ex('Bottom-Half DB Flye', 3, 'N/A', 1, 2, 2, '10-12', '~7', '~8', '1-2 min'),
  ex('Cable Triceps Kickback', 4, 'N/A', 1, 1, 2, '12-15', '~7', '~8', '1-2 min'),
  ex('Lying Leg Raise', 5, 'N/A', 1, 2, 2, '10-20', '~7', '~8', '1-2 min'),
]);

const _w3_legs = trainingDay(6, 'Legs', 'HypertrophyFocus', [
  ex('Leg Press', 1, 'N/A', 2, 4, 2, '8-10', '~7', '~7', '2-3 min'),
  ex('Seated Leg Curl', 2, 'N/A', 1, 2, 2, '10-12', '~7', '~8', '1-2 min'),
  ex('Walking Lunge', 3, 'N/A', 2, 3, 2, '8-10', '~7', '~7', '2-3 min'),
  ex('Machine Hip Abduction', 4, 'N/A', 1, 2, 2, '10-12', '~7', '~8', '1-2 min'),
]);

// ---- Ramping Block: Week 6 (Deload / Technique Re-Acclimation) ----

const _w6_upper = trainingDay(1, 'Upper', 'StrengthFocus', [
  ex('45\u00b0 Incline DB Press', 1, 'N/A', 2, 3, 1, '8-10', null, '~6', '3-5 min'),
  ex('Pec Deck', 2, 'N/A', 1, 2, 1, '10-12', null, '~7', '1-2 min'),
  ex('Dual-Handle Lat Pulldown', 3, 'N/A', 1, 2, 1, '10-12', null, '~6', '2-3 min'),
  ex('High-Cable Lateral Raise', 4, 'N/A', 1, 2, 1, '10-12', null, '~6', '1-2 min'),
  ex('Smith Machine Row', 5, 'N/A', 1, 2, 1, '8-10', null, '~6', '2-3 min'),
  ex('Overhead Cable Triceps Extension (Bar)', 6, 'N/A', 1, 1, 1, '10-12', null, '~7', '1-2 min'),
  ex('Bayesian Cable Curl', 7, 'N/A', 1, 1, 1, '10-12', null, '~7', '1-2 min'),
]);

const _w6_lower = trainingDay(2, 'Lower', 'StrengthFocus', [
  ex('Lying Leg Curl', 1, 'N/A', 2, 2, 1, '10-12', null, '~7', '1-2 min'),
  ex('Smith Machine Static Lunge w/ Elevated Front Foot', 2, 'N/A', 2, 4, 1, '8-10', null, '~6', '3-5 min'),
  ex('45\u00b0 Hyperextension', 3, 'N/A', 2, 4, 1, '8-10', null, '~6', '2-3 min'),
  ex('Leg Extension', 4, 'N/A', 1, 2, 1, '10-12', null, '~7', '1-2 min'),
  ex('Leg Press Calf Press', 5, 'N/A', 1, 2, 1, '8-10', null, '~7', '1-2 min'),
  ex('Machine Crunch', 6, 'N/A', 1, 1, 1, '10-12', null, '~7', '1-2 min'),
]);

const _w6_pull = trainingDay(4, 'Pull', 'HypertrophyFocus', [
  ex('Lean-Back Lat Pulldown', 1, 'N/A', 2, 3, 1, '10-12', null, '~6', '2-3 min'),
  ex('Chest-Supported T-Bar Row', 2, 'N/A', 2, 3, 1, '10-12', null, '~6', '2-3 min'),
  ex('1-Arm 45\u00b0 Cable Rear Delt Flye', 3, 'N/A', 1, 2, 1, '12-15', null, '~7', '1-2 min'),
  ex('Cable Paused Shrug-In', 4, 'N/A', 2, 3, 1, '12-15', null, '~6', '1-2 min'),
  ex('Cable Rope Hammer Curl', 5, 'N/A', 1, 1, 1, '12-15', null, '~7', '1-2 min'),
  ex('DB Concentration Curl', 6, 'N/A', 1, 1, 1, '15-20', null, '~7', '1-2 min'),
]);

const _w6_push = trainingDay(5, 'Push', 'HypertrophyFocus', [
  ex('Machine Chest Press', 1, 'N/A', 2, 4, 1, '10-12', null, '~6', '3-5 min'),
  ex('Seated DB Shoulder Press', 2, 'N/A', 2, 3, 1, '10-12', null, '~6', '2-3 min'),
  ex('Bottom-Half Seated Cable Flye', 3, 'N/A', 1, 2, 1, '12-15', null, '~7', '1-2 min'),
  ex('High-Cable Lateral Raise', 4, 'N/A', 1, 1, 1, '12-15', null, '~7', '1-2 min'),
  ex('EZ-Bar Skull Crusher', 5, 'N/A', 1, 1, 1, '12-15', null, '~7', '1-2 min'),
  ex('Triceps Pressdown (Bar)', 6, 'N/A', 1, 1, 1, '15-20', null, '~7', '1-2 min'),
  ex('Ab Wheel Rollout', 7, 'N/A', 1, 2, 1, '12-15', null, '~7', '1-2 min'),
]);

const _w6_legs = trainingDay(6, 'Legs', 'HypertrophyFocus', [
  ex('Hack Squat', 1, 'N/A', 2, 4, 1, '10-12', null, '~6', '2-3 min'),
  ex('Seated Leg Curl', 2, 'N/A', 1, 2, 1, '12-15', null, '~7', '1-2 min'),
  ex('Walking Lunge', 3, 'N/A', 2, 3, 1, '10-12', null, '~6', '2-3 min'),
  ex('Machine Hip Abduction', 4, 'N/A', 1, 2, 1, '12-15', null, '~7', '1-2 min'),
  ex('Standing Calf Raise', 5, 'N/A', 1, 2, 1, '12-15', null, '~7', '1-2 min'),
]);

// ---- Ramping Block: Week 7 (Full Intensification) ----

const _w7_upper = trainingDay(1, 'Upper', 'StrengthFocus', [
  ex('45\u00b0 Incline DB Press', 1, 'N/A', 2, 3, 3, '8-10', '~7-8', '~7-8', '3-5 min'),
  ex('Pec Deck', 2, 'N/A', 1, 2, 2, '10-12', '~7-8', '~8-9', '1-2 min'),
  ex('Dual-Handle Lat Pulldown', 3, 'N/A', 1, 2, 3, '10-12', '~7-8', '~7-8', '2-3 min'),
  ex('High-Cable Lateral Raise', 4, 'Failure', 1, 2, 2, '10-12', '~8-9', '10', '1-2 min'),
  ex('Smith Machine Row', 5, 'N/A', 1, 2, 2, '8-10', '~7-8', '~7-8', '2-3 min'),
  ex('Overhead Cable Triceps Extension (Bar)', 6, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
  ex('Bayesian Cable Curl', 7, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
]);

const _w7_lower = trainingDay(2, 'Lower', 'StrengthFocus', [
  ex('Lying Leg Curl', 1, 'N/A', 2, 2, 2, '10-12', '~7-8', '~8-9', '1-2 min'),
  ex('Smith Machine Static Lunge w/ Elevated Front Foot', 2, 'N/A', 2, 4, 3, '8-10', '~7-8', '~7-8', '3-5 min'),
  ex('45\u00b0 Hyperextension', 3, 'N/A', 2, 4, 3, '8-10', '~7-8', '~7-8', '2-3 min'),
  ex('Leg Extension', 4, 'Failure', 1, 2, 2, '10-12', '~8-9', '10', '1-2 min'),
  ex('Leg Press Calf Press', 5, 'Failure', 1, 2, 2, '8-10', '~8-9', '10', '1-2 min'),
  ex('Machine Crunch', 6, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
]);

const _w7_pull = trainingDay(4, 'Pull', 'HypertrophyFocus', [
  ex('Lean-Back Lat Pulldown', 1, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
  ex('Chest-Supported T-Bar Row', 2, 'Failure', 2, 3, 3, '10-12', '~8-9', '10', '2-3 min'),
  ex('1-Arm 45\u00b0 Cable Rear Delt Flye', 3, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
  ex('Cable Paused Shrug-In', 4, 'N/A', 2, 3, 2, '12-15', '~7', '~8-9', '1-2 min'),
  ex('Cable Rope Hammer Curl', 5, 'N/A', 1, 1, 3, '12-15', '~7', '~8-9', '1-2 min'),
  ex('DB Concentration Curl', 6, 'Failure', 1, 1, 2, '15-20', '~8-9', '10', '1-2 min'),
]);

const _w7_push = trainingDay(5, 'Push', 'HypertrophyFocus', [
  ex('Machine Chest Press', 1, 'N/A', 2, 4, 3, '10-12', '~7-8', '~7-8', '3-5 min'),
  ex('Seated DB Shoulder Press', 2, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
  ex('Bottom-Half Seated Cable Flye', 3, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
  ex('High-Cable Lateral Raise', 4, 'Failure', 1, 1, 2, '12-15', '~8-9', '10', '1-2 min'),
  ex('EZ-Bar Skull Crusher', 5, 'N/A', 1, 1, 3, '12-15', '~7-8', '~8-9', '1-2 min'),
  ex('Triceps Pressdown (Bar)', 6, 'Failure', 1, 1, 2, '15-20', '~8-9', '10', '1-2 min'),
  ex('Ab Wheel Rollout', 7, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
]);

const _w7_legs = trainingDay(6, 'Legs', 'HypertrophyFocus', [
  ex('Hack Squat', 1, 'N/A', 2, 4, 3, '10-12', '~7-8', '~7-8', '2-3 min'),
  ex('Seated Leg Curl', 2, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
  ex('Walking Lunge', 3, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
  ex('Machine Hip Abduction', 4, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
  ex('Standing Calf Raise', 5, 'Failure', 1, 2, 3, '12-15', '~8-9', '10', '1-2 min'),
]);

// ---- Build Weeks ----
// Each week is fully expanded with its own independent day objects.

const week1: Week = {
  weekNumber: 1,
  blockName: 'Foundation',
  days: [_w1_upper, _w1_lower, cardioDay(), _w1_pull, _w1_push, _w1_legs, restDay()],
};

const week2: Week = {
  weekNumber: 2,
  blockName: 'Foundation',
  days: [_w2_upper, _w2_lower, cardioDay(), _w2_pull, _w2_push, _w2_legs, restDay()],
};

const week3: Week = {
  weekNumber: 3,
  blockName: 'Foundation',
  days: [_w3_upper, _w3_lower, cardioDay(), _w3_pull, _w3_push, _w3_legs, restDay()],
};

const week4: Week = {
  weekNumber: 4,
  blockName: 'Foundation',
  days: [
    trainingDay(1, 'Upper', 'StrengthFocus', [
      ex('45\u00b0 Incline Barbell Press', 1, 'N/A', 2, 3, 2, '6-8', '~7', '~7', '3-5 min'),
      ex('Cable Crossover Ladder', 2, 'N/A', 1, 2, 2, '8-10', '~7', '~8', '1-2 min'),
      ex('Wide-Grip Pull-Up', 3, 'N/A', 1, 2, 2, '8-10', '~7', '~7', '2-3 min'),
      ex('High-Cable Lateral Raise', 4, 'N/A', 1, 2, 2, '8-10', '~7', '~8', '1-2 min'),
      ex('Pendlay Deficit Row', 5, 'N/A', 1, 2, 2, '6-8', '~7', '~7', '2-3 min'),
      ex('Overhead Cable Triceps Extension (Bar)', 6, 'N/A', 1, 1, 2, '8-10', '~7', '~8', '1-2 min'),
      ex('Bayesian Cable Curl', 7, 'N/A', 1, 1, 2, '8-10', '~7', '~8', '1-2 min'),
    ]),
    trainingDay(2, 'Lower', 'StrengthFocus', [
      ex('Lying Leg Curl', 1, 'N/A', 2, 2, 2, '8-10', '~7', '~7', '1-2 min'),
      ex('Smith Machine Squat', 2, 'N/A', 2, 4, 2, '6-8', '~7', '~7', '3-5 min'),
      ex('Barbell RDL', 3, 'N/A', 2, 4, 2, '6-8', '~7', '~7', '2-3 min'),
      ex('Leg Extension', 4, 'N/A', 1, 2, 2, '8-10', '~7', '~8', '1-2 min'),
      ex('Standing Calf Raise', 5, 'N/A', 1, 2, 2, '6-8', '~7', '~7', '1-2 min'),
      ex('Cable Crunch', 6, 'N/A', 1, 1, 2, '8-10', '~7', '~8', '1-2 min'),
    ]),
    cardioDay(),
    trainingDay(4, 'Pull', 'HypertrophyFocus', [
      ex('Neutral-Grip Lat Pulldown', 1, 'N/A', 2, 3, 2, '8-10', '~7', '~7', '2-3 min'),
      ex('Chest-Supported Machine Row', 2, 'N/A', 2, 3, 2, '8-10', '~7', '~7', '2-3 min'),
      ex('1-Arm 45\u00b0 Cable Rear Delt Flye', 3, 'N/A', 1, 2, 2, '10-12', '~7', '~8', '1-2 min'),
      ex('Machine Shrug', 4, 'N/A', 2, 3, 2, '10-12', '~7', '~7', '1-2 min'),
      ex('EZ-Bar Cable Curl', 5, 'N/A', 1, 1, 2, '10-12', '~7', '~8', '1-2 min'),
      ex('Machine Preacher Curl', 6, 'N/A', 1, 1, 2, '12-15', '~7', '~8', '1-2 min'),
    ]),
    trainingDay(5, 'Push', 'HypertrophyFocus', [
      ex('Barbell Bench Press', 1, 'N/A', 2, 4, 2, '8-10', '~7', '~7', '3-5 min'),
      ex('Machine Shoulder Press', 2, 'N/A', 2, 3, 2, '8-10', '~7', '~7', '2-3 min'),
      ex('Bottom-Half DB Flye', 3, 'N/A', 1, 2, 2, '10-12', '~7', '~8', '1-2 min'),
      ex('Cable Triceps Kickback', 4, 'N/A', 1, 1, 2, '12-15', '~7', '~8', '1-2 min'),
      ex('Lying Leg Raise', 5, 'N/A', 1, 2, 2, '10-20', '~7', '~8', '1-2 min'),
    ]),
    trainingDay(6, 'Legs', 'HypertrophyFocus', [
      ex('Leg Press', 1, 'N/A', 2, 4, 2, '8-10', '~7', '~7', '2-3 min'),
      ex('Seated Leg Curl', 2, 'N/A', 1, 2, 2, '10-12', '~7', '~8', '1-2 min'),
      ex('Walking Lunge', 3, 'N/A', 2, 3, 2, '8-10', '~7', '~7', '2-3 min'),
      ex('Machine Hip Abduction', 4, 'N/A', 1, 2, 2, '10-12', '~7', '~8', '1-2 min'),
    ]),
    restDay(),
  ],
};

const week5: Week = {
  weekNumber: 5,
  blockName: 'Foundation',
  days: [
    trainingDay(1, 'Upper', 'StrengthFocus', [
      ex('45\u00b0 Incline Barbell Press', 1, 'N/A', 2, 3, 2, '6-8', '~7', '~7', '3-5 min'),
      ex('Cable Crossover Ladder', 2, 'N/A', 1, 2, 2, '8-10', '~7', '~8', '1-2 min'),
      ex('Wide-Grip Pull-Up', 3, 'N/A', 1, 2, 2, '8-10', '~7', '~7', '2-3 min'),
      ex('High-Cable Lateral Raise', 4, 'N/A', 1, 2, 2, '8-10', '~7', '~8', '1-2 min'),
      ex('Pendlay Deficit Row', 5, 'N/A', 1, 2, 2, '6-8', '~7', '~7', '2-3 min'),
      ex('Overhead Cable Triceps Extension (Bar)', 6, 'N/A', 1, 1, 2, '8-10', '~7', '~8', '1-2 min'),
      ex('Bayesian Cable Curl', 7, 'N/A', 1, 1, 2, '8-10', '~7', '~8', '1-2 min'),
    ]),
    trainingDay(2, 'Lower', 'StrengthFocus', [
      ex('Lying Leg Curl', 1, 'N/A', 2, 2, 2, '8-10', '~7', '~7', '1-2 min'),
      ex('Smith Machine Squat', 2, 'N/A', 2, 4, 2, '6-8', '~7', '~7', '3-5 min'),
      ex('Barbell RDL', 3, 'N/A', 2, 4, 2, '6-8', '~7', '~7', '2-3 min'),
      ex('Leg Extension', 4, 'N/A', 1, 2, 2, '8-10', '~7', '~8', '1-2 min'),
      ex('Standing Calf Raise', 5, 'N/A', 1, 2, 2, '6-8', '~7', '~7', '1-2 min'),
      ex('Cable Crunch', 6, 'N/A', 1, 1, 2, '8-10', '~7', '~8', '1-2 min'),
    ]),
    cardioDay(),
    trainingDay(4, 'Pull', 'HypertrophyFocus', [
      ex('Neutral-Grip Lat Pulldown', 1, 'N/A', 2, 3, 2, '8-10', '~7', '~7', '2-3 min'),
      ex('Chest-Supported Machine Row', 2, 'N/A', 2, 3, 2, '8-10', '~7', '~7', '2-3 min'),
      ex('1-Arm 45\u00b0 Cable Rear Delt Flye', 3, 'N/A', 1, 2, 2, '10-12', '~7', '~8', '1-2 min'),
      ex('Machine Shrug', 4, 'N/A', 2, 3, 2, '10-12', '~7', '~7', '1-2 min'),
      ex('EZ-Bar Cable Curl', 5, 'N/A', 1, 1, 2, '10-12', '~7', '~8', '1-2 min'),
      ex('Machine Preacher Curl', 6, 'N/A', 1, 1, 2, '12-15', '~7', '~8', '1-2 min'),
    ]),
    trainingDay(5, 'Push', 'HypertrophyFocus', [
      ex('Barbell Bench Press', 1, 'N/A', 2, 4, 2, '8-10', '~7', '~7', '3-5 min'),
      ex('Machine Shoulder Press', 2, 'N/A', 2, 3, 2, '8-10', '~7', '~7', '2-3 min'),
      ex('Bottom-Half DB Flye', 3, 'N/A', 1, 2, 2, '10-12', '~7', '~8', '1-2 min'),
      ex('Cable Triceps Kickback', 4, 'N/A', 1, 1, 2, '12-15', '~7', '~8', '1-2 min'),
      ex('Lying Leg Raise', 5, 'N/A', 1, 2, 2, '10-20', '~7', '~8', '1-2 min'),
    ]),
    trainingDay(6, 'Legs', 'HypertrophyFocus', [
      ex('Leg Press', 1, 'N/A', 2, 4, 2, '8-10', '~7', '~7', '2-3 min'),
      ex('Seated Leg Curl', 2, 'N/A', 1, 2, 2, '10-12', '~7', '~8', '1-2 min'),
      ex('Walking Lunge', 3, 'N/A', 2, 3, 2, '8-10', '~7', '~7', '2-3 min'),
      ex('Machine Hip Abduction', 4, 'N/A', 1, 2, 2, '10-12', '~7', '~8', '1-2 min'),
    ]),
    restDay(),
  ],
};

const week6: Week = {
  weekNumber: 6,
  blockName: 'Ramping',
  days: [_w6_upper, _w6_lower, cardioDay(), _w6_pull, _w6_push, _w6_legs, restDay()],
};

const week7: Week = {
  weekNumber: 7,
  blockName: 'Ramping',
  days: [_w7_upper, _w7_lower, cardioDay(), _w7_pull, _w7_push, _w7_legs, restDay()],
};

// Weeks 8-12 are identical to Week 7 in structure (fully expanded copies)
const week8: Week = {
  weekNumber: 8,
  blockName: 'Ramping',
  days: [
    trainingDay(1, 'Upper', 'StrengthFocus', [
      ex('45\u00b0 Incline DB Press', 1, 'N/A', 2, 3, 3, '8-10', '~7-8', '~7-8', '3-5 min'),
      ex('Pec Deck', 2, 'N/A', 1, 2, 2, '10-12', '~7-8', '~8-9', '1-2 min'),
      ex('Dual-Handle Lat Pulldown', 3, 'N/A', 1, 2, 3, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('High-Cable Lateral Raise', 4, 'Failure', 1, 2, 2, '10-12', '~8-9', '10', '1-2 min'),
      ex('Smith Machine Row', 5, 'N/A', 1, 2, 2, '8-10', '~7-8', '~7-8', '2-3 min'),
      ex('Overhead Cable Triceps Extension (Bar)', 6, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
      ex('Bayesian Cable Curl', 7, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
    ]),
    trainingDay(2, 'Lower', 'StrengthFocus', [
      ex('Lying Leg Curl', 1, 'N/A', 2, 2, 2, '10-12', '~7-8', '~8-9', '1-2 min'),
      ex('Smith Machine Static Lunge w/ Elevated Front Foot', 2, 'N/A', 2, 4, 3, '8-10', '~7-8', '~7-8', '3-5 min'),
      ex('45\u00b0 Hyperextension', 3, 'N/A', 2, 4, 3, '8-10', '~7-8', '~7-8', '2-3 min'),
      ex('Leg Extension', 4, 'Failure', 1, 2, 2, '10-12', '~8-9', '10', '1-2 min'),
      ex('Leg Press Calf Press', 5, 'Failure', 1, 2, 2, '8-10', '~8-9', '10', '1-2 min'),
      ex('Machine Crunch', 6, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
    ]),
    cardioDay(),
    trainingDay(4, 'Pull', 'HypertrophyFocus', [
      ex('Lean-Back Lat Pulldown', 1, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Chest-Supported T-Bar Row', 2, 'Failure', 2, 3, 3, '10-12', '~8-9', '10', '2-3 min'),
      ex('1-Arm 45\u00b0 Cable Rear Delt Flye', 3, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('Cable Paused Shrug-In', 4, 'N/A', 2, 3, 2, '12-15', '~7', '~8-9', '1-2 min'),
      ex('Cable Rope Hammer Curl', 5, 'N/A', 1, 1, 3, '12-15', '~7', '~8-9', '1-2 min'),
      ex('DB Concentration Curl', 6, 'Failure', 1, 1, 2, '15-20', '~8-9', '10', '1-2 min'),
    ]),
    trainingDay(5, 'Push', 'HypertrophyFocus', [
      ex('Machine Chest Press', 1, 'N/A', 2, 4, 3, '10-12', '~7-8', '~7-8', '3-5 min'),
      ex('Seated DB Shoulder Press', 2, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Bottom-Half Seated Cable Flye', 3, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('High-Cable Lateral Raise', 4, 'Failure', 1, 1, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('EZ-Bar Skull Crusher', 5, 'N/A', 1, 1, 3, '12-15', '~7-8', '~8-9', '1-2 min'),
      ex('Triceps Pressdown (Bar)', 6, 'Failure', 1, 1, 2, '15-20', '~8-9', '10', '1-2 min'),
      ex('Ab Wheel Rollout', 7, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
    ]),
    trainingDay(6, 'Legs', 'HypertrophyFocus', [
      ex('Hack Squat', 1, 'N/A', 2, 4, 3, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Seated Leg Curl', 2, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('Walking Lunge', 3, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Machine Hip Abduction', 4, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('Standing Calf Raise', 5, 'Failure', 1, 2, 3, '12-15', '~8-9', '10', '1-2 min'),
    ]),
    restDay(),
  ],
};

const week9: Week = {
  weekNumber: 9,
  blockName: 'Ramping',
  days: [
    trainingDay(1, 'Upper', 'StrengthFocus', [
      ex('45\u00b0 Incline DB Press', 1, 'N/A', 2, 3, 3, '8-10', '~7-8', '~7-8', '3-5 min'),
      ex('Pec Deck', 2, 'N/A', 1, 2, 2, '10-12', '~7-8', '~8-9', '1-2 min'),
      ex('Dual-Handle Lat Pulldown', 3, 'N/A', 1, 2, 3, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('High-Cable Lateral Raise', 4, 'Failure', 1, 2, 2, '10-12', '~8-9', '10', '1-2 min'),
      ex('Smith Machine Row', 5, 'N/A', 1, 2, 2, '8-10', '~7-8', '~7-8', '2-3 min'),
      ex('Overhead Cable Triceps Extension (Bar)', 6, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
      ex('Bayesian Cable Curl', 7, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
    ]),
    trainingDay(2, 'Lower', 'StrengthFocus', [
      ex('Lying Leg Curl', 1, 'N/A', 2, 2, 2, '10-12', '~7-8', '~8-9', '1-2 min'),
      ex('Smith Machine Static Lunge w/ Elevated Front Foot', 2, 'N/A', 2, 4, 3, '8-10', '~7-8', '~7-8', '3-5 min'),
      ex('45\u00b0 Hyperextension', 3, 'N/A', 2, 4, 3, '8-10', '~7-8', '~7-8', '2-3 min'),
      ex('Leg Extension', 4, 'Failure', 1, 2, 2, '10-12', '~8-9', '10', '1-2 min'),
      ex('Leg Press Calf Press', 5, 'Failure', 1, 2, 2, '8-10', '~8-9', '10', '1-2 min'),
      ex('Machine Crunch', 6, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
    ]),
    cardioDay(),
    trainingDay(4, 'Pull', 'HypertrophyFocus', [
      ex('Lean-Back Lat Pulldown', 1, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Chest-Supported T-Bar Row', 2, 'Failure', 2, 3, 3, '10-12', '~8-9', '10', '2-3 min'),
      ex('1-Arm 45\u00b0 Cable Rear Delt Flye', 3, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('Cable Paused Shrug-In', 4, 'N/A', 2, 3, 2, '12-15', '~7', '~8-9', '1-2 min'),
      ex('Cable Rope Hammer Curl', 5, 'N/A', 1, 1, 3, '12-15', '~7', '~8-9', '1-2 min'),
      ex('DB Concentration Curl', 6, 'Failure', 1, 1, 2, '15-20', '~8-9', '10', '1-2 min'),
    ]),
    trainingDay(5, 'Push', 'HypertrophyFocus', [
      ex('Machine Chest Press', 1, 'N/A', 2, 4, 3, '10-12', '~7-8', '~7-8', '3-5 min'),
      ex('Seated DB Shoulder Press', 2, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Bottom-Half Seated Cable Flye', 3, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('High-Cable Lateral Raise', 4, 'Failure', 1, 1, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('EZ-Bar Skull Crusher', 5, 'N/A', 1, 1, 3, '12-15', '~7-8', '~8-9', '1-2 min'),
      ex('Triceps Pressdown (Bar)', 6, 'Failure', 1, 1, 2, '15-20', '~8-9', '10', '1-2 min'),
      ex('Ab Wheel Rollout', 7, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
    ]),
    trainingDay(6, 'Legs', 'HypertrophyFocus', [
      ex('Hack Squat', 1, 'N/A', 2, 4, 3, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Seated Leg Curl', 2, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('Walking Lunge', 3, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Machine Hip Abduction', 4, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('Standing Calf Raise', 5, 'Failure', 1, 2, 3, '12-15', '~8-9', '10', '1-2 min'),
    ]),
    restDay(),
  ],
};

const week10: Week = {
  weekNumber: 10,
  blockName: 'Ramping',
  days: [
    trainingDay(1, 'Upper', 'StrengthFocus', [
      ex('45\u00b0 Incline DB Press', 1, 'N/A', 2, 3, 3, '8-10', '~7-8', '~7-8', '3-5 min'),
      ex('Pec Deck', 2, 'N/A', 1, 2, 2, '10-12', '~7-8', '~8-9', '1-2 min'),
      ex('Dual-Handle Lat Pulldown', 3, 'N/A', 1, 2, 3, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('High-Cable Lateral Raise', 4, 'Failure', 1, 2, 2, '10-12', '~8-9', '10', '1-2 min'),
      ex('Smith Machine Row', 5, 'N/A', 1, 2, 2, '8-10', '~7-8', '~7-8', '2-3 min'),
      ex('Overhead Cable Triceps Extension (Bar)', 6, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
      ex('Bayesian Cable Curl', 7, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
    ]),
    trainingDay(2, 'Lower', 'StrengthFocus', [
      ex('Lying Leg Curl', 1, 'N/A', 2, 2, 2, '10-12', '~7-8', '~8-9', '1-2 min'),
      ex('Smith Machine Static Lunge w/ Elevated Front Foot', 2, 'N/A', 2, 4, 3, '8-10', '~7-8', '~7-8', '3-5 min'),
      ex('45\u00b0 Hyperextension', 3, 'N/A', 2, 4, 3, '8-10', '~7-8', '~7-8', '2-3 min'),
      ex('Leg Extension', 4, 'Failure', 1, 2, 2, '10-12', '~8-9', '10', '1-2 min'),
      ex('Leg Press Calf Press', 5, 'Failure', 1, 2, 2, '8-10', '~8-9', '10', '1-2 min'),
      ex('Machine Crunch', 6, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
    ]),
    cardioDay(),
    trainingDay(4, 'Pull', 'HypertrophyFocus', [
      ex('Lean-Back Lat Pulldown', 1, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Chest-Supported T-Bar Row', 2, 'Failure', 2, 3, 3, '10-12', '~8-9', '10', '2-3 min'),
      ex('1-Arm 45\u00b0 Cable Rear Delt Flye', 3, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('Cable Paused Shrug-In', 4, 'N/A', 2, 3, 2, '12-15', '~7', '~8-9', '1-2 min'),
      ex('Cable Rope Hammer Curl', 5, 'N/A', 1, 1, 3, '12-15', '~7', '~8-9', '1-2 min'),
      ex('DB Concentration Curl', 6, 'Failure', 1, 1, 2, '15-20', '~8-9', '10', '1-2 min'),
    ]),
    trainingDay(5, 'Push', 'HypertrophyFocus', [
      ex('Machine Chest Press', 1, 'N/A', 2, 4, 3, '10-12', '~7-8', '~7-8', '3-5 min'),
      ex('Seated DB Shoulder Press', 2, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Bottom-Half Seated Cable Flye', 3, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('High-Cable Lateral Raise', 4, 'Failure', 1, 1, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('EZ-Bar Skull Crusher', 5, 'N/A', 1, 1, 3, '12-15', '~7-8', '~8-9', '1-2 min'),
      ex('Triceps Pressdown (Bar)', 6, 'Failure', 1, 1, 2, '15-20', '~8-9', '10', '1-2 min'),
      ex('Ab Wheel Rollout', 7, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
    ]),
    trainingDay(6, 'Legs', 'HypertrophyFocus', [
      ex('Hack Squat', 1, 'N/A', 2, 4, 3, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Seated Leg Curl', 2, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('Walking Lunge', 3, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Machine Hip Abduction', 4, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('Standing Calf Raise', 5, 'Failure', 1, 2, 3, '12-15', '~8-9', '10', '1-2 min'),
    ]),
    restDay(),
  ],
};

const week11: Week = {
  weekNumber: 11,
  blockName: 'Ramping',
  days: [
    trainingDay(1, 'Upper', 'StrengthFocus', [
      ex('45\u00b0 Incline DB Press', 1, 'N/A', 2, 3, 3, '8-10', '~7-8', '~7-8', '3-5 min'),
      ex('Pec Deck', 2, 'N/A', 1, 2, 2, '10-12', '~7-8', '~8-9', '1-2 min'),
      ex('Dual-Handle Lat Pulldown', 3, 'N/A', 1, 2, 3, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('High-Cable Lateral Raise', 4, 'Failure', 1, 2, 2, '10-12', '~8-9', '10', '1-2 min'),
      ex('Smith Machine Row', 5, 'N/A', 1, 2, 2, '8-10', '~7-8', '~7-8', '2-3 min'),
      ex('Overhead Cable Triceps Extension (Bar)', 6, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
      ex('Bayesian Cable Curl', 7, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
    ]),
    trainingDay(2, 'Lower', 'StrengthFocus', [
      ex('Lying Leg Curl', 1, 'N/A', 2, 2, 2, '10-12', '~7-8', '~8-9', '1-2 min'),
      ex('Smith Machine Static Lunge w/ Elevated Front Foot', 2, 'N/A', 2, 4, 3, '8-10', '~7-8', '~7-8', '3-5 min'),
      ex('45\u00b0 Hyperextension', 3, 'N/A', 2, 4, 3, '8-10', '~7-8', '~7-8', '2-3 min'),
      ex('Leg Extension', 4, 'Failure', 1, 2, 2, '10-12', '~8-9', '10', '1-2 min'),
      ex('Leg Press Calf Press', 5, 'Failure', 1, 2, 2, '8-10', '~8-9', '10', '1-2 min'),
      ex('Machine Crunch', 6, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
    ]),
    cardioDay(),
    trainingDay(4, 'Pull', 'HypertrophyFocus', [
      ex('Lean-Back Lat Pulldown', 1, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Chest-Supported T-Bar Row', 2, 'Failure', 2, 3, 3, '10-12', '~8-9', '10', '2-3 min'),
      ex('1-Arm 45\u00b0 Cable Rear Delt Flye', 3, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('Cable Paused Shrug-In', 4, 'N/A', 2, 3, 2, '12-15', '~7', '~8-9', '1-2 min'),
      ex('Cable Rope Hammer Curl', 5, 'N/A', 1, 1, 3, '12-15', '~7', '~8-9', '1-2 min'),
      ex('DB Concentration Curl', 6, 'Failure', 1, 1, 2, '15-20', '~8-9', '10', '1-2 min'),
    ]),
    trainingDay(5, 'Push', 'HypertrophyFocus', [
      ex('Machine Chest Press', 1, 'N/A', 2, 4, 3, '10-12', '~7-8', '~7-8', '3-5 min'),
      ex('Seated DB Shoulder Press', 2, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Bottom-Half Seated Cable Flye', 3, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('High-Cable Lateral Raise', 4, 'Failure', 1, 1, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('EZ-Bar Skull Crusher', 5, 'N/A', 1, 1, 3, '12-15', '~7-8', '~8-9', '1-2 min'),
      ex('Triceps Pressdown (Bar)', 6, 'Failure', 1, 1, 2, '15-20', '~8-9', '10', '1-2 min'),
      ex('Ab Wheel Rollout', 7, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
    ]),
    trainingDay(6, 'Legs', 'HypertrophyFocus', [
      ex('Hack Squat', 1, 'N/A', 2, 4, 3, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Seated Leg Curl', 2, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('Walking Lunge', 3, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Machine Hip Abduction', 4, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('Standing Calf Raise', 5, 'Failure', 1, 2, 3, '12-15', '~8-9', '10', '1-2 min'),
    ]),
    restDay(),
  ],
};

const week12: Week = {
  weekNumber: 12,
  blockName: 'Ramping',
  days: [
    trainingDay(1, 'Upper', 'StrengthFocus', [
      ex('45\u00b0 Incline DB Press', 1, 'N/A', 2, 3, 3, '8-10', '~7-8', '~7-8', '3-5 min'),
      ex('Pec Deck', 2, 'N/A', 1, 2, 2, '10-12', '~7-8', '~8-9', '1-2 min'),
      ex('Dual-Handle Lat Pulldown', 3, 'N/A', 1, 2, 3, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('High-Cable Lateral Raise', 4, 'Failure', 1, 2, 2, '10-12', '~8-9', '10', '1-2 min'),
      ex('Smith Machine Row', 5, 'N/A', 1, 2, 2, '8-10', '~7-8', '~7-8', '2-3 min'),
      ex('Overhead Cable Triceps Extension (Bar)', 6, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
      ex('Bayesian Cable Curl', 7, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
    ]),
    trainingDay(2, 'Lower', 'StrengthFocus', [
      ex('Lying Leg Curl', 1, 'N/A', 2, 2, 2, '10-12', '~7-8', '~8-9', '1-2 min'),
      ex('Smith Machine Static Lunge w/ Elevated Front Foot', 2, 'N/A', 2, 4, 3, '8-10', '~7-8', '~7-8', '3-5 min'),
      ex('45\u00b0 Hyperextension', 3, 'N/A', 2, 4, 3, '8-10', '~7-8', '~7-8', '2-3 min'),
      ex('Leg Extension', 4, 'Failure', 1, 2, 2, '10-12', '~8-9', '10', '1-2 min'),
      ex('Leg Press Calf Press', 5, 'Failure', 1, 2, 2, '8-10', '~8-9', '10', '1-2 min'),
      ex('Machine Crunch', 6, 'Failure', 1, 1, 2, '10-12', '~8-9', '10', '1-2 min'),
    ]),
    cardioDay(),
    trainingDay(4, 'Pull', 'HypertrophyFocus', [
      ex('Lean-Back Lat Pulldown', 1, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Chest-Supported T-Bar Row', 2, 'Failure', 2, 3, 3, '10-12', '~8-9', '10', '2-3 min'),
      ex('1-Arm 45\u00b0 Cable Rear Delt Flye', 3, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('Cable Paused Shrug-In', 4, 'N/A', 2, 3, 2, '12-15', '~7', '~8-9', '1-2 min'),
      ex('Cable Rope Hammer Curl', 5, 'N/A', 1, 1, 3, '12-15', '~7', '~8-9', '1-2 min'),
      ex('DB Concentration Curl', 6, 'Failure', 1, 1, 2, '15-20', '~8-9', '10', '1-2 min'),
    ]),
    trainingDay(5, 'Push', 'HypertrophyFocus', [
      ex('Machine Chest Press', 1, 'N/A', 2, 4, 3, '10-12', '~7-8', '~7-8', '3-5 min'),
      ex('Seated DB Shoulder Press', 2, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Bottom-Half Seated Cable Flye', 3, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('High-Cable Lateral Raise', 4, 'Failure', 1, 1, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('EZ-Bar Skull Crusher', 5, 'N/A', 1, 1, 3, '12-15', '~7-8', '~8-9', '1-2 min'),
      ex('Triceps Pressdown (Bar)', 6, 'Failure', 1, 1, 2, '15-20', '~8-9', '10', '1-2 min'),
      ex('Ab Wheel Rollout', 7, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
    ]),
    trainingDay(6, 'Legs', 'HypertrophyFocus', [
      ex('Hack Squat', 1, 'N/A', 2, 4, 3, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Seated Leg Curl', 2, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('Walking Lunge', 3, 'N/A', 2, 3, 2, '10-12', '~7-8', '~7-8', '2-3 min'),
      ex('Machine Hip Abduction', 4, 'Failure', 1, 2, 2, '12-15', '~8-9', '10', '1-2 min'),
      ex('Standing Calf Raise', 5, 'Failure', 1, 2, 3, '12-15', '~8-9', '10', '1-2 min'),
    ]),
    restDay(),
  ],
};

// ============================================================
// Export
// ============================================================

export interface Program {
  readonly exercises: Record<string, Exercise>;
  readonly substitutions: readonly Substitution[];
  readonly blocks: readonly Block[];
  readonly weeks: readonly Week[];
}

export const PROGRAM: Program = {
  exercises: EXERCISES,
  substitutions: SUBSTITUTIONS,
  blocks: BLOCKS,
  weeks: [
    week1,
    week2,
    week3,
    week4,
    week5,
    week6,
    week7,
    week8,
    week9,
    week10,
    week11,
    week12,
  ],
} as const;
