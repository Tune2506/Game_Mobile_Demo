export const EMOJIS = ['🍎','🚀','🐶','💎','🚗','⚽','🎸','⏰','🌞','🌙','🔥','💧','🎯','🎃','🌈','🎮','🎲','🌺','🦊','🦋','🍕'];

export interface LevelConfig {
    cols: number;
    rows: number;
    challengeTime: number;
    classicTime: number;
}

export const LEVELS: LevelConfig[] = [
    { cols: 2, rows: 2, challengeTime: 15,  classicTime: 30  },
    { cols: 4, rows: 3, challengeTime: 35,  classicTime: 60  },
    { cols: 4, rows: 4, challengeTime: 50,  classicTime: 90  },
    { cols: 4, rows: 5, challengeTime: 65,  classicTime: 120 },
    { cols: 4, rows: 6, challengeTime: 80,  classicTime: 150 },
    { cols: 4, rows: 7, challengeTime: 95,  classicTime: 180 },
    { cols: 5, rows: 6, challengeTime: 115, classicTime: 210 },
    { cols: 6, rows: 6, challengeTime: 135, classicTime: 240 },
    { cols: 6, rows: 7, challengeTime: 160, classicTime: 280 },
];
