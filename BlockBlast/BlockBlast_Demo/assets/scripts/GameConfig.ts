// Tất cả hằng số dùng chung toàn dự án BlockBlast
export const GameConfig = {
    // Lưới
    GRID_SIZE:           8,    // 8x8 ô
    CELL_SIZE:           80,   // px mỗi ô → lưới 640x640

    // Khay khối
    TRAY_COUNT:          3,

    // Điểm số
    POINT_PER_CELL:      3,    // mỗi ô đặt xuống (tăng từ 1 → 3)
    LINE_BASE:           200,  // hệ số xóa line: n*(n+1)/2 * LINE_BASE (tăng từ 100 → 200)
    COMBO_MAX:           10,
    PERFECT_CLEAR_BONUS: 600,  // thưởng dọn sạch bàn (tăng từ 300 → 600)

    // Hiển thị ô
    CELL_SCALE:          0.93, // scale mỗi cell → tạo gap ~6px giữa các ô

    // Tween
    SNAP_DURATION:       0.18, // giây tween khối trở về khay

    // Animation
    CELL_POP_STAGGER:    0.025, // delay giữa các ô trong anim đặt khối (A1)
    LINE_WAVE_STAGGER:   0.030, // delay mỗi ô trong wave clear (A2)
    TRAY_SLIDE_DURATION: 0.28,  // thời gian slide-in khay mới (A3)
    SCORE_FLOAT_RISE:    90,    // pixel số điểm bay lên (A4)
} as const;
