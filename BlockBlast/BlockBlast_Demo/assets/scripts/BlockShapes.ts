import { Color } from 'cc';

export interface BlockShape {
    matrix: number[][];
    color:  Color;
}

export const BLOCK_COLORS: Color[] = [
    new Color(130, 170, 210, 255),
    new Color(210, 100,  80, 255),
    new Color(130, 185, 110, 255),
    new Color(220, 185,  80, 255),
    new Color(170, 130, 200, 255),
    new Color(220, 140,  70, 255),
    new Color(100, 185, 175, 255),
];

export const SHAPES_MATRIX: number[][][] = [
    // ── 1×1 ──────────────────────────────────────────── 0
    [[1]],                                              // 0:  1×1

    // ── LINE 1×2, 1×3, 1×4 ───────────────────────────── 1-6
    [[1, 1]],                                           // 1:  1×2 h
    [[1], [1]],                                         // 2:  1×2 v
    [[1, 1, 1]],                                        // 3:  1×3 h
    [[1], [1], [1]],                                    // 4:  1×3 v
    [[1, 1, 1, 1]],                                     // 5:  1×4 h
    [[1], [1], [1], [1]],                               // 6:  1×4 v

    // ── LINE 1×5 (late game) ─────────────────────────── 7-8
    [[1, 1, 1, 1, 1]],                                  // 7:  1×5 h
    [[1], [1], [1], [1], [1]],                          // 8:  1×5 v

    // ── SQUARE / RECT ────────────────────────────────── 9-11
    [[1, 1], [1, 1]],                                   // 9:  2×2
    [[1, 1, 1], [1, 1, 1]],                             // 10: 2×3
    [[1, 1], [1, 1], [1, 1]],                           // 11: 3×2

    // ── SMALL-L  (3 ô, 2×2 bound) ───────────────────── 12-15
    [[1, 1], [1, 0]],                                   // 12: corner TL
    [[1, 1], [0, 1]],                                   // 13: corner TR
    [[1, 0], [1, 1]],                                   // 14: corner BL
    [[0, 1], [1, 1]],                                   // 15: corner BR

    // ── L / J  (4 ô, 3×2 bound) ─────────────────────── 16-19
    [[1, 0], [1, 0], [1, 1]],                           // 16: L
    [[0, 1], [0, 1], [1, 1]],                           // 17: J
    [[1, 1], [1, 0], [1, 0]],                           // 18: L ngược
    [[1, 1], [0, 1], [0, 1]],                           // 19: J ngược

    // ── BIG-L  (5 ô, 3×3 bound) ─────────────────────── 20-23
    [[1, 0, 0], [1, 0, 0], [1, 1, 1]],                 // 20: Big-L BR
    [[0, 0, 1], [0, 0, 1], [1, 1, 1]],                 // 21: Big-J BL
    [[1, 1, 1], [0, 0, 1], [0, 0, 1]],                 // 22: Big-J TL
    [[1, 1, 1], [1, 0, 0], [1, 0, 0]],                 // 23: Big-L TR

    // ── T  (unlock trayIndex 8) ──────────────────────── 24-27
    [[1, 1, 1], [0, 1, 0]],                             // 24: T
    [[0, 1, 0], [1, 1, 1]],                             // 25: T ngược
    [[1, 0], [1, 1], [1, 0]],                           // 26: T trái
    [[0, 1], [1, 1], [0, 1]],                           // 27: T phải

    // ── S / Z  (unlock trayIndex 16) ────────────────── 28-29
    [[0, 1, 1], [1, 1, 0]],                             // 28: S
    [[1, 1, 0], [0, 1, 1]],                             // 29: Z

    // ── 3×3 FULL ─────────────────────────────────────── 30
    [[1, 1, 1], [1, 1, 1], [1, 1, 1]],                 // 30: 3×3
];

