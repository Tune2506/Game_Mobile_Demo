# PLAN.md — XO Master

> Tài liệu này mô tả toàn bộ thiết kế game và trạng thái phát triển hiện tại.
> Đọc cùng CLAUDE.md để có bức tranh đầy đủ trước khi làm việc.

---

## 1. TỔNG QUAN GAME

**Tên:** XO Master
**Thể loại:** Casual puzzle / Board game — cờ caro X-O (Tic-Tac-Toe mở rộng)
**Nền tảng mục tiêu:** Mobile (Android/iOS), màn hình dọc

### Ý tưởng cốt lõi
Nâng cấp Tic-Tac-Toe kinh điển vượt ra ngoài bảng 3×3 cố định: người chơi chọn kích thước bảng (3×3 / 6×6 / 9×9 / 11×11) và đấu với AI hoặc người khác ngồi cùng máy. Game nhắm vào session ngắn (2–5 phút/ván), phù hợp chơi lúc rảnh.

### Đối tượng người chơi
Người chơi casual, mọi lứa tuổi, quen biết Tic-Tac-Toe nhưng muốn thử thách hơn.

### Điểm hấp dẫn khác biệt
- Bốn kích thước bảng (3×3 → 6×6 → 9×9 → 11×11) với điều kiện thắng khác nhau tạo chiều sâu chiến thuật tăng dần.
- Hệ thống Undo/Hint có giới hạn theo ngày — tạo cảm giác "nguồn lực quý", buộc người chơi suy nghĩ trước khi dùng.
- Luật đổi người đi trước tự động sau mỗi ván — không ai bị bất lợi liên tục, đảm bảo công bằng lâu dài.
- AI ở chế độ Khó cố ý có sai số nhỏ (không chơi hoàn hảo) để game vẫn thú vị, không gây bực bội.

---

## 2. GAMEPLAY CHÍNH

### Gameplay loop (vòng lặp)
1. Người chơi vào IntroScene → tap để vào MenuScene.
2. Tại MenuScene: vuốt carousel chọn kích thước bảng → chọn chế độ PvE hoặc PvP → vào GameScene.
3. **PvP:** trước khi chơi hiện popup nhập tên người chơi → bấm "Bắt đầu".
4. Tại GameScene: hai bên thay nhau đặt X/O, người nào hoàn thành chuỗi dài đúng quy định trước thì thắng ván.
5. Kết ván: hiện popup thắng/thua/hòa → "Tiếp tục" chơi ván mới (điểm giữ) hoặc "Chơi lại" (reset điểm về 0–0).
6. Quay lại bước 4, lặp lại.

### Điều kiện thắng
| Bảng  | Số ô cần liên tiếp |
|-------|-------------------|
| 3×3   | 3                 |
| 6×6   | 4                 |
| 9×9   | 5                 |
| 11×11 | 6                 |

Chuỗi liên tiếp tính theo hàng ngang, dọc, chéo (4 hướng), độ dài chính xác bằng `winCount` (không cần bằng đúng bằng `boardSize`).

### Cảm giác muốn mang lại
- **Nhẹ nhàng, dứt khoát:** mỗi nước đi có animation nhỏ, có sound feedback ngay lập tức.
- **Công bằng và minh bạch:** biết rõ lượt của ai, biết rõ còn bao nhiêu Undo/Hint.
- **Có chiều sâu vừa đủ:** 3×3 để khởi động, 11×11 để thử thách — không bao giờ cảm thấy "game này quá đơn giản".

---

## 3. CÁC HỆ THỐNG

### 3.1 Chọn bảng (Carousel)
Màn MenuScene có 4 card hiển thị kích thước bảng xếp ngang nhau (3×3 / 6×6 / 9×9 / 11×11). Người chơi vuốt trái/phải hoặc bấm nút mũi tên để chuyển card. Card ở giữa scale = 1.0, hai bên scale = 0.85. Khi chọn xong, config được ghi vào `GameConfig` (static class) trước khi load GameScene.

### 3.2 Lượt chơi & Người đi trước
- **Ván đầu tiên:** random ai đi trước (50/50).
- **Các ván tiếp theo:** tự động đổi — người vừa đi sau ở ván trước sẽ đi trước ở ván này.
- **Reset điểm (về 0–0):** bất kể từ nguồn nào (nút Restart, nút Replay trong Setting, đổi độ khó), người đi trước được random lại từ đầu.
- Lý do thiết kế: đảm bảo công bằng dài hạn mà không cần người chơi phải nhớ hay thỏa thuận.

