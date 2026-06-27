import { Node, Size, Color, UITransform, UIOpacity, Graphics, tween, director } from 'cc';

/**
 * SceneTransition
 * Tiện ích chuyển cảnh với hiệu ứng fade-to-black.
 * Không cần gắn vào node — dùng qua static methods.
 *
 * Luồng chuyển scene:
 *   fade sang đen (FADE_OUT giây)  ──►  loadScene  ──►  fade từ đen ra (FADE_IN giây)
 *
 * Nếu scene nguồn có MenuAnim, outro chạy SONG SONG với fade để màn hình
 * mượt hơn thay vì chờ outro xong rồi mới fade.
 */
export class SceneTransition {

    private static readonly FADE_OUT = 0.45;
    private static readonly FADE_IN  = 0.45;

    // Cờ ngăn trigger nhiều lần khi bấm nhanh
    private static _isTransitioning: boolean = false;

    /**
     * Chuyển sang scene mới:
     * 1. Fade màn hình sang đen (FADE_OUT giây)
     * 2. Nếu có MenuAnim → outro chạy song song với fade
     * 3. Load scene
     *
     * @param sceneName  Tên scene đích (khớp tên file .scene)
     * @param callerNode Node gọi hàm — phải là con trực tiếp của Canvas
     */
    static go(sceneName: string, callerNode: Node): void {
        if (SceneTransition._isTransitioning) return;
        SceneTransition._isTransitioning = true;

        const canvas = callerNode.parent;
        if (!canvas) {
            director.loadScene(sceneName);
            SceneTransition._isTransitioning = false;
            return;
        }

        const overlay  = SceneTransition._createOverlay(canvas);
        const opComp   = overlay.getComponent(UIOpacity)!;
        opComp.opacity = 0;

        // Fade sang đen rồi load — overlay và outro chạy ĐỒNG THỜI
        tween(opComp)
            .to(SceneTransition.FADE_OUT, { opacity: 255 })
            .call(() => director.loadScene(sceneName))
            .start();

        // Dùng string lookup để tránh circular import với MenuAnim
        const menuAnim = canvas.getComponent('MenuAnim') as any;
        if (menuAnim?.playOutro) {
            // Outro chạy song song — không cần callback vì scene sẽ destroy trước khi outro xong
            menuAnim.playOutro(() => {});
        }
    }

    /**
     * Fade từ đen → trong suốt khi vào scene mới.
     * Gọi trong onEnable() của GameManager hoặc start() của MenuAnim.
     *
     * @param canvas  Node Canvas của scene mới
     */
    static fadeIn(canvas: Node): void {
        // Reset cờ để scene mới có thể dùng SceneTransition.go() bình thường
        SceneTransition._isTransitioning = false;

        const overlay  = SceneTransition._createOverlay(canvas);
        const opComp   = overlay.getComponent(UIOpacity)!;
        opComp.opacity = 255;

        tween(opComp)
            .to(SceneTransition.FADE_IN, { opacity: 0 })
            .call(() => { if (overlay.isValid) overlay.destroy(); })
            .start();
    }

    // ─── NỘI BỘ ─────────────────────────────────────────────────────────

    /** Tạo node overlay đen phủ toàn màn hình, xếp trên cùng của Canvas */
    private static _createOverlay(canvas: Node): Node {
        const overlay = new Node('__FadeOverlay__');
        canvas.addChild(overlay);
        overlay.setPosition(0, 0, 0);
        overlay.layer = canvas.layer;

        const ui = overlay.addComponent(UITransform);
        ui.setContentSize(new Size(2000, 2000));

        const gfx = overlay.addComponent(Graphics);
        gfx.fillColor = new Color(0, 0, 0, 255);
        gfx.rect(-1000, -1000, 2000, 2000);
        gfx.fill();

        overlay.addComponent(UIOpacity);
        overlay.setSiblingIndex(canvas.children.length);
        return overlay;
    }
}
