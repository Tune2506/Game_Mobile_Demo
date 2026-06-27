# PLAN.md — BlockBlast Demo

> Tài liệu này mô tả toàn bộ thiết kế game, quyết định kỹ thuật và định hướng
> phát triển. Dùng cùng với CLAUDE.md để bắt đầu một phiên làm việc mới mà
> không cần giải thích lại từ đầu.

---

## 1. TỔNG QUAN GAME

**Tên**: BlockBlast Demo  
**Thể loại**: Casual puzzle — xếp khối trên lưới  
**Nền tảng mục tiêu**: Mobile (iOS/Android), portrait 720 × 1280  
**Đối tượng**: Casual gamer, mọi lứa tuổi, chơi lướt 5–15 phút/phiên  

**Ý tưởng cốt lõi**: Clone chơi-ngay của Block Blast (trên store), không có màn
chơi, không hết thời gian — người chơi đặt khối cho đến khi không còn chỗ.

**Điểm hấp dẫn cần giữ**:
- Cảm giác "click" khi xóa được một hàng/cột — thỏa mãn tức thì.
- Combo dây chuyền (x2, x3…) khi nhiều hàng xóa liên tiếp — tạo cao trào.
- Khó dần tự nhiên: không cần level số — board tự chật hẹp hơn.
- Không bao giờ bế tắc hoàn toàn một cách tức ngột — luôn có ít nhất một khối
  đặt được trong khay.

---

## 2. GAMEPLAY CHÍNH

### Vòng lặp (gameplay loop)

```
Nhận khay 3 khối → Kéo đặt lên lưới 8×8 → Tự động xóa hàng/cột đầy
→ Cộng điểm (+ combo nếu xóa liên tiếp) → Hết khay → Nhận khay mới → lặp lại
```

Khi không còn đặt được khối nào trong khay → **Game Over**.

### Từng phút người chơi làm gì

- Quan sát 3 khối trong khay, ước lượng cái nào xóa được hàng ngay.
- Kéo (drag-and-drop) khối lên lưới — ghost preview hiển thị vị trí sẽ đặt.
- Tìm thứ tự đặt 3 khối để chuỗi xóa tạo ra combo.
- Phá kỷ lục điểm cao của bản thân.

### Thắng / thua

- **Không có thắng** — game chạy vô hạn, mục tiêu là điểm càng cao càng tốt.
- **Thua** khi không còn vị trí nào trên lưới cho bất kỳ khối còn lại trong khay.
- Màn hình Game Over hiện điểm ván + best score, nút **Restart**.

### Cảm giác muốn mang lại

Nhịp độ nhanh, hành động đơn giản nhưng chiến thuật sâu (quyết định thứ tự đặt
3 khối), tưởng thưởng thường xuyên (âm thanh/hoạt ảnh khi xóa line), leo thang
dần dần chứ không thất bại đột ngột.

---

## 3. CÁC HỆ THỐNG

### 3.1 Lưới (Grid System)

- Kích thước cố định: **8 × 8 ô**.
- Mỗi ô = 80px logic; gap giữa các ô tạo bằng `CELL_SCALE = 0.93`.
- Cell có 2 trạng thái: **empty** (sprite mờ, alpha ~60) và **filled** (sprite
  màu đặc, `setFilled(color)`).
- Khi một hàng hoặc cột đầy đủ 8 ô → xóa ngay sau khi đặt khối.
- Xóa đồng thời nhiều hàng + cột trong một lượt là bình thường.

### 3.2 Hệ thống khay (Tray)

- Mỗi lượt cấp **3 khối** cùng lúc.
- Người chơi đặt theo thứ tự tùy ý.
- Hết cả 3 → spawn khay mới ngay lập tức.
- **Validator**: mỗi khối trong khay phải đặt được ít nhất một chỗ trên lưới
  hiện tại (tránh bị thua ngay lập tức do spawn khối không thể đặt).
