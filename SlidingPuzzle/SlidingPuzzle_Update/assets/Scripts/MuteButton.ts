import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, UIOpacity, Size, Vec3, tween, Tween } from 'cc';
import { SoundManager } from './SoundManager';
const { ccclass, property } = _decorator;

/**
 * MuteButton.ts
 * Gắn vào node speaker trong mỗi scene (Menu + Easy + Medium + Hard).
 * Xử lý touch trực tiếp — KHÔNG cần wiring Click Event trong Inspector.
 *
 * THIẾT LẬP TRONG INSPECTOR:
 *  - iconSprite    : kéo Sprite component của chính node này vào
 *  - iconOn        : SpriteFrame icon loa bật
 *  - iconOff       : SpriteFrame icon loa tắt
 *  - entranceDelay : độ trễ trước khi nút xuất hiện (giây) — mặc định 0.4
 *
 * ANIMATION:
 *  - Xuất hiện : fade in + pop scale với backOut sau entranceDelay
 *  - TOUCH_START : thu nhỏ 0.82 (press feedback)
 *  - TOUCH_END   : wink out theo trục X → đổi icon → pop ra → về 1.0
 *  - TOUCH_CANCEL: nảy về 1.0 (backOut)
 */
@ccclass('MuteButton')
export class MuteButton extends Component {

    @property(Sprite)
    public iconSprite: Sprite = null!;

    @property(SpriteFrame)
    public iconOn: SpriteFrame = null!;

    @property(SpriteFrame)
    public iconOff: SpriteFrame = null!;

    /** Thời gian chờ trước khi nút xuất hiện — điều chỉnh theo scene nếu cần */
    @property
    public entranceDelay: number = 0.4;

    // Kích thước gốc — lưu lại để khôi phục sau mỗi lần đổi spriteFrame
    private _fixedSize: Size = null!;
    private _opacity: UIOpacity = null!;

    onLoad() {
        const ui = this.node.getComponent(UITransform);
        if (ui) this._fixedSize = ui.contentSize.clone();

        // Lấy hoặc thêm UIOpacity để điều khiển fade
        this._opacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);

        // Ẩn ngay từ đầu — entrance animation sẽ hiện ra sau
        this.node.setScale(new Vec3(0, 0, 1));
        this._opacity.opacity = 0;

        this.node.on(Node.EventType.TOUCH_START,  this._onTouchStart,  this);
        this.node.on(Node.EventType.TOUCH_END,    this._onTouchEnd,    this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this._onTouchCancel, this);
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START,  this._onTouchStart,  this);
        this.node.off(Node.EventType.TOUCH_END,    this._onTouchEnd,    this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this._onTouchCancel, this);
        Tween.stopAllByTarget(this.node);
        if (this._opacity) Tween.stopAllByTarget(this._opacity);
    }

    start() {
        this._updateIcon();
        this._playEntrance();
    }

    // ─── ENTRANCE ────────────────────────────────────────────────────

    private _playEntrance() {
        // Fade in đồng thời với pop scale
        tween(this._opacity)
            .delay(this.entranceDelay)
            .to(0.22, { opacity: 255 })
            .start();

        // Scale từ 0 → vượt ngưỡng (1.25) với backOut → về 1.0
        tween(this.node)
            .delay(this.entranceDelay)
            .to(0.32, { scale: new Vec3(1.25, 1.25, 1) }, { easing: 'backOut' })
            .to(0.1,  { scale: new Vec3(1, 1, 1) })
            .start();
    }

    // ─── TOUCH ───────────────────────────────────────────────────────

    // Nhấn xuống → thu nhỏ nhẹ cho cảm giác vật lý
    private _onTouchStart() {
        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(0.08, { scale: new Vec3(0.82, 0.82, 1) })
            .start();
    }

    // Thả tay → toggle + flip animation
    private _onTouchEnd() {
        Tween.stopAllByTarget(this.node);
        SoundManager.toggle();
        // Thu theo trục X về 0 (wink out) → đổi icon ở điểm giữa → pop ra với bounce
        tween(this.node)
            .to(0.09, { scale: new Vec3(0, 0.82, 1) })
            .call(() => this._updateIcon())
            .to(0.18, { scale: new Vec3(1.18, 1.18, 1) }, { easing: 'backOut' })
            .to(0.08, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    // Hủy chạm (kéo ra ngoài) → nảy về bình thường
    private _onTouchCancel() {
        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(0.15, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    // ─── ICON ────────────────────────────────────────────────────────

    private _updateIcon() {
        if (!this.iconSprite) return;
        this.iconSprite.spriteFrame = SoundManager.muted ? this.iconOff : this.iconOn;
        // Giữ sizeMode CUSTOM — Cocos có thể reset sau khi đổi SpriteFrame
        this.iconSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        if (this._fixedSize) {
            this.node.getComponent(UITransform)?.setContentSize(this._fixedSize);
        }
    }
}
