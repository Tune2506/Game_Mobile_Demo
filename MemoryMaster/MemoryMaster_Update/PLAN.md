# PLAN.md — Memory Master

> Tài liệu này tóm tắt toàn bộ thiết kế game để phiên Claude Code mới có thể hiểu ngay mà không cần giải thích lại. Đọc cùng CLAUDE.md để có đủ bối cảnh.

---

## 1. TỔNG QUAN GAME

**Tên game:** Memory Master  
**Thể loại:** Card Matching / Memory Game (lật thẻ tìm cặp)  
**Nền tảng mục tiêu:** Mobile (portrait)

**Ý tưởng cốt lõi:** Người chơi lật úp các thẻ bài để tìm các cặp emoji giống nhau trong thời gian giới hạn. Thẻ có animation lật, màu sắc rõ ràng, không cần sprite ngoài.

**Điểm khác biệt:**
- Có **2 chế độ chơi** với triết lý khác nhau: Challenge (tiến trình tuyến tính, hướng đến kỷ lục level) và Classic (chọn màn tự do, hướng đến kỷ lục thời gian từng màn).
- Toàn bộ đồ họa thẻ bài vẽ bằng **Graphics API** — không phụ thuộc sprite/atlas ngoài.
- Cấu hình level tập trung ở **một file duy nhất** (`LevelsConfig.ts`), dễ mở rộng.

---

## 2. GAMEPLAY CHÍNH

### Vòng lặp gameplay (Loop)
1. Người chơi vào màn chơi → lưới thẻ úp xuất hiện.
2. Bấm một thẻ → lật lên thấy emoji.
3. Bấm thẻ thứ hai → nếu khớp: cả hai ở lại mặt trước; nếu không khớp: cả hai lật úp lại sau 0.5 giây.
4. Hoàn thành hết cặp → **thắng**. Hết giờ trước khi xong → **thua**.

### Cảm giác muốn mang lại
- **Challenge:** căng thẳng leo level, cảm giác "thêm một màn nữa thôi".
- **Classic:** thư giãn nhưng muốn cải thiện thời gian, cảm giác làm chủ từng màn.

---

## 3. CÁC HỆ THỐNG

### 3.1 Hệ thống thẻ bài (Card)
- Mỗi thẻ là một prefab với 3 layer: `backFace` (xanh dương), `frontFace` (vàng), `emojiLabel`.
- Animation lật: scale X → 0, đổi face active, scale X → 1 (tổng 0.2s).
- Trạng thái: `isFlipped`, `isMatched`, `isAnimating`. Chặn touch khi đang animate hoặc đã matched.
- Card không phụ thuộc trực tiếp vào GameManager mà dùng interface `ICardController` (có `inputLocked` và `onCardFlipped`), cho phép cả 2 game manager dùng chung prefab.

### 3.2 Hệ thống lưới (Grid)
- Grid tính toán `cardSize` động dựa trên kích thước `cardContainer` và số cột/hàng.
- Công thức: `cardSize = Math.min(fitW, fitH, 160)` — giới hạn 160px để thẻ không quá to.
- Căn giữa lưới trong container. Khoảng cách giữa thẻ: 12px.

### 3.3 Hệ thống deck
- Pool emoji được shuffle ngẫu nhiên, lấy đúng số cặp cần, nhân đôi, shuffle lần nữa.
- Pool toàn bộ: 21 emoji (đủ cho màn lớn nhất cần 21 cặp).

### 3.4 Hệ thống timer
- **Challenge:** đếm ngược từ `challengeTime` → 0. Hết giờ → thua.
- **Classic:** đếm ngược từ `classicTime` → 0 (hiển thị), nhưng đồng thời đếm `elapsed` lên để ghi record. Hết giờ → thua.
- Lý do Classic dùng cả hai: người chơi thấy áp lực đếm ngược, nhưng record là thời gian hoàn thành thực tế (elapsed), không phải thời gian còn lại.

### 3.5 Hệ thống record

**Challenge — Best Level:**
- Lưu level cao nhất đã thắng vào `localStorage` key `MemoryMatch_BestLevel`.
- Hiển thị `👑 Level X` trong game, màu vàng khi chưa có record hoặc vừa phá record, màu trắng khi đang bình thường.
- Khi phá record (thắng level cao hơn Best Level cũ) → hiện `NewRecordPopup` thay vì popup "Good Job!".