- **Line validator** (bổ sung): 2 trong 3 khối ưu tiên là loại có thể xóa ít
  nhất 1 hàng/cột khi đặt — thiết kế này tăng cơ hội combo x2 một cách tự nhiên
  mà không bảo đảm (fallback về chọn ngẫu nhiên nếu grid chưa đủ đầy).

### 3.3 Hệ thống khối (Block Shapes)

31 shape tổng cộng, chia nhóm theo độ phức tạp:

| Nhóm | Indices | Unlock | Ghi chú |
|------|---------|--------|---------|
| 1×1 đơn | 0 | Luôn có | Weight 8→3 giảm dần theo thời gian |
| Line 1×2, 1×3, 1×4 | 1–6 | Luôn có | Backbone combo |
| Line 1×5 | 7–8 | trayIndex ≥ 20 | Late game |
| 2×2, 2×3, 3×2 | 9–11 | Luôn có | 2×2 rất phổ biến (weight 8) |
| Small-L (3 ô) | 12–15 | Luôn có | 4 góc xoay, nhóm phổ biến nhất (~20%) |
| L/J (4 ô) | 16–19 | Luôn có | |
| Big-L (5 ô) | 20–23 | Luôn có | Hiếm hơn (weight 2) |
| T-shape | 24–27 | trayIndex ≥ 8 | Tăng dần tới weight 4 |
| S/Z | 28–29 | trayIndex ≥ 16 | |
| 3×3 đầy | 30 | Luôn có | Luôn hiếm (weight 2→5) |

**Triết lý phân bổ**: bắt chước phân phối thực tế của Block Blast trên store.
1×1 và 2×2 chiếm nhiều nhất đầu game (easy fill), small-L là nhóm phổ biến nhất
tổng thể. Khối phức tạp mở dần, không xuất hiện shock ngay đầu.

**Cơ chế weight động**: `getWeight(idx, trayIndex)` — weight mỗi shape thay đổi
theo số lần spawn tray (`trayIndex`), không theo điểm. Lý do: tránh người chơi
bị "tụt điểm" đột ngột, độ khó leo thang theo thời gian thực tế chơi.

### 3.4 Hệ thống điểm

| Nguồn | Công thức |
|-------|-----------|
| Đặt khối | `số_ô × 3` |
| Xóa n hàng/cột | `n×(n+1)/2 × 200 × combo_multiplier` |
| Dọn sạch toàn bàn | +600 điểm (Perfect Clear) |

- **Combo** tăng 1 mỗi lần xóa line, reset về 0 khi đặt khối không xóa gì.
- `COMBO_MAX = 10` — hệ số nhân tối đa.

### 3.5 Hệ thống Combo & Visual Feedback

- Combo ≥ 1: hiện label "Combo ×N", tự ẩn sau 1.2s.
- Combo ≥ 2: **tất cả ô filled trên bàn đổi màu ngẫu nhiên** (combo ripple),
  mỗi ô delay ngẫu nhiên 0–0.5s tạo hiệu ứng lan tỏa.
- Lý do thiết kế: visual reward khi chain combo, không thêm ô mới hay particle
  tránh nhầm lẫn.

### 3.6 Best Score

- Lưu vào `sys.localStorage` với key `blockblast_highscore`.
- HUD game: hiện `Best: N` màu trắng khi chưa phá kỷ lục; **chuyển vàng và
  update real-time** khi điểm vượt qua best score hiện tại.
- Màu vàng dùng `Color(255, 215, 0)` — lưu màu gốc từ editor khi `start()`.

### 3.7 Drag & Drop

- **Touch Start**: block nâng lên 120px ngay lập tức (lift offset) để ngón tay
  không che khuất vị trí đặt; scale tween 0.75 → 1.0 trong 0.1s (`backOut`).
- **Touch Move**: cập nhật vị trí trực tiếp (không lerp — lag-free); highlight
  ô sẽ bị chiếm; ghost preview (semi-transparent) hiện tại vị trí đặt; F5 làm
  sáng các hàng/cột sẽ bị xóa nếu đặt tại đây.
