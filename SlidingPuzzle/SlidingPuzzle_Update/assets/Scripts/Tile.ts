import { _decorator, Component, Node, UITransform, Vec3, tween } from 'cc';
const { ccclass } = _decorator;

/**
 * Tile.ts
 * Gắn vào mỗi node ô gạch trong scene.
 * - Lưu con số CỐ ĐỊNH (tileNumber 1..8) suốt ván chơi.
 * - Lưu vị trí hiện tại trên lưới (row, col) — thứ duy nhất thay đổi khi di chuyển.
 * - Bắt sự kiện chạm và báo về GameManager qua callback.
 */
@ccclass('Tile')
export class Tile extends Component {

    // Con số cố định của ô này (1..8), được gán bởi GameManager lúc khởi tạo
    public tileNumber: number = 0;

    // Vị trí hiện tại trên lưới — cập nhật mỗi khi tile trượt
    public row: number = 0;
    public col: number = 0;

    // Hàm callback báo về GameManager khi tile được chạm
    private _clickCallback: ((tile: Tile) => void) | null = null;

    onLoad() {
        // Kiểm tra UITransform tồn tại để vùng nhận click hoạt động đúng
        if (!this.node.getComponent(UITransform)) {
            console.warn(`[Tile] Node "${this.node.name}" thiếu UITransform — vùng click có thể không hoạt động.`);
        }

        // Đăng ký sự kiện chạm vào node này
        this.node.on(Node.EventType.TOUCH_END, this._onTouched, this);
    }

    onDestroy() {
        // Hủy đăng ký để tránh memory leak khi node bị destroy
        this.node.off(Node.EventType.TOUCH_END, this._onTouched, this);
    }

    /** Đăng ký hàm xử lý click từ GameManager */
    public setClickCallback(callback: (tile: Tile) => void) {
        this._clickCallback = callback;
    }

    /** Gọi callback khi tile được chạm */
    private _onTouched() {
        if (this._clickCallback) {
            this._clickCallback(this);
        }
    }

    /**
     * Di chuyển mượt tới vị trí pixel mới bằng tween (~0.15 giây).
     * @param targetPos  Tọa độ local đích
     * @param onComplete Callback gọi sau khi tween hoàn thành (tùy chọn)
     */
    public moveTo(targetPos: Vec3, onComplete?: () => void) {
        tween(this.node)
            .to(0.15, { position: targetPos })
            .call(() => {
                if (onComplete) onComplete();
            })
            .start();
    }
}
