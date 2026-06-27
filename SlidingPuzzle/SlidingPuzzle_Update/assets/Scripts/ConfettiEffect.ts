import { _decorator, Component, Node, Graphics, UIOpacity, tween, Vec3, Color } from 'cc';
const { ccclass } = _decorator;

/**
 * ConfettiEffect.ts
 * Gắn vào một node bất kỳ (thường là ConfettiLayer dưới Canvas).
 * Gọi play() khi thắng để mảnh confetti màu rơi từ trên xuống.
 * Gọi stop() khi cần dừng sớm (restart).
 */
@ccclass('ConfettiEffect')
export class ConfettiEffect extends Component {

    private _particles: Node[] = [];

    /** Phát hiệu ứng confetti — spawn 45 mảnh với stagger 0.035s */
    play() {
        this._stopAll();
        const COUNT = 45;
        for (let i = 0; i < COUNT; i++) {
            this._spawnParticle(i * 0.035);
        }
    }

    /** Dừng và dọn sạch tất cả mảnh confetti đang rơi */
    stop() {
        this._stopAll();
    }

    private _spawnParticle(delay: number) {
        const p = new Node('confetti');
        this.node.addChild(p);
        this._particles.push(p);

        // 6 màu sắc cho confetti
        const PALETTE: [number, number, number][] = [
            [255, 80,  80],   // đỏ
            [255, 200,  0],   // vàng
            [60,  200, 100],  // xanh lá
            [80,  160, 255],  // xanh dương
            [200,  80, 255],  // tím
            [255, 140,  0],   // cam
        ];
        const [r, g, b] = PALETTE[Math.floor(Math.random() * PALETTE.length)];

        // Vẽ hình chữ nhật nhỏ làm mảnh confetti
        const gfx = p.addComponent(Graphics);
        gfx.fillColor = new Color(r, g, b, 255);
        const w = 8 + Math.random() * 8;
        const h = 4 + Math.random() * 6;
        gfx.rect(-w / 2, -h / 2, w, h);
        gfx.fill();

        // Vị trí bắt đầu: rải đều phía trên màn hình
        const startX = (Math.random() - 0.5) * 700;
        const startY = 550 + Math.random() * 100;
        p.setPosition(startX, startY, 0);

        const op = p.addComponent(UIOpacity);
        op.opacity = 255;

        const duration = 1.8 + Math.random() * 1.4;
        const endX    = startX + (Math.random() - 0.5) * 150;
        const endY    = -720;
        const endAngle = (Math.random() - 0.5) * 720;

        // Rơi xuống + xoay
        tween(p)
            .delay(delay)
            .to(duration, { position: new Vec3(endX, endY, 0), angle: endAngle })
            .call(() => { if (p?.isValid) p.destroy(); })
            .start();

        // Mờ dần ở 65% quãng đường
        tween(op)
            .delay(delay + duration * 0.65)
            .to(duration * 0.35, { opacity: 0 })
            .start();
    }

    private _stopAll() {
        for (const p of this._particles) {
            if (p?.isValid) p.destroy();
        }
        this._particles = [];
    }

    onDestroy() {
        this._stopAll();
    }
}