- **Touch End**: nếu hợp lệ → đặt block + callback; nếu không → tween về khay
  với `backOut` easing.
- **Scale động trong khay**: `min(195 / (cols × 80), 195 / (rows × 80), 0.75)`
  — tránh khối dài (1×5) tràn sang slot bên cạnh.

### 3.8 Hoạt ảnh (Animation)

| Tên | Khi nào | Mô tả |
|-----|---------|-------|
| `popIn` | Đặt khối xuống lưới | Mỗi ô scale 0→1.25→1, stagger 25ms |
| `clearLineAnim` | Xóa hàng/cột | Scale 1→1.2→0, wave trái→phải / trên→dưới |
| `slideIn` | Spawn khay mới | 3 khối trượt lên từ dưới, stagger 80ms |
| `scoreFloat` | Cộng điểm | Label "+N" bay lên 90px rồi fade |
| `comboLabel` | Combo ≥ 2 | Scale bounce rồi tự ẩn sau 1.2s |
| `breakAndFall` | Game over | Ô filled rơi xuống -220px + fade, stagger theo cột×0.08 + hàng×0.03 |
| `boardCollapse → panel` | Game over | Board collapse xong mới hiện popup |
| `fadeIn` | Load GameScene | Overlay mờ dần từ đen sang trong 0.45s |

**Quyết định quan trọng**: `breakAndFall` dùng trực tiếp `this.node` (không
clone). Clone-based version đã từng thử nhưng revert vì khối clone bị sai kích
thước. Node-based giữ nền kẻ vì `cell.clear()` gọi trong `.call()` sau khi
anim kết thúc.

---

## 4. THẾ GIỚI / CỐT TRUYỆN / NHÂN VẬT

Không có cốt truyện, không có nhân vật. Aesthetic: gỗ tối (dark wood) ấm,
khối màu vividly colored trên nền nâu. Gần giống Block Blast thực nhưng không
copy trực tiếp.

---

## 5. NỘI DUNG ĐÃ CÓ vs CHƯA CÓ

### Đã hoàn thiện

- **IntroScene**: Title, best score, nút Play, fade-in transition sang GameScene.
- **GameScene**: Lưới 8×8, khay 3 khối, drag-drop, ghost preview, line clear,
  combo, score float, best score real-time, game over panel, restart.
- **Settings popup**: Nút gear icon, panel overlay, nút Close / Replay / Back to
  Menu. Replay gọi `director.loadScene('GameScene')`.
- **Toàn bộ 31 shapes** với weight động và unlock schedule.
- **Smart tray generation**: line validator ưu tiên combo opportunities.
- **Dynamic tray scaling**: tránh overlap giữa các slot.
- **LineClearFX**: component đã wired trong Editor — FXNode gán vào GridNode,
  ParticlePrefab (ParticleSystem2D + particle_dot) và FlashPrefab (Sprite 80×80
  + UIOpacity 220) đã assign đủ. Gravity particle chỉnh về (0, -150).

### Đã fix (2026-06-18)

- `restart()` dùng `gridManager.resetGrid()` thay vì hack bracket notation `['cells']`.
- "Perfect!" và "Combo ×N" không còn conflict — dùng biến `floatPrefix`, chỉ 1
  lời gọi `showScoreFloat()` duy nhất, hiện "Perfect! +N" trong scoreFloatLabel.
- Xóa 3 hằng số dead `SCORE_UNLOCK_MED/HARD/MAX` khỏi GameConfig.
- Xóa tham số `score` thừa khỏi `pickTray()`.
- Xóa `@property fadeOverlay` và `UIOpacity` import thừa khỏi IntroManager.
- Xóa lời gọi `refreshTrayPos()` thừa trong `spawnTray()`.
- `showComboUI()`: thêm `tween(this.comboLabel.node).stop()` trước scale tween — ngăn stack khi combo nhanh.
- Xóa `GameConfig.HIGHLIGHT_ALPHA` — dead constant không dùng.
- Thêm flag `isGameOver` + guard trong `onBlockPlaced()` — block input khi board collapse đang chạy.

