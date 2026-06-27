# PLAN.md — Sliding Puzzle Game Design Document

---

## 1. TỔNG QUAN GAME

**Tên game:** Sliding Puzzle (8-puzzle / N-puzzle)
**Thể loại:** Casual puzzle – xếp hình trượt
**Nền tảng:** Mobile (web-mobile build qua Cocos Creator)

**Ý tưởng cốt lõi:**
Người chơi nhận một tấm ảnh bị cắt thành N×N mảnh và xáo trộn ngẫu nhiên. Một ô bị bỏ trống. Mục tiêu là trượt các mảnh về đúng vị trí để phục hồi ảnh gốc, trong thời gian ngắn nhất có thể.

**Điểm khác biệt so với sliding puzzle thông thường:**
- Thay vì hiển thị số, game dùng **ảnh thật** làm mảnh ghép — tạo cảm giác thỏa mãn hơn khi hoàn thành
- Có hệ thống **Gợi ý thông minh (IDA\* + Linear Conflict)** — tính trước toàn bộ lời giải tối ưu ngay sau khi xáo trộn, người chơi bấm Gợi ý nhiều lần là giải được hoàn toàn
- **Kỷ lục cá nhân** lưu theo từng độ khó — tạo động lực chơi lại để phá record
- Ảnh puzzle khác nhau theo độ khó (Easy/Medium/Hard) — mỗi độ khó có "nhân vật" riêng

**Đối tượng người chơi:** Casual, mọi lứa tuổi, chơi phiên ngắn 1–5 phút

---

## 2. GAMEPLAY CHÍNH

**Vòng lặp gameplay (loop):**
```
Vào màn chơi → tiles rơi xuống (entrance anim) → đếm giờ bắt đầu
→ người chơi click tile để trượt → kiểm tra thắng
→ [thắng] WinPopup hiện với bounce anim + confetti → so sánh kỷ lục → bấm "Chơi lại" hoặc "Quay lại"
→ [chưa thắng] tiếp tục trượt hoặc bấm Gợi ý
```

**Người chơi làm gì từng phút:**
- Quan sát ảnh gốc (thumbnail góc trái hoặc bấm nút "Ảnh gốc" để xem to 2 giây)
- Click vào tile kề ô trống để trượt (âm thanh slide), click tile không kề để nghe click
- Đối chiếu vị trí tile với ảnh gốc để định hướng
- Dùng Gợi ý khi bí (viền vàng nhấp nháy chỉ tile cần click tiếp)
- Cố hoàn thành nhanh hơn kỷ lục đang hiển thị
- Bật/tắt nhạc qua nút Speaker góc màn hình (trạng thái nhớ xuyên scene)

**Mục tiêu thắng:** Đưa tất cả mảnh về đúng vị trí, ô trống về **góc trên bên phải** (vị trí [0, N-1])

**Cảm giác muốn mang lại:**
- Satisfying khi mảnh cuối về đúng chỗ (fanfare + confetti)
- Hồi hộp khi sắp phá kỷ lục
- Không frustrating nhờ hệ thống gợi ý luôn sẵn sàng

---

## 3. CÁC HỆ THỐNG

### 3.1 Hệ thống lưới (Grid)
- Lưới N×N, mỗi ô chứa số tile (1 → N²−1) hoặc 0 (ô trống)
- **Vị trí giải xong:** ô trống ở góc trên phải [0, N-1]; tile 1 ở [0,0], tile 2 ở [0,1]... điền theo thứ tự trái→phải, trên→dưới, bỏ qua vị trí ô trống
- Xáo trộn bằng cách thực hiện 150–250 bước trượt hợp lệ ngẫu nhiên từ trạng thái đã giải → **đảm bảo 100% giải được**
- Không dùng kiểm tra inversion (dễ sai với vị trí ô trống không chuẩn)

### 3.2 Hệ thống hình ảnh
- Mỗi tile hiển thị một **mảnh cắt từ SpriteFrame gốc** theo đúng vị trí đã giải của tile đó
- Cắt tính bằng pixel: `pieceW = tex.width / n`, căn chỉnh theo `Rect`
- Thumbnail (ảnh nhỏ, góc trái) luôn hiển thị ảnh gốc để người chơi tham khảo
- Button "Ảnh gốc": bấm để xem ảnh to trên overlay, tự ẩn sau **2 giây**
- WinPopup cũng hiển thị lại ảnh gốc đầy đủ

