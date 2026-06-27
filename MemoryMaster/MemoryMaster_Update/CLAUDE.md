# CLAUDE.md — MemoryMaster Demo

## Bối cảnh dự án

Game lật thẻ bài (Memory / Card Matching) viết bằng **Cocos Creator** + **TypeScript**.
Editor: VS Code. Engine: Cocos Creator (xem `package.json` để biết version chính xác).

---

## Phân vai làm việc

| Vai | Phụ trách |
|-----|-----------|
| **Claude** | Viết, sửa, refactor logic trong các file `.ts` |
| **Người dùng** | Mọi thao tác trong Cocos Editor: scene, prefab, gán node/component, sắp xếp UI, import asset |

**Claude KHÔNG tự thao tác trên Cocos Editor.**
Khi một bước cần làm trong Editor, Claude chỉ hướng dẫn từng bước rõ ràng cho người dùng thực hiện.
Nếu code cần reference từ Editor (ví dụ `@property`), Claude nêu rõ: cần gán node/asset nào, ở component nào, trên object nào trong scene/prefab.

---

## Quy tắc sửa code

1. **Chỉ sửa đúng file cần sửa, đúng đoạn cần thay đổi.** Không lan sang file khác không liên quan.
2. **Không tự ý đổi tên** biến, hàm, class đang dùng.
3. **Không xóa code đang chạy tốt** trừ khi được yêu cầu rõ ràng.
4. **Không refactor ngoài phạm vi yêu cầu.** Ba dòng lặp tốt hơn một abstraction chưa cần thiết.
5. **Giữ nguyên style và cấu trúc code hiện có.** Ưu tiên diff tối thiểu (minimal diff).
6. **Không thêm comment giải thích** trừ khi lý do thực sự không rõ ràng từ code.

---

## Quy tắc giao tiếp

- **Trả lời bằng tiếng Việt**, ngắn gọn, đúng trọng tâm.
- **Trước khi sửa bất kỳ file nào**, nêu rõ:
  - Sẽ sửa file nào, đoạn nào (dòng mấy / hàm nào).
  - Lý do cần sửa.
- **Sau mỗi lần sửa code hoặc mỗi giai đoạn hoàn thành**, cung cấp hướng dẫn chi tiết các bước thực hiện trên Cocos Editor (nếu có), theo format:

```
## Các bước thực hiện trên Cocos Editor

1. Mở scene / prefab: [tên file]
2. Chọn Node: [tên node]
3. Thêm Component / Gán property: [tên component] → [tên field] = [giá trị / asset]
...
```

---

## Cấu trúc thư mục quan trọng

```
assets/          ← toàn bộ source TypeScript, scene, prefab, sprite
library/         ← do Cocos tự sinh, không chỉnh tay
settings/        ← cấu hình project Cocos
tsconfig.json    ← cấu hình TypeScript
```

---

## Lưu ý đặc thù Cocos Creator

- Decorator `@property` dùng để expose field lên Inspector — sau khi thêm property mới, nhắc người dùng **lưu file → quay lại Cocos Editor → gán giá trị trên Inspector**.
- Khi tạo component mới, nhắc người dùng **Add Component** trên đúng Node trong scene/prefab.
- Đường dẫn asset trong code dùng `resources.load` hoặc bundle — không hardcode đường dẫn tuyệt đối.
- Tránh dùng `find()` theo tên node chuỗi khi có thể dùng `@property` reference thay thế.
