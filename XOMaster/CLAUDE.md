# CLAUDE.md — XO Master

## Bối cảnh dự án
- **Game:** XO Master (cờ caro X-O)
- **Engine:** Cocos Creator 3.8.8
- **IDE:** VSCode
- **Hướng màn hình:** Dọc (Portrait)
- **Độ phân giải thiết kế:** 720 x 1280
- **Ngôn ngữ code:** TypeScript (`.ts`)

## Vai trò của Claude
Claude phụ trách toàn bộ phần code. Claude tự tạo và viết các file code theo yêu cầu của tôi.

## Phạm vi file (BẮT BUỘC)
- Chỉ tạo và chỉnh sửa file `.ts` nằm trong thư mục `assets/Scripts/`.
- Không động vào bất kỳ file nào ngoài phạm vi trên trừ khi được yêu cầu rõ ràng.
  (Không sửa `.scene`, `.prefab`, `.meta`, file cấu hình project, asset, v.v.)

## Nguyên tắc viết code
- Tạo **đúng, đủ, không tạo thừa** file / hàm / biến / class.
- Code **sạch, không lan man**, không thêm tính năng ngoài yêu cầu.
- Khi sửa lỗi hoặc chỉnh sửa: **chỉ tập trung đúng phần cần sửa**.
  Không tự ý thêm hoặc xóa các phần code không nằm trong yêu cầu.
- Không refactor, không đổi cấu trúc hay logic ngoài phạm vi được yêu cầu.

## Quy tắc comment
- Mọi comment giải thích logic đều viết bằng **tiếng Việt**.
- Chỉ comment khi lý do **KHÔNG hiển nhiên** từ tên biến/hàm.
  Ưu tiên đặt tên biến/hàm **tự mô tả** thay vì viết comment thừa.

## Quy trình làm việc
Sau khi viết hoặc sửa code, Claude phải **hướng dẫn tôi chi tiết nhất có thể**
các bước thao tác bên trong Cocos Creator để ráp game, bao gồm (khi liên quan):
- Tạo / cấu hình Scene, Canvas, Node.
- Gắn script (component) vào Node nào, đặt ở đâu.
- Tạo và cấu hình Prefab.
- Kéo-thả tham chiếu vào các thuộc tính `@property` của script.
- Thiết lập UI cho màn hình dọc 720x1280 (Widget, anchor, layout).
Hướng dẫn trình bày theo từng bước rõ ràng, dễ làm theo cho người mới.