**Classic — Best Time per Level:**
- Mỗi level lưu riêng key `ClassicBestTime_N` (N = số thứ tự level).
- Record là elapsed time ngắn nhất (đơn vị: giây thực dấu phẩy động).
- Hiển thị `⏱ MM:SS` trên màn chơi; màu vàng khi chưa có record hoặc vừa phá, màu trắng khi bình thường.
- Khi phá record → `NewRecordPopup`; không phá → "Good Job!" popup.

### 3.6 Hệ thống popup
**Challenge:**
- `WinPopup`: "Good Job!" + Next Level + Play Again (tùy context).
- Nếu last level: "Congratulations, you're done!" + Play Again.
- `NewRecordPopup`: hiện khi phá Best Level + Next Level.
- `LosePopup`: Play Again + (không có Back, về lại từ đầu).

**Classic:**
- `WinPopup`: "Good Job!" + Next Level (ẩn nếu last level) + Back.
- `NewRecordPopup`: + Next Level (ẩn nếu last level) + Back.
- `LosePopup`: Play Again + Back.
- Back → về `MenuScene`.

### 3.7 Hệ thống tiến trình (Progression)

**Challenge:**
- Luôn bắt đầu từ Level 1 mỗi lần chơi mới (không save current level nữa).
- Chỉ lưu Best Level đạt được cao nhất.

**Classic:**
- Tất cả 9 màn đều mở từ đầu (không có hệ thống khóa).
- Level đã thắng ít nhất 1 lần → ô xanh lá + hiện best time bên dưới số màn.
- Level chưa thắng → ô xanh dương.
- Quyết định mở hết (không khóa) là để trải nghiệm thoải mái, không gây bực bội.

---

## 4. THẾ GIỚI / CỐT TRUYỆN / NHÂN VẬT

Game không có cốt truyện hay nhân vật. Đây là puzzle/arcade thuần túy. Aesthetic tối giản: nền tối, thẻ màu xanh/vàng, emoji làm nội dung thẻ.

---

## 5. NỘI DUNG ĐÃ CÓ vs CHƯA CÓ

### Đã thiết kế và triển khai xong
- Toàn bộ core gameplay (lật thẻ, match, timer, win/lose).
- Cả 2 chế độ chơi hoạt động hoàn chỉnh với popup, record, navigation.
- 9 level với config riêng biệt (challengeTime, classicTime, grid size).
- MenuScene Classic với 9 ô level, 3 ô/hàng, tự scale theo container.
- Hệ thống record (Best Level cho Challenge, Best Time per level cho Classic).
- Shared `LevelsConfig.ts` — thêm level chỉ cần 1 dòng.
- IntroScene với 2 nút: Challenge và Classic.
- IntroDecor: 6 card trang trí nổi động trên IntroScene (2 trên title, 2 ngang title, 2 ngang nút), tạo node động bằng code, animation float + wobble loop vô hạn, luôn render sau BG và trước title/nút.

### Còn là ý tưởng / chưa triển khai
- Âm thanh (SFX, nhạc nền).
- Animation hiệu ứng khi thắng/thua (confetti, shake...).
- Leaderboard hoặc so sánh điểm giữa người chơi.
- Tutorial / hướng dẫn cho người mới.
- Thêm loại thẻ khác (hình ảnh thật thay vì emoji).
- Chế độ chơi thứ ba (ví dụ: timed sprint, endless...).

### Còn để ngỏ
- Số màn có thể tăng thêm bất cứ lúc nào qua `LevelsConfig.ts`.
- Design của popup NewRecord (hiện chỉ là node cơ bản, chưa có visual đặc biệt).
- Cân bằng thời gian các màn (challengeTime/classicTime) chưa được test thực tế kỹ.

---

## 6. KỸ THUẬT

**Engine:** Cocos Creator 3.8.8  
**Ngôn ngữ:** TypeScript  
**Đồ họa thẻ:** Cocos `Graphics` API (vẽ trực tiếp bằng code, không cần sprite)

### Các file script chính

| File | Vai trò |
|---|---|
| `LevelsConfig.ts` | Nguồn sự thật duy nhất cho config level (grid, thời gian, emoji pool) |
| `Card.ts` | Component thẻ bài: animation lật, trạng thái, interface `ICardController` |
| `GameManager.ts` | Logic màn chơi Challenge: timer đếm ngược, Best Level record |
| `ClassicGameManager.ts` | Logic màn chơi Classic: timer đếm ngược hiển thị + elapsed record |
| `MenuManager.ts` | Màn chọn level Classic: tạo nút động, đọc best time, điều hướng |
| `IntroManager.ts` | Màn intro: 2 nút Challenge/Classic, không có state |
| `IntroDecor.ts` | Tạo 6 card trang trí động trên IntroScene; 6 `@property(SpriteFrame)` gán qua Inspector |