### Đã hoàn thiện (2026-06-19)

**Âm thanh (AudioManager.ts — file mới)**
- Static singleton, 2 `AudioSource` trên cùng node: `sources[0]` BGM loop, `sources[1]` SFX oneshot.
- 9 clip property: `menuBgm`, `bgm`, `pickupSfx`, `placeSfx`, `clearSfx`, `comboSfx`, `perfectSfx`, `gameOverSfx`, `clickSfx`.
- Toggle `sfxOn` / `bgmOn` lưu vào localStorage (`bb_sfx`, `bb_bgm`), đọc lại khi khởi động.
- `playMenuBGM()` riêng cho IntroScene; `playBGM()` riêng cho GameScene — mỗi scene có AudioManager node của riêng mình, không dùng persist.
- Tích hợp GameManager: `playBGM()` trong `initGame()`, `playPlace()` + `playClear()` + `playPerfect()` + `playCombo()` + `stopBGM()` + `playGameOver()` tại đúng thời điểm.
- Tích hợp TrayBlock: `playPickup()` khi touch start kéo khối.
- Click sound (`playClick()`) trên tất cả nút: Play, mở/đóng Settings, Replay, Back to Home.
- Browser autoplay fix: `input.once(TOUCH_START)` fallback trong `IntroManager.start()` — nhạc menu phát khi tương tác đầu tiên nếu bị browser block.

**Haptic Feedback**
- `vibrate(30ms)` khi đặt khối, `vibrate(60ms)` khi clear line, `vibrate(150ms)` khi game over.
- Wrapped trong `try/catch` — không crash trên web preview.

**LineClearFX Polish**
- `flashPool`: reuse Node thay vì `instantiate+destroy` mỗi lần — không GC spike khi xóa 8 ô cùng lúc.
- Flash tint: màu ô +80 mỗi channel (lighten) thay vì trắng tinh — hiệu ứng sát màu thực hơn.

**Toggle Settings (ToggleSwitch.ts — file mới)**
- iOS-style sliding toggle: track (Sprite đổi màu ON/OFF) + knob (tween trượt).
- `@property knobOffset: number` — chỉnh trong Editor để khớp track width.
- SoundToggle (SFX) + BGMToggle trong SettingsPanel, wired qua `SettingsManager.start()`.

**Best Score lưu ngay**
- `updateScoreUI()` lưu vào localStorage ngay khi score vượt record — không mất điểm khi Replay hoặc Back to Home giữa chừng.

### Còn để ngỏ

- `LineClearFX` chưa test thực tế trên thiết bị — particle và flash render đúng chưa xác nhận.
- Chưa test trên thiết bị thật (chỉ test trong browser/editor).
- Chưa có file audio thực tế cho các SFX còn trống (tuỳ tiến độ chuẩn bị asset).

### Chưa có (ngoài phạm vi demo hiện tại)

- Daily challenge / mission system.
- Leaderboard / cloud save.
- Monetization (ads, IAP).

---

## 6. KỸ THUẬT

**Engine**: Cocos Creator 3.8+, TypeScript  
**Resolution**: 720 × 1280 (Portrait)  

### Cấu trúc file chính

```
assets/scripts/
├── GameConfig.ts       — Toàn bộ hằng số (GRID_SIZE, CELL_SIZE, timing...)
├── BlockShapes.ts      — 31 shapes, BLOCK_COLORS, pickTray() với line validator
├── Cell.ts             — Component mỗi ô: setFilled, clear, popIn, clearLineAnim,
│                         breakAndFall, changeColor, setClearPreview
├── GridManager.ts      — Build lưới, canPlace, place, checkAndClearLines,
│                         highlight, ghost, canClearLineAnywhere, getAllFilledCells
├── TrayBlock.ts        — Drag-drop, ghost preview, dynamic scale, lift offset
│                         playPickup() khi touch start
├── GameManager.ts      — Game loop, score, combo, spawnTray, triggerGameOver,
│                         best score real-time (lưu localStorage ngay khi vượt record)
├── AudioManager.ts     — Singleton SFX+BGM: menuBgm/bgm loop, 7 SFX clip,
│                         toggle sfx/bgm với localStorage, playClick()
├── ToggleSwitch.ts     — iOS-style toggle: track tint + knob tween, knobOffset @property
├── IntroManager.ts     — Best score display, nút Play, fade transition,
│                         playMenuBGM + autoplay fallback (input.once TOUCH_START)
├── SettingsManager.ts  — Popup settings, replay, back to intro, click sound,
│                         soundToggle + bgmToggle wired qua start()
└── LineClearFX.ts      — Particle+Flash FX khi clear line: pool pattern, flash tint màu ô
```