### 3.3 Hệ thống đồng hồ & Kỷ lục
- Timer đếm lên từ 0, cập nhật mỗi frame (`update(dt)`)
- Định dạng hiển thị: `MM:SS` với 2 chữ số (padStart)
- Label format: `"Thời gian\n00:00"` và `"Kỷ lục\n00:00"` (xuống dòng để phân tầng visual)
- Kỷ lục lưu vào `sys.localStorage` với key `SlidingPuzzle_BestTime_${gridSize}` — riêng cho từng kích thước lưới
  - Easy (2×2): key `_2`, Medium (3×3): key `_3`, Hard (4×4): key `_4`
- Khi phá kỷ lục: hiện badge "Mới!" (Sprite ảnh tải lên, không dùng Label) trên màn chơi và trong WinPopup

### 3.4 Hệ thống Gợi ý (IDA\* + Linear Conflict)
- Thuật toán **IDA\* (Iterative Deepening A\*)** với heuristic **Manhattan + Linear Conflict**
  - Manhattan incremental O(1) mỗi bước DFS
  - Linear Conflict tính tại root → nâng ngưỡng ban đầu → thường tìm lời giải ngay vòng đầu
  - Timeout 200ms → fallback **beam search** depth-7, beam width-25 (không phải 1 bước greedy đơn thuần)
- **Pre-compute ngay sau shuffle** (frame tiếp theo sau startGame) → lời giải sẵn sàng trước khi người chơi kịp bấm → Gợi ý hiện tức thì
- Lưu toàn bộ lời giải vào `_hintSolution[]`, theo dõi `_hintStep` — bấm Gợi ý nhiều lần tuần tự giải xong puzzle
- Tracking bước gợi ý dựa trên **tile thực sự di chuyển** (không phụ thuộc trạng thái blink animation) — đúng tile → tiếp tục; sai tile → tính lại
- Hiển thị: **viền vàng nhấp nháy 3 lần** (tween UIOpacity 6 pha × 0.25s) trên tile cần click

### 3.5 Hệ thống Âm thanh
- **SoundManager** (static utility): quản lý trạng thái muted toàn cục, lưu vào `sys.localStorage` key `SlidingPuzzle_Muted`
- BGM: AudioSource loop, volume=0 khi muted (không dừng hẳn → resume ngay khi unmute)
- SFX: `playOneShot()` — click (bấm button/tile không kề), slide (trượt tile hợp lệ), win (fanfare khi thắng)
- Âm thanh click phát **trước** khi chuyển scene (scheduleOnce 0.1s delay)
- **Nút Mute (Speaker)**: có ở cả 4 scene (Menu + Easy + Medium + Hard), icon bật/tắt chuyển đổi; xử lý touch trực tiếp qua `Node.EventType.TOUCH_END` (không dùng cc.Button Click Event để tránh bug hit area shrink)

### 3.6 Hiệu ứng Confetti khi thắng
- **ConfettiEffect** component: spawn 45 mảnh confetti màu sắc (đỏ/vàng/xanh/tím/cam) bằng Graphics + UIOpacity + tween thuần code — không cần asset
- Spawn stagger 0.035s/mảnh, rơi từ trên xuống với xoay ngẫu nhiên, fade out ở 65% quãng đường
- Gắn vào `ConfettiLayer` node (hoặc fallback về parent của WinPopup)
- Dừng ngay khi Restart để tránh confetti cũ hiện ở ván tiếp theo

### 3.7 Hệ thống Animation
- **Board entrance:** Mỗi khi bắt đầu/restart, các tile rơi từ trên xuống (DROP=130px) với stagger 0.045s/tile theo thứ tự hàng-cột + fade in. Timer chỉ bắt đầu sau khi animation xong.
- **Win popup:** Bounce scale từ 0.15 → 1.06 → 1.0 với `backOut` easing + fade in 0.22s
- **Scene transition:** Fade-to-black (SceneTransition utility) + MenuAnim outro chạy song song
- **Menu intro:** Block rơi bounceOut, Title pop-in backOut, 3 nút slide in từ 2 bên xen kẽ; idle loop float + pulse

### 3.10 Nhiều ảnh puzzle & Animation nút
- **Nhiều ảnh puzzle:** `puzzleImages: SpriteFrame[]` thay thế `puzzleImage` đơn. Mỗi `startGame()` gọi `_pickRandomImage()` — chọn random nhưng loại trừ `_currentImageIndex` để không trùng ảnh liên tiếp. Fallback hiển thị số nếu array rỗng.
- **ButtonAnim:** Component `ButtonAnim.ts` gắn vào bất kỳ nút nào — dùng TOUCH_START/END/CANCEL trực tiếp, không cần wire event. Đặt Button Transition = None để tránh conflict. **Không gắn** vào MuteButton (đã có animation riêng).