// ─── Trọng số cơ bản — cân bằng theo tỉ lệ Block Blast thực tế ──────
// 1×1 và 2×2 là backbone sớm; small-L chiếm ~20% pool; 1×5/T/S/Z/3×3 hiếm
const BASE_W = [
    8,  // 0:  1×1      — rất phổ biến đầu game, giảm dần
    5,  // 1:  1×2 h
    5,  // 2:  1×2 v
    6,  // 3:  1×3 h
    6,  // 4:  1×3 v
    4,  // 5:  1×4 h
    4,  // 6:  1×4 v
    0,  // 7:  1×5 h    — mở trayIndex 20
    0,  // 8:  1×5 v    — mở trayIndex 20
    8,  // 9:  2×2      — rất phổ biến xuyên suốt
    3,  // 10: 2×3
    3,  // 11: 3×2
    5,  // 12: small-L TL
    5,  // 13: small-L TR
    5,  // 14: small-L BL
    5,  // 15: small-L BR
    4,  // 16: L
    4,  // 17: J
    4,  // 18: L ngược
    4,  // 19: J ngược
    2,  // 20: Big-L BR
    2,  // 21: Big-J BL
    2,  // 22: Big-J TL
    2,  // 23: Big-L TR
    0,  // 24: T        — mở trayIndex 8
    0,  // 25: T ngược
    0,  // 26: T trái
    0,  // 27: T phải
    0,  // 28: S        — mở trayIndex 16
    0,  // 29: Z
    2,  // 30: 3×3      — luôn hiếm, tăng nhẹ late
];

function getWeight(idx: number, trayIndex: number): number {
    // 1×1: giảm dần 8→3 theo thời gian
    if (idx === 0) {
        return Math.max(3, 8 - Math.floor(trayIndex / 8));
    }
    // 1×5: mở trayIndex 20, tăng chậm
    if (idx === 7 || idx === 8) {
        if (trayIndex < 20) return 0;
        return Math.min(3, Math.floor((trayIndex - 20) / 8) + 1);
    }
    // T: mở trayIndex 8, tăng dần
    if (idx >= 24 && idx <= 27) {
        if (trayIndex < 8) return 0;
        return Math.min(4, Math.floor((trayIndex - 8) / 4) + 1);
    }
    // S/Z: mở trayIndex 16, tăng dần
    if (idx === 28 || idx === 29) {
        if (trayIndex < 16) return 0;
        return Math.min(4, Math.floor((trayIndex - 16) / 4) + 1);
    }
    // 3×3: luôn có, tăng nhẹ late
    if (idx === 30) {
        return Math.min(5, 2 + Math.floor(trayIndex / 20));
    }
    return BASE_W[idx];
}

function pickOne(
    pool:      { idx: number; w: number }[],
    validator?: (m: number[][]) => boolean,
): BlockShape | null {
    const total = pool.reduce((s, p) => s + p.w, 0);
    if (total === 0) return null;
    for (let a = 0; a < 30; a++) {
        let r = Math.random() * total;
        let chosen = pool[pool.length - 1].idx;
        for (const p of pool) { r -= p.w; if (r <= 0) { chosen = p.idx; break; } }
        const matrix = SHAPES_MATRIX[chosen];
        if (!validator || validator(matrix)) {
            const color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
            return { matrix, color };
        }
    }
    return null;
}

export function pickTray(
    count:           number,
    trayIndex:       number = 0,
    validator?:      (m: number[][]) => boolean,
    lineValidator?:  (m: number[][]) => boolean,
): BlockShape[] {
    const pool = SHAPES_MATRIX.map((_, i) => ({ idx: i, w: getWeight(i, trayIndex) }))
                              .filter(p => p.w > 0);

    const shapes: BlockShape[] = [];

    for (let i = 0; i < count; i++) {
        let s: BlockShape | null = null;

        // 2 khối đầu: ưu tiên chọn khối có thể clear line
        if (i < 2 && lineValidator) {
            s = pickOne(pool, m => (!validator || validator(m)) && lineValidator(m));
        }

        if (!s) {
            s = pickOne(pool, validator)
             ?? { matrix: [[1]], color: BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)] };
        }

        shapes.push(s);
    }

    return shapes;
}