### 3.3 AI (chỉ có ở PvE)
Ba mức độ khó, chọn bằng dropdown trong GameScene:

| Độ khó | Logic |
|--------|-------|
| Dễ | Đặt ngẫu nhiên vào ô trống |
| Trung bình | Thắng ngay nếu có thể → Chặn người thắng → Ngẫu nhiên |
| Khó | Thắng ngay → Chặn người → **40% xác suất đi ngẫu nhiên** → Trung tâm → Góc → Ngẫu nhiên |

Lý do AI Khó cố tình sai 40%: với chiến thuật win/block thuần túy, AI đã đủ để tỉ lệ thắng của người chơi chỉ còn ~30%. Con số 40% sai số đưa tỉ lệ thắng lên ~45–50%, tạo cảm giác thách thức nhưng vẫn có thể thắng được.

Phát hiện nước thắng/chặn dùng hàm `buildAllLines()` — liệt kê toàn bộ chuỗi có độ dài `winCount` trên bảng `boardSize×boardSize`, không hardcode.

**Dropdown đổi độ khó:**
- Người chơi bấm vào DifficultyBar → dropdown trượt xuống với anim.
- Chọn 1 trong 3 mức → độ khó đổi, điểm reset về 0–0, game restart.
- Bấm ra ngoài dropdown (bấm vào bảng, background, v.v.) → dropdown đóng lại có anim, **độ khó và điểm giữ nguyên**, game tiếp tục bình thường.
- Cơ chế: tạo node blocker vô hình toàn màn hình ngay sau khi dropdown mở, đặt phía sau DifficultyBar trong hierarchy để không chặn DifficultyBar/dropdown; khi blocker nhận TOUCH_END → đóng dropdown.

### 3.4 Hệ thống Undo
- Người chơi bấm nút Undo để hoàn tác nước đi mới nhất.
- **PvE:** hoàn tác cả nước AI vừa đi (nếu có) lẫn nước người vừa đi — trả về đúng lượt của người chơi.
- **PvP:** hoàn tác 1 nước duy nhất (nước của người vừa đi), trả lượt về cho người kia.
- Giới hạn: **2 lượt/ngày** (chung cho cả ván, không reset khi bắt đầu ván mới trong ngày).
- Khi hết lượt: nút lắc (shake animation) + phát sound denied.
- Lưu trữ: `sys.localStorage` với cấu trúc `{ date: string, used: number }`, tự reset khi sang ngày mới.
- Số lượt còn lại hiển thị bằng Label nhỏ góc trên nút.

### 3.5 Hệ thống Hint
- Người chơi bấm nút Hint để gợi ý ô nên đặt tiếp theo.
- Thuật toán tính điểm cho từng ô trống theo trọng số:
  - Thắng ngay: 10 000 điểm
  - Chặn người thắng ngay: 9 000 điểm
  - Xây chuỗi dài của mình: điểm theo độ dài chuỗi (khoảng 60–80/chuỗi)
  - Phá chuỗi của đối thủ: điểm tương tự
  - Ô trung tâm: +30; ô góc: +15
- Gợi ý hiển thị bằng **viền vàng nhấp nháy** (Graphics vẽ roundRect, UIOpacity pulse) xung quanh ô được gợi ý — không đổi màu nền ô.
- Người chơi click vào ô đó để đặt quân, viền tự động biến mất.
- Giới hạn: **2 lượt/ngày** (cùng cơ chế lưu trữ như Undo).
- Khi hết lượt: shake + denied sound.
- Trong PvE, Hint chỉ hoạt động khi đến lượt người chơi (không gợi ý cho AI).

### 3.6 Settings (Nhạc & Sound)
- Popup Setting có ở cả 3 scene (IntroScene, MenuScene dùng `SettingManager.ts`; GameScene dùng code trong `GameManager.ts`).
- Hai toggle: Nhạc nền (bgMusic) và Âm thanh (clickSfx + các sfx khác).
- Trạng thái được lưu vào `GameConfig.musicOn` / `GameConfig.soundOn` (static, tồn tại trong toàn phiên chơi).
- Khi tắt nhạc ở một scene, chuyển qua scene khác nhạc vẫn tắt; bật lên cũng tương tự.
- Toggle có animation knob trượt + đổi màu track (trắng = bật, xám = tắt).

