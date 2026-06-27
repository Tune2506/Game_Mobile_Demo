# CLAUDE.md — Sliding Puzzle (8-puzzle) | Cocos Creator 3.8 + TypeScript

## Quy tắc làm việc

### 1. Phạm vi chỉnh sửa file
- Chỉ tạo và chỉnh sửa file `.ts` nằm trong thư mục `assets/Scripts/`.
- Không động vào bất kỳ file nào ngoài phạm vi trên trừ khi được yêu cầu rõ ràng.

### 2. Các file do Cocos Creator quản lý — TUYỆT ĐỐI KHÔNG CHẠM VÀO
- **Không** tạo mới, chỉnh sửa, hay xóa các file có đuôi: `.meta`, `.scene`, `.prefab`.
- Những file này do Cocos Creator tự sinh và quản lý; can thiệp thủ công sẽ làm hỏng project, mất liên kết node, hoặc crash editor.

### 3. Comment code bằng tiếng Việt
- Mọi comment giải thích logic đều viết bằng tiếng Việt.
- Chỉ comment khi lý do KHÔNG hiển nhiên từ tên biến/hàm (ưu tiên đặt tên tự mô tả).

### 4. Code an toàn — kiểm tra null trước khi dùng
- Luôn kiểm tra `null` / `undefined` / `isValid` trước khi truy cập node hoặc component.
- Không giả định node luôn tồn tại trong scene; dùng optional chaining (`?.`) và early-return khi cần.
- Với Cocos Creator: kiểm tra `cc.isValid(node)` trước khi thao tác trên node có thể đã bị destroy.