### 3.9 Confirm Dialog & Hint Penalty
- **Confirm dialog:** Hiện khi bấm "Quay lại" giữa ván (`!_daThang`). Pop-in từ scale 0.7 + fade-in. Timer tạm dừng khi dialog mở, khôi phục khi bấm "Không". Bấm "Có" → về MenuScene. Gọi từ WinPopup (`_daThang=true`) → về menu thẳng, không dialog.
- **Hint penalty:** Mỗi lần bấm Gợi ý cộng +5 giây vào `_elapsedTime`. Label thời gian nháy mờ 2 lần (UIOpacity tween) để báo hiệu penalty.

### 3.8 Hệ thống chuyển cảnh
- `SceneTransition` (static utility): fade out → loadScene → fade in; có cờ chống trigger nhiều lần
- `MenuAnim.playOutro()`: tất cả phần tử thoát ra ngoài màn (0.35s) song song với fade
- Mỗi scene gọi `SceneTransition.fadeIn()` khi load → trải nghiệm mượt mà

---

## 4. THẾ GIỚI / CỐT TRUYỆN / NHÂN VẬT

Game hiện tại **không có cốt truyện hay nhân vật**. Đây là puzzle thuần gameplay.

**Bối cảnh thị giác:**
- Màn hình menu: dark background, title "SLIDING PUZZLE", block icon, 3 nút chọn độ khó
- Màn chơi: dark background với BoardBG bo góc, info panel phía trên (thumbnail + timer + kỷ lục + nút Gợi ý), nút Restart và Back phía dưới, nút Speaker góc màn hình
- WinPopup: overlay tối, panel chứa ảnh gốc + thời gian + kỷ lục + 2 nút hành động + confetti

**Ảnh puzzle theo độ khó:**
- Easy (2×2): ảnh `easy` (spriteFrame)
- Medium (3×3): ảnh `medium` (spriteFrame)
- Hard (4×4): ảnh `hard` (spriteFrame)

*(Nội dung ảnh cụ thể do designer quyết định)*

---

## 5. NỘI DUNG ĐÃ CÓ vs CHƯA CÓ

### Đã thiết kế & triển khai xong (code hoàn chỉnh)
- [x] Logic lưới N×N đầy đủ (reset, shuffle safe, click-to-slide, win detection)
- [x] Hiển thị tile bằng ảnh cắt từ SpriteFrame
- [x] Timer MM:SS đếm lên
- [x] Kỷ lục cá nhân lưu localStorage theo từng độ khó
- [x] Badge "Mới!" khi phá kỷ lục (cả trên màn chơi và trong WinPopup)
- [x] Hệ thống Gợi ý IDA\* + Linear Conflict, pre-compute sau shuffle, beam search fallback
- [x] Hint tracking chính xác dựa trên tile thực sự di chuyển (không phụ thuộc blink state)
- [x] Viền vàng nhấp nháy cho Gợi ý
- [x] Button "Ảnh gốc" → overlay 2 giây
- [x] Win popup với animation bounce
- [x] Board entrance animation (tile rơi có stagger)
- [x] Menu animation (intro + idle + outro)
- [x] Scene transition fade (SceneTransition utility)
- [x] WinPopup: hiển thị thời gian + kỷ lục
- [x] **Âm thanh đầy đủ:** BGM loop, SFX slide/click/win, click trước khi chuyển scene
- [x] **Nút Mute (Speaker)** ở cả 4 scene, nhớ trạng thái xuyên scene
- [x] **Confetti khi thắng** (Graphics thuần code, không cần asset)
- [x] **Spam restart safe:** dừng tween cũ + unschedule callback trước khi restart
- [x] EasyScene (2×2) — cấu hình hoàn chỉnh
- [x] MediumScene (3×3) — cấu hình hoàn chỉnh
- [x] HardScene (4×4) — cấu hình hoàn chỉnh
- [x] MenuScene — có BGM, click sound, nút Mute

### Ý tưởng chưa triển khai
- [x] Confirm dialog khi bấm Quay lại giữa chừng
- [ ] Màn hình loading khi chuyển scene
- [ ] Hệ thống đếm số bước (move counter)
- [ ] Thêm nhiều ảnh puzzle mỗi độ khó (random mỗi ván)
- [ ] Màn hình kỷ lục tổng hợp từ menu

---

## 6. KỸ THUẬT

