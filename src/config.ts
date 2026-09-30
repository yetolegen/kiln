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
  MAX_THICKNESS: 0.35,         // renderer only (legacy hollow look); the core derives thickness from the cavity
  MIN_THICKNESS: 0.08,         // wall thinner than this collapses (thinWall)
  THICKNESS_FLOOR: 0.02,       // geometric minimum wall; the cavity is clamped to keep it
  MIN_INNER_RADIUS: 0.02,      // renderer only
  FLOOR_WORLD: 0.15,           // clay kept under the cavity

  // Every placement tolerance below = max(*_WORLD floor, *_PALM × the user's palm length in world units),
  // so it works close to or far from the camera. (Test palm: 100 px / 180 px per unit ≈ 0.56 world.)
  // contact
  REACH_ON_PALM: 0.9,
  REACH_OFF_PALM: 1.2,
  HAND_LEVEL_TOL_PALM: 0.7,
  VERTICAL_CONTACT_MARGIN_PALM: 0.4,
  REACH_ON_WORLD: 0.5,
  REACH_OFF_WORLD: 0.65,
  HAND_LEVEL_TOL_WORLD: 0.3,
  VERTICAL_CONTACT_MARGIN_WORLD: 0.1,
  RAISE_MARGIN_WORLD: 0.15,

  // rates (per second, or per unit of actual height change)
  SHAPE_GAIN: 3.0,
  SIGMA_BANDS: 4,
  MAX_DR_PER_S: 0.8,
  RADIAL_STRAIN_PER_HEIGHT: 0.08,   // lifting narrows, compressing widens (per unit of height change)
  WOBBLE_GROWTH_PER_S: 0.5,
  WOBBLE_DAMPING_PER_S: 4.0,        // while compressing the rim
  DAMAGE_PER_S: 0.25,
  REPAIR_DAMAGE_PER_S: 0.4,         // while compressing the rim, upper half only

  // v4 one-hand actions (docs/GESTURES_V4.md); seed values, tune from recordings
  SUPPORT_REACH_WORLD: 0.45,        // support palm within this of either side wall
  SUPPORT_REACH_PALM: 1.1,
  SUPPORT_Y_MARGIN_WORLD: 0.1,      // ... and within the pot height ± this
  SUPPORT_Y_MARGIN_PALM: 0.5,
  ZONE_PALM: 0.8,                   // lift / rim / indent / opening zones grow by this many palms
  HORIZONTAL_TOL_DEG: 50,           // wrist → middle knuckle within this of horizontal = "flat hand"
  FORESHORTENED_RATIO: 0.55,        // ... or that vector shorter than this × palm: fingers point at the camera, also flat
  THUMB_DOWN_TOL_DEG: 50,           // thumb knuckle → tip within this of straight down
  FINGERS_CURLED_MEAN: 0.72,        // thumb-down: mean finger extension below this (curled fingers read 0.36–0.66 on a real webcam)
  STILL_PALM_PER_S: 0.35,           // "holding still" for the lift and rim holds
  LIFT_HOLD_MS: 3000,
  LIFT_ZONE_BELOW_WORLD: 0.5,       // active palm height at the base: from −this ...
  LIFT_ZONE_ABOVE_WORLD: 0.3,       // ... to +this
  LIFT_ZONE_X_MARGIN_WORLD: 0.2,    // ... and within the base radius + this
  LIFT_MIN_PALM_PER_S: 0.15,        // armed: rising slower than this doesn't lift
  LIFT_MAX_PALM_PER_S: 1.0,         // armed: rising faster than this cancels (re-hold needed)
  LIFT_GAIN: 1.0,                   // pot height gained per world unit the hand rises
  INDENT_TOL_X_WORLD: 0.3,          // thumb tip within this of the axis ...
  INDENT_TOL_Y_WORLD: 0.3,          // ... and of the top surface
  INDENT_TRAVEL_WORLD: 0.08,        // downward thumb travel that makes the indentation
  INDENT_DEPTH_WORLD: 0.12,         // the indentation is exactly this shallow, however often repeated
  INDENT_RADIUS_WORLD: 0.12,
  OPEN_ZONE_MARGIN_WORLD: 0.25,     // pinch point within the opening + this
  OPEN_ACQUIRE_MS: 200,             // pinch held this long before spreading counts
  OPEN_MAX_SPREAD_PER_S: 1.5,       // pinch ratio growth per second; faster cancels
  OPEN_RADIUS_PER_SPAN: 0.5,        // cavity radius gained per unit of pinch-ratio spread
  OPEN_DEPTH_PER_SPAN: 0.9,         // cavity depth gained per unit of pinch-ratio spread
  OPEN_MIN_WALL_WORLD: 0.12,        // opening alone never thins the wall below this
  RIM_ABOVE_WORLD: 0.4,             // rim hand: palm between top − RIM_BELOW and top + RIM_ABOVE
  RIM_BELOW_WORLD: 0.15,
  RIM_X_MARGIN_WORLD: 0.3,          // ... and within the top radius + this
  COMPRESS_HOLD_MS: 500,
  COMPRESS_MIN_PALM_PER_S: 0.1,     // armed: moving down slower than this doesn't compress
  COMPRESS_MAX_PALM_PER_S: 1.0,     // faster than this stops the action
  COMPRESS_GAIN: 0.6,               // height removed per world unit the hand moves down
  COMPRESS_MAX_TOTAL_WORLD: 0.3,    // per engagement
  COMPRESS_SMOOTH_PER_S: 2.0,       // upper-profile smoothing rate while compressing
  COMPRESS_CAVITY_SHRINK_PER_WORLD: 0.3, // opening narrows (wall strengthens) per unit compressed
  NEAR_MISS_LATCH_MS: 1500,         // "too fast" hints stay this long after the cancel

  // stability (game values)
  STABILITY_FACTOR: 3.0,
  OVERHANG_SLOPE_WORLD: 3.13,
  TOO_THIN_MARGIN: 0.03,
  RECOVERY_THICKNESS_MARGIN: 0.03,
  RECOVERY_HEIGHT_MARGIN: 0.1,
  RECOVERY_WOBBLE_MAX: 0.25,
  RECOVERY_ACTIVE_MS: 500,
  SAG_HEIGHT_FACTOR: 0.7,             // collapse: height → 0.7·height, once
  SAG_SMOOTH_PASSES: 3,               // collapse: box-blur passes over the upper half
  OVERHANG_SMOOTH_PER_S: 0.5,         // max radius removed per second at a too-steep band
  TEAR_SIGMA_BANDS: 1.5,              // spread of tear damage around the band
  WOBBLE_CENTERED_DAMPING_PER_S: 0.4, // slow wobble decay while shaping centred (rim compression is faster)

  // hand features (tune from recordings)
  PINCH_ON: 0.35,
  PINCH_OFF: 0.45,
  FINGER_CURLED_ON: 0.35,
  FINGER_CURLED_OFF: 0.45,
  FINGER_OPEN_ON: 0.6,
  FINGER_OPEN_OFF: 0.5,
  // pointing = index clearly straighter than the AVERAGE of the other three. Measured on a real laptop
  // webcam (Acer A715, daylight): relaxed curled fingers read 0.36–0.66, index 1.00, so an absolute
  // "others ≤ 0.35" rule never fired; the margin was 0.44–0.56. An open palm has a margin of ~0.1.
  POINT_MARGIN_ON: 0.35,
  POINT_MARGIN_OFF: 0.25,
  FINGER_ANGLE_CURLED_DEG: 90, // extension = (min(PIP, DIP angle) − this) / range
  FINGER_ANGLE_RANGE_DEG: 70,
  CALIBRATION_STILL_PALM_PER_S: 0.5,
  REACQUIRE_JUMP_PALM: 2.0,    // palm moved farther than this between frames → new track
  HAND_OVERLAP_PALM: 0.6,      // two palms closer than this → ambiguous
  TEAR_SPEED_PALM_PER_S: 6.0,
  WOBBLE_TOL_PALM: 0.35,
  WOBBLE_CLEAR_TOL_PALM: 0.25,

  // near-miss: only with evidence of an attempt
  PINCH_LOOSE_MAX: 0.6,            // pinch ratio still counted as "almost pinching"
  ATTEMPT_ZONE_X_WORLD: 2.5,       // hands farther than this from the axis aren't attempting anything
  ATTEMPT_ZONE_Y_MARGIN_WORLD: 0.5,
  NEAR_MISS_MIN_MS: 400,           // pose held this long before we coach it
  NOT_MOVING_MS: 800,

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
  OVERHANG_ENTER_MS: 200,
  ONE_HAND_ENTER_MS: 700,
  NO_HANDS_ENTER_MS: 1500,
  TRACKING_UNCERTAIN_ENTER_MS: 300,
  RULE_CLEAR_MS: 250,
  RULE_UPDATE_MS: 500,             // min interval between 'update' events of one episode
  HINT_COOLDOWN_MS: 3500,
  HINT_TTL_MS: 4000,
  TARGET_HINT_INTERVAL_MS: 3000,
  FIRING_MS: 4000,

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