### 3.7 Nhạc nền liên tục (IntroScene ↔ MenuScene)
- Nhạc nền phát xuyên suốt khi di chuyển giữa IntroScene và MenuScene — không replay, không ngắt giữa chừng.
- Khi chuyển sang GameScene: nhạc menu dừng hẳn, GameScene có nhạc riêng.
- Khi từ GameScene quay về IntroScene hoặc MenuScene: nhạc menu replay từ đầu.
- Cơ chế: `MenuBgAudio.ts` dùng `director.addPersistRootNode()` để node âm thanh sống xuyên scene. Instance mới trong scene sau tự huỷ nếu đã có instance đang sống. Trước khi load GameScene, gọi `MenuBgAudio.cleanup()` để dọn dẹp.

### 3.8 PvP — Nhập tên người chơi
- Khi chọn mode PvP ở MenuScene → vào GameScene → scorepanel hiện sẵn "Player 1" / "Player 2" ngay trong anim mở màn.
- Sau anim (0.7s): popup nhập tên trượt vào với hiệu ứng backOut.
- Mỗi ô nhập tên là EditBox: chỉ nhận ký tự `a–z A–Z 0–9 và dấu cách`, tối đa 10 ký tự, tự trim khoảng trắng cuối.
- Nếu để trống: mặc định "Player 1" / "Player 2".
- Bấm "Bắt đầu": popup thu lại, tên được ghi lên scorepanel, game bắt đầu.

### 3.9 PvP — Kết ván
- Cả hai người đều thắng bằng **WinPopup** (không dùng LosePopup trong PvP).
- WinPopup hiện tên người thắng thay thế sprite "Bạn thắng!" bằng Label động: `"[Tên] thắng!"`.
- Sprite WinMess gốc chỉ hiện trong PvE.

### 3.10 Điểm số
- Mỗi scene GameScene duy trì `playerScore` và `aiScore` (hoặc player2Score trong PvP — hiện tại cùng biến `aiScore`).
- Điểm chỉ reset khi người chơi chủ động (nút Restart, Replay trong Setting, đổi độ khó).
- Popup kết ván: Thắng (confetti + winSfx), Thua (slide từ trên xuống + loseSfx), Hòa (xoay + drawSfx).
- Kết ván "Tiếp tục" (Continue): giữ điểm, bắt đầu ván mới, đổi lượt người đi trước.

### 3.11 Animations
**IntroScene:**
- Title: scale 0.5→1 + fade, easing backOut (0.6s)
- SettingBtn: slide từ trên xuống 60px + fade, delay 0.3s
- PlayBtn: pulse scale lặp vô hạn (×1.07 ↔ ×1.0, sineInOut 0.9s/chu kỳ), bắt đầu sau 0.8s

**MenuScene:**
- TitleLabel: slide từ trên xuống 60px + fade
- SettingBtn + BackBtn: slide 40px + fade, delay 0.1s
- Cards: scale 0.6→1 + fade, stagger 0.1s, backOut
- PveBtn + PvpBtn: slide từ dưới lên 60px + fade, stagger 0.1s, backOut

**GameScene:**
- ScorePanel: slide từ trên xuống 150px + fade
- Board: scale 0→1, backOut, delay 0.15s
- DifficultyBar + SettingBtn: fade in, delay 0.3s
- UndoBtn + HintBtn: scale 0→1 bounce (backOut), delay 0.5s và 0.6s riêng biệt
- Đặt quân: icon scale 0→1 backOut (0.2s)
- Kết ván: confetti (15 mảnh/bên, 2 bên màn hình, rơi xuống + xoay + fade)

---

## 4. THẾ GIỚI / CỐT TRUYỆN / NHÂN VẬT

Game không có cốt truyện hay nhân vật — thuần gameplay abstract.
Phong cách hình ảnh: pastel, bo góc mềm, màu chủ đạo xanh mint (O) và hồng/đỏ (X).
Không có kế hoạch thêm narrative ở giai đoạn hiện tại.

---

