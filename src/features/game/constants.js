export const MAP_WIDTH = 3200;
export const MAP_HEIGHT = 3200;
export const UNIT_SELECTION_RADIUS = 12;
export const UNIT_CLICK_RADIUS = 14;
export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:10000";
export const STARTING_RESOURCES = 8000;

export const INITIAL_UNITS = [];

export const INITIAL_OBSTACLES = [
  { id: "rock-1", x: 640, y: 510, width: 350, height: 290 },
  { id: "rock-2", x: 1470, y: 1250, width: 320, height: 440 },
  { id: "rock-3", x: 2190, y: 890, width: 420, height: 300 },
  { id: "rock-4", x: 850, y: 2350, width: 480, height: 290 },
  { id: "rock-5", x: 2600, y: 2600, width: 200, height: 300 },
];

export const INITIAL_TEAM_SELECTIONS = {
  blue: { socketId: null, isOnline: false, hasDeployed: false },
  red: { socketId: null, isOnline: false, hasDeployed: false },
};

export const INITIAL_LAYER3_BATTLE = {
  status: "idle",
  battleId: null,
  queueLength: 0,
  hex: null,
  maxDurationSeconds: 180,
  countdownEndsAtTick: null,
  startedAtTick: null,
  endsAtTick: null,
  blueArmy: null,
  redArmy: null,
};

export const UNIT_DISPLAY_INFO = {
  rifleman: {
    name: "Rifleman",
    shortLabel: "R",
    attributes: ["Light", "Infantry"],
    damageDescription: "5.56mm Rifle",
    cost: 100,
  },
  antiTank: {
    name: "Anti-Tank",
    shortLabel: "AT",
    attributes: ["Light", "Infantry"],
    damageDescription: "AT Missile",
    cost: 250,
  },
  armoredCar: {
    name: "Armored Car",
    shortLabel: "AC",
    attributes: ["Armored", "Vehicle"],
    damageDescription: "20mm Autocannon",
    cost: 500,
  },
  lightTank: {
    name: "Light Tank",
    shortLabel: "LT",
    attributes: ["Armored", "Vehicle"],
    damageDescription: "75mm Cannon",
    cost: 850,
  },
  heavyTank: {
    name: "Heavy Tank",
    shortLabel: "HT",
    attributes: ["Armored", "Vehicle heavy"],
    damageDescription: "120mm Heavy Cannon",
    cost: 1500,
  },
  fighter: {
    name: "Fighter",
    shortLabel: "F",
    attributes: ["Air", "Plane"],
    damageDescription: "Twin Machine Guns",
    cost: 1000,
  },
  bomber: {
    name: "Bomber",
    shortLabel: "B",
    attributes: ["Air", "Plane", "Siege"],
    damageDescription: "Heavy Gravity Bombs",
    cost: 1800,
  },
  antiAir: {
    name: "Anti-Air",
    shortLabel: "AA",
    attributes: ["Armored", "Vehicle"],
    damageDescription: "AA Missiles",
    cost: 350,
  },
  attackHelicopter: {
    name: "Attack Helicopter",
    shortLabel: "AH",
    attributes: ["Air", "Helicopter"],
    damageDescription: "M134 Minigun",
    cost: 700,
  },
};

export const FALLBACK_UNIT_DISPLAY = {
  name: "Unknown",
  shortLabel: "?",
  attributes: [],
  damageDescription: "Unknown",
};