### Các scene

| Scene | Mô tả |
|---|---|
| `IntroScene` | Màn chính, chọn chế độ chơi |
| `ChallengeScene` | Màn chơi Challenge (dùng `GameManager`) |
| `MenuScene` | Chọn màn Classic (dùng `MenuManager`) |
| `ClassicScene` | Màn chơi Classic (dùng `ClassicGameManager`) |

### Lưu trữ (localStorage)
| Key | Nội dung |
|---|---|
| `MemoryMatch_BestLevel` | Level cao nhất đã thắng trong Challenge |
| `Classic_SelectedLevel` | Level được chọn để truyền từ MenuScene → ClassicScene |
| `ClassicBestTime_N` | Best time (giây) của level N trong Classic |

---

## 7. VẤN ĐỀ & CÂU HỎI ĐANG MỞ

### Lỗi / giới hạn đã biết
- **`padStart` TypeScript error** ở `GameManager.ts` dòng timer: lỗi type do tsconfig chưa set `lib: es2017`. Không ảnh hưởng runtime Cocos Creator. Cần fix bằng cách thêm `"es2017"` vào `lib` trong `tsconfig.json`.

### Lỗi đã fix
- **Label số trong MenuScene bị clipped**: đã fix với `Label.Overflow.SHRINK` + `horizontalAlign=1` + `verticalAlign=1`.
- **`UITransform.contentSize` trả về 0 trong `onLoad`** khi scene reload: đã fix bằng cách dùng `start()` thay vì `onLoad()` trong `MenuManager`.
- **IntroDecor cards vô hình**: `setSiblingIndex(1)` đẩy `DecorRoot` lên trước `BG` khiến background đè lên cards. Đã fix bằng cách xóa dòng đó — hierarchy trong Editor đã đặt `DecorRoot` đúng vị trí (sau BG, trước title/nút).

### Câu hỏi thiết kế chưa chốt
- Có nên giữ hệ thống **khóa màn** (unlock) trong Classic hay không? Đã thử nhưng user chọn mở hết — cân nhắc lại nếu muốn thêm độ khó tiến trình.
- `classicTime` hiện gấp đôi `challengeTime` — chưa có data thực tế để xác nhận cân bằng này là tốt hay không.
- Màn L8 (6×6) và L9 (6×7) trên màn hình nhỏ: thẻ sẽ khoảng 90px, chưa test UX thực tế.
- Challenge hiện không lưu progress giữa session (luôn bắt đầu lại từ L1) — có thể cân nhắc thêm lại save point nếu user phản hồi.

---

## 8. ĐỊNH HƯỚNG PHÁT TRIỂN

Sắp xếp theo độ ưu tiên từ cao đến thấp:

### Ưu tiên cao — hoàn thiện core
1. **Âm thanh cơ bản:** SFX lật thẻ, match thành công, win, lose. Không cần nhạc nền phức tạp.
2. **Visual feedback mạnh hơn khi win/lose:** animation confetti hoặc screen shake nhẹ — tăng cảm giác thỏa mãn.
3. **Cân bằng thời gian:** test thực tế và điều chỉnh `challengeTime`/`classicTime` cho từng level.
4. **Fix lỗi padStart:** thêm `"lib": ["es2017"]` vào `tsconfig.json`.

### Ưu tiên trung bình — mở rộng nội dung
5. **Thêm level 10+:** chỉ cần thêm dòng vào `LevelsConfig.ts` + thêm emoji nếu cần > 21 cặp.
6. **Tutorial màn đầu:** hướng dẫn ngắn cho người chơi lần đầu (có thể skip).
7. **Animation chiến thắng cho NewRecord:** visual khác biệt hơn so với win thường.

### Ưu tiên thấp — tính năng mới
8. **Chế độ chơi thứ ba:** ví dụ "Time Attack" — số cặp cố định, đua thời gian không giới hạn.
9. **Bảng xếp hạng local:** so sánh best time giữa các profile trên cùng thiết bị.
10. **Chủ đề (theme):** đổi màu thẻ, background — không thay đổi gameplay.
11. **Hỗ trợ nhiều ngôn ngữ:** hiện tất cả text hardcode tiếng Anh.