## 5. NỘI DUNG ĐÃ CÓ vs CHƯA CÓ

### ✅ Đã thiết kế & triển khai xong (code hoàn chỉnh)
- Toàn bộ luồng 3 scene: Intro → Menu → Game
- Carousel chọn bảng 3×3 / 6×6 / 9×9 / 11×11 với swipe gesture
- Chế độ PvE (vs AI 3 mức) và PvP (2 người cùng máy)
- Win detection động (buildAllLines), draw detection
- Win line vẽ bằng Graphics
- Confetti khi thắng
- Hệ thống Undo (2/ngày, PvE undo 2 nước, PvP undo 1 nước)
- Hệ thống Hint (2/ngày, viền vàng nhấp nháy)
- Settings popup (music/sound toggle) đồng bộ qua GameConfig
- Luật đổi người đi trước tự động, reset khi điểm về 0–0
- AI Khó có sai số 40% để cân bằng
- Animation đầy đủ cho cả 3 scene
- Sound: bgMusic, placeSfx, winSfx, loseSfx, drawSfx, clickSfx, deniedSfx
- Số lượt Undo/Hint còn lại hiển thị trên nút (Label nhỏ)
- Shake + denied sound khi hết lượt Undo/Hint
- **Nhạc nền liên tục IntroScene ↔ MenuScene** (MenuBgAudio persistent node)
- **PvP popup nhập tên** trước khi chơi (EditBox, filter ký tự, max 10, default Player 1/2)
- **Scorepanel PvP** hiện "Player 1"/"Player 2" ngay từ anim mở màn
- **PvP win popup** hiện tên người thắng thay sprite "Bạn thắng!"
- **Dropdown đóng khi bấm ngoài** — không đổi độ khó, không reset điểm, game tiếp tục
- **Dropdown đóng trước khi đặt quân** — nếu bấm vào ô cờ lúc dropdown đang mở, dropdown kéo lên trước (0.25s) rồi X/O mới xuất hiện

### 🔲 Mới là ý tưởng / chưa triển khai
- Leaderboard hoặc lịch sử thống kê (win rate, chuỗi thắng...)
- Online multiplayer (PvP qua mạng)
- Skin / theme thay đổi màu sắc bảng, quân cờ
- Hệ thống thành tích (achievements)
- Tutorial cho người chơi lần đầu
- Âm thanh riêng biệt khi đặt X và O (hiện tại dùng chung placeSfx)

### ❓ Còn để ngỏ / chưa quyết định
- Có nên thêm timer (giới hạn thời gian mỗi nước) không?
- Undo/Hint 2 lượt/ngày có phù hợp chưa, hay nên tăng/giảm?
- AI Khó sai 40% — con số này có cần tinh chỉnh thêm không?

---

## 6. KỸ THUẬT

### Stack
- **Engine:** Cocos Creator 3.8.8
- **Ngôn ngữ:** TypeScript
- **Hướng màn hình:** Portrait 720×1280

### File chính
| File | Vai trò |
|------|---------|
| `assets/Scripts/GameConfig.ts` | Static class chia sẻ config giữa scenes (`mode`, `boardSize`, `winCount`, `musicOn`, `soundOn`) |
| `assets/Scripts/IntroManager.ts` | Script cho IntroScene: animation xuất hiện, tap-to-continue, fade out chuyển scene |
| `assets/Scripts/MenuManager.ts` | Script cho MenuScene: carousel 4 bảng (3×3/6×6/9×9/11×11), chọn chế độ, animation mở màn, gọi `MenuBgAudio.cleanup()` trước khi load GameScene |
| `assets/Scripts/MenuBgAudio.ts` | Persistent audio manager: nhạc nền sống xuyên IntroScene ↔ MenuScene, dùng `director.addPersistRootNode()`, singleton pattern với `isValid()` guard |
| `assets/Scripts/SettingManager.ts` | Component dùng chung ở Intro/Menu: mở/đóng setting popup, toggle nhạc/sound, sync với GameConfig và MenuBgAudio |
| `assets/Scripts/GameManager.ts` | Script chính GameScene: toàn bộ game logic (board, AI, undo, hint, score, popup, animation, sound, PvP name input) |