**Engine & ngôn ngữ:** Cocos Creator 3.8.8, TypeScript

**Cấu trúc file quan trọng (`assets/Scripts/`):**
| File | Vai trò |
|---|---|
| `GameManager.ts` | Toàn bộ logic game: lưới, tile setup, timer, kỷ lục, hint, animation, audio |
| `Tile.ts` | Component gắn trên mỗi node tile: click callback, moveTo tween |
| `SceneTransition.ts` | Static utility fade-to-black giữa các scene |
| `MenuAnim.ts` | Intro/idle/outro animation + audio cho MenuScene |
| `SoundManager.ts` | Static utility quản lý BGM/SFX + trạng thái muted xuyên scene |
| `MuteButton.ts` | Component nút Speaker: TOUCH_END handler, đổi icon giữ đúng UITransform size |
| `ConfettiEffect.ts` | Hiệu ứng confetti thuần code (Graphics + tween) khi thắng |
| `ButtonAnim.ts` | Component press animation tái sử dụng cho mọi nút (trừ MuteButton) |

**Scenes:**
- `MenuScene` — màn menu chính, có BGM + click sound + Mute button
- `EasyScene` — 2×2 (3 tiles, gridSize=2)
- `MediumScene` — 3×3 (8 tiles, gridSize=3)
- `HardScene` — 4×4 (15 tiles, gridSize=4)

**Lưu trữ:** `sys.localStorage` (Cocos built-in)
- `SlidingPuzzle_BestTime_2/3/4` — kỷ lục từng độ khó
- `SlidingPuzzle_Muted` — trạng thái tắt/bật âm thanh

**Thiết kế GameManager:** Dùng 1 script chung cho mọi độ khó — chỉ khác `gridSize`, `tileNodes[]`, `puzzleImage`. Không có class riêng cho từng độ khó.

---

## 7. VẤN ĐỀ & CÂU HỎI ĐANG MỞ

### Câu hỏi thiết kế chưa giải quyết
- **Gợi ý có nên giới hạn số lần không?** Hiện tại không giới hạn — người chơi có thể dùng Gợi ý để giải hoàn toàn. Có thể thêm "max 3 gợi ý/ván" hoặc trừ điểm thời gian mỗi lần dùng gợi ý.
- **Timer có nên đếm ngược không?** Đếm lên phù hợp casual (không áp lực). Đếm ngược tạo drama hơn nhưng cần xác định thời gian giới hạn hợp lý cho từng độ khó.
- **Làm thế nào xử lý back button khi đang chơi?** ~~Hiện tại chỉ có nút "Quay lại" trên màn chơi, không có confirm dialog~~ → **Đã giải quyết:** Confirm dialog pop-in khi bấm Quay lại giữa chừng, timer tạm dừng, có nút Có/Không.

---

## 8. ĐỊNH HƯỚNG PHÁT TRIỂN

Sắp theo độ ưu tiên (cao → thấp):

### Ưu tiên cao — **ĐÃ HOÀN THÀNH HẾT**
- [x] Setup hoàn chỉnh MediumScene và HardScene
- [x] Âm thanh cơ bản (slide, click, BGM, win fanfare)
- [x] Particle effect khi thắng (confetti)
- [x] Nút Mute xuyên scene
- [x] Click sound trước chuyển scene

### Ưu tiên trung bình — **ĐÃ HOÀN THÀNH**
- [x] **Confirm dialog khi bấm Quay lại giữa chừng** — pop-in animation, timer tạm dừng, nút Có/Không; fallback về menu nếu chưa setup node
- [x] **Hint penalty +5 giây** — cộng 5s vào timer mỗi lần bấm Gợi ý, label nháy 2 lần để báo hiệu
- [~] **Màn hình loading** — bỏ qua (game load nhanh, fade transition đã đủ)

### Ưu tiên thấp — **ĐÃ HOÀN THÀNH**
- [x] **Nhiều ảnh puzzle mỗi độ khó** — `puzzleImages: SpriteFrame[]` array, random mỗi ván, đảm bảo không trùng ảnh liên tiếp (dùng `_currentImageIndex` loại trừ ảnh vừa chơi)
- [x] **Animation nút bấm** — `ButtonAnim.ts` component độc lập: TOUCH_START thu nhỏ 0.85, TOUCH_END bounce lên 1.1 rồi về 1.0 (backOut), TOUCH_CANCEL spring về 1.0; gắn vào mọi nút trong 4 scene
- [~] **Màn hình kỷ lục tổng hợp** — bỏ qua theo yêu cầu
