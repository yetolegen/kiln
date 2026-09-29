// All tunable constants (PLAN §10). Units are in the names. Starting values: tune from recordings.
export const CONFIG = {
  // geometry (game units)
  N_BANDS: 48,
  MIN_R: 0.25,
  MAX_R: 1.6,
  MIN_HEIGHT: 0.6,
  MAX_HEIGHT: 3.2,
  INIT_HEIGHT: 1.2,
  INIT_RADIUS: 1.0,
  INIT_THICKNESS: 0.35,
  MAX_THICKNESS: 0.35,
  MIN_THICKNESS: 0.08,
  THICKNESS_FLOOR: 0.02,
  MIN_INNER_RADIUS: 0.02,

  // contact
  REACH_ON_WORLD: 0.5,
  REACH_OFF_WORLD: 0.65,
  HAND_LEVEL_TOL_WORLD: 0.3,
  VERTICAL_CONTACT_MARGIN_WORLD: 0.1,
  RAISE_MARGIN_WORLD: 0.15,

  // rates (per second, or per unit of actual height change)
  SHAPE_GAIN: 3.0,
  SIGMA_BANDS: 4,
  MAX_DR_PER_S: 0.8,
  PULL_RATE: 0.6,
  PRESS_RATE: 0.6,
  THIN_PER_HEIGHT: 0.1,
  RADIAL_STRAIN_PER_HEIGHT: 0.08,
  WOBBLE_GROWTH_PER_S: 0.5,
  WOBBLE_DAMPING_PER_S: 4.0,
  DAMAGE_PER_S: 0.25,
  TEAR_THICKNESS_LOSS_PER_S: 0.03,
  REPAIR_THICKNESS_PER_S: 0.05,
  REPAIR_DAMAGE_PER_S: 0.4,

  // stability (game values)
  STABILITY_FACTOR: 3.0,
  OVERHANG_SLOPE_WORLD: 3.13,
  TOO_THIN_MARGIN: 0.03,
  RECOVERY_THICKNESS_MARGIN: 0.03,
  RECOVERY_HEIGHT_MARGIN: 0.1,
  RECOVERY_WOBBLE_MAX: 0.25,
  RECOVERY_ACTIVE_MS: 500,

  // hand features (tune from recordings)
  PINCH_ON: 0.35,
  PINCH_OFF: 0.45,
  FINGER_CURLED_ON: 0.35,
  FINGER_CURLED_OFF: 0.45,
  FINGER_OPEN_ON: 0.6,
  FINGER_OPEN_OFF: 0.5,
  MOTION_ON_PALM_PER_S: 0.4,
  MOTION_OFF_PALM_PER_S: 0.15,
  FULL_MOTION_PALM_PER_S: 1.5,
  FINGER_ANGLE_CURLED_DEG: 90, // extension = (min(PIP, DIP angle) − this) / range
  FINGER_ANGLE_RANGE_DEG: 70,
  CALIBRATION_STILL_PALM_PER_S: 0.5,
  REACQUIRE_JUMP_PALM: 2.0,    // palm moved farther than this between frames → new track
  HAND_OVERLAP_PALM: 0.6,      // two palms closer than this → ambiguous
  TEAR_SPEED_PALM_PER_S: 6.0,
  WOBBLE_TOL_PALM: 0.35,
  WOBBLE_CLEAR_TOL_PALM: 0.25,

  // time
  INFERENCE_MAX_HZ: 30,
  MAX_STEP_S: 0.05,
  MAX_INPUT_AGE_MS: 200,
  GESTURE_STABLE_MS: 120,
  REACQUIRE_MS: 150,
  CALIBRATION_STILL_MS: 800,
  HOLD_FIRE_MS: 1500,
  DWELL_MS: 900,
  TEAR_ENTER_MS: 120,
  WOBBLE_ENTER_MS: 500,
  RULE_CLEAR_MS: 250,
  HINT_COOLDOWN_MS: 3500,
  HINT_TTL_MS: 4000,
  TARGET_HINT_INTERVAL_MS: 3000,

  // score
  HEIGHT_SCORE_WEIGHT: 0.35,
  TARGET_RADIUS_TOL_WORLD: 0.05,
  TARGET_HEIGHT_TOL_WORLD: 0.08,

  // filter (applied to palm position in px, so beta is per px/s)
  ONE_EURO: { minCutoff: 1.0, beta: 0.02, dCutoff: 1.0 },

  // must equal the @mediapipe/tasks-vision version in package.json (checked by tests)
  MEDIAPIPE_VERSION: '1.0.1',
} as const;

export type Config = typeof CONFIG;
