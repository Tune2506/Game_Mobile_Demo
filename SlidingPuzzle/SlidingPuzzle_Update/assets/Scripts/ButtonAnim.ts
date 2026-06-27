import { _decorator, Component, Node, Vec3, tween, Tween } from 'cc';
const { ccclass } = _decorator;

/**
 * ButtonAnim.ts
 * Gắn vào bất kỳ node nút nào để có press animation.
 * Không cần wire event — tự đăng ký TOUCH trực tiếp trên node.
 *
 * THIẾT LẬP:
 *  1. Add Component → ButtonAnim trên node nút
 *  2. Component Button → Transition → đổi thành None
 */
@ccclass('ButtonAnim')
export class ButtonAnim extends Component {

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START,  this._onDown,   this);
        this.node.on(Node.EventType.TOUCH_END,    this._onUp,     this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this._onCancel, this);
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START,  this._onDown,   this);
        this.node.off(Node.EventType.TOUCH_END,    this._onUp,     this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this._onCancel, this);
        Tween.stopAllByTarget(this.node);
    }

    // Nhấn xuống → thu nhỏ nhẹ cho cảm giác vật lý
    private _onDown() {
        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(0.08, { scale: new Vec3(0.85, 0.85, 1) })
            .start();
    }

    // Thả tay → nảy lên vượt ngưỡng rồi về 1.0
    private _onUp() {
        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(0.15, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'backOut' })
            .to(0.08, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    // Hủy chạm (kéo ngón ra ngoài) → spring về 1.0
    private _onCancel() {
        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }
}