### Điểm kỹ thuật cần nhớ

- **Circular import**: TrayBlock KHÔNG import GameManager. Dùng callback
  `setOnPlaced(cb)` để GameManager nhận event.
- **UIOpacity race condition**: `clearLineAnim` dùng scale only (không UIOpacity)
  để tránh conflict với `breakAndFall` đang chạy UIOpacity trên cùng node.
- **Scene transition**: `director.loadScene()` với `scheduleOnce` delay nhỏ
  tránh black screen.
- **tween.stop()**: luôn gọi trước khi bắt đầu tween mới trên cùng node,
  tránh conflict animation.

---

## 7. VẤN ĐỀ & CÂU HỎI ĐANG MỞ

### Lỗi đã biết / giới hạn

- `LineClearFX` chưa được xác nhận hoạt động đúng trên thiết bị thật.
- Chưa có âm thanh — trải nghiệm thiếu phản hồi.
- Chưa test portrait mode trên nhiều tỉ lệ màn hình khác nhau (iPhone SE vs
  iPhone 14 Pro Max).

### Câu hỏi thiết kế còn phân vân

- **Lift offset 120px**: có thể quá nhiều hoặc quá ít tùy kích thước tay người
  dùng — chưa có user test.
- **Line validator 2/3 ưu tiên**: có làm game quá dễ không? Cần playtesting.
- **breakAndFall node-based vs clone-based**: node-based đơn giản hơn nhưng
  clone-based cho phép nền giữ nguyên hoàn hảo hơn. Hiện tại `clear()` gọi
  sau khi anim xong — nếu anim bị interrupt thì cell có thể không reset đúng.
- **Combo ripple màu ngẫu nhiên**: đẹp về mặt visual nhưng có thể gây khó đọc
  vị trí các khối màu đang có trên bàn.

---

## 8. ĐỊNH HƯỚNG PHÁT TRIỂN

Sắp xếp theo độ ưu tiên từ cao xuống thấp:

### ✅ Đã hoàn thành

1. ~~**Âm thanh (SFX + BGM)**~~ — AudioManager.ts, menuBgm/bgm, 7 SFX, click sound, toggle.
2. ~~**Haptic feedback**~~ — vibrate 30/60/150ms tại đúng sự kiện.
3. ~~**Polish LineClearFX**~~ — flash pool, flash tint màu ô.

### Ưu tiên trung bình (tăng retention)

4. **Score animation khi phá kỷ lục**: hiệu ứng "NEW RECORD!" riêng biệt,
   khác với combo label thông thường.
5. **Pause mid-game**: nút pause trong gameplay, không chỉ trong settings.
6. **Undo một nước**: cho phép hoàn tác lần đặt cuối cùng (một lần/khay).
   Tăng accessibility nhưng giảm challenge — cân nhắc optional.
7. **Hint system**: gợi ý vị trí đặt tốt nhất khi người chơi không tìm được.

### Ưu tiên thấp (content mở rộng)

8. **Daily Challenge**: một cấu hình bàn cố định mỗi ngày, leaderboard toàn cầu.
9. **Theme/Skin**: bộ màu sắc khác nhau (dark mode, ocean, neon…).
10. **Cloud save**: đồng bộ best score qua nhiều thiết bị.
11. **Thống kê**: tổng số line cleared, best combo, số ván đã chơi.