### Kiến trúc chính
- `GameConfig` là "bus" truyền dữ liệu giữa scenes (không dùng persistent storage vì chỉ cần trong phiên chơi).
- `MenuBgAudio` dùng static `_instance` + `isValid()` để tránh crash khi scene unload làm reference thành stale.
- Mỗi scene tự quản lý audio của mình; `GameConfig.musicOn/soundOn` đồng bộ ý định của người dùng.
- Board cell được `instantiate` từ Prefab mỗi khi `startGame()` chạy — không tái sử dụng node cũ (tránh state stale).
- `buildAllLines(size, winCount)` là hàm trung tâm dùng chung cho cả win detection, AI và hint scoring.
- `sys.localStorage` chỉ dùng cho Undo/Hint daily limit (dữ liệu cần tồn tại qua phiên).
- Dropdown blocker được tạo/huỷ động bằng code — không cần node trong scene. Blocker kế thừa layer từ `difficultyBar` để camera UI nhận touch. Khi bấm vào ô cờ lúc dropdown đang mở: dropdown kéo lên trước (0.25s), sau đó X/O mới xuất hiện tại ô đó.

---

## 7. VẤN ĐỀ & CÂU HỎI ĐANG MỞ

### Lỗi / giới hạn đã biết
- `SettingManager` cần node `CloseBtn` tồn tại đúng tên trong `settingPanel` mới tìm được bằng `getChildByName('CloseBtn')` — nếu đặt sai tên trong scene thì nút đóng không hoạt động (silent fail).
- Hint dùng `Graphics.roundRect()` — nếu phiên bản Cocos Creator nhỏ hơn không hỗ trợ API này thì cần viết roundRect thủ công bằng `lineTo` + `arcTo`.
- AI Khó không xây chuỗi chủ động (chỉ thắng tức thời + chặn tức thời); với bảng 9×9, AI có thể thua vì không nhận ra mối nguy từ xa. Đây là giới hạn thiết kế, không phải bug.
- EditBox trong web preview dùng native HTML input — vị trí TEXT_LABEL không ảnh hưởng đến con trỏ gõ khi đang focus. Trên build mobile native thì hoạt động đúng.

### Trade-off đang phân vân
- **2 lượt/ngày vs nhiều hơn:** 2 lượt tạo cảm giác "quý hiếm" nhưng nếu người chơi dùng hết sớm thì phần còn lại của ngày mất đi tính năng này. Có thể tăng lên 3 hoặc cho reset sau mỗi khi reset điểm.
- **Shared daily uses giữa 2 người (PvP):** Hiện tại 2 người chơi chung 2 lượt Undo và 2 lượt Hint. Có thể tách riêng (mỗi người 2 lượt) nếu thấy không công bằng, nhưng cần thêm tracking.
- **AI Khó 40% random:** Con số này chưa được test với người dùng thật. Có thể cần điều chỉnh.

---

## 8. ĐỊNH HƯỚNG PHÁT TRIỂN

Xếp theo độ ưu tiên:

### Ưu tiên cao (nên làm sớm)
1. **Thêm màn hình Tutorial nhỏ** — lần đầu chơi hiện modal giải thích 3 quy tắc: kích thước bảng, số ô cần liên tiếp, Undo/Hint. Đơn giản nhưng giảm confusion cho người mới.
2. **Thống kê đơn giản** — lưu win/loss/draw vào localStorage, hiển thị trong Setting popup. Tạo mục tiêu dài hạn cho người chơi.
3. **Sound riêng cho X và O** — placeSfx hiện tại dùng chung, thêm 1 clip khác cho âm thanh phong phú hơn.

### Ưu tiên trung bình
4. **AI Khó nâng cấp:** thêm logic xây chuỗi chủ động (phát hiện mối nguy 2 bước trước). Dùng lại `buildAllLines` + scoring tương tự hint nhưng cho AI chọn nước.
5. **Timer tùy chọn:** giới hạn X giây/nước, mỗi người chơi có thanh thời gian riêng. Bật/tắt trong Setting.
6. **Skin/Theme:** đổi màu bảng và quân cờ. Lưu lựa chọn vào localStorage.

### Ưu tiên thấp (dài hạn)
7. **Online PvP:** cần backend, tốn nhiều công nhất.
8. **Achievements:** hệ thống huy hiệu (thắng 10 ván liên tiếp, thắng không dùng Hint, v.v.)
