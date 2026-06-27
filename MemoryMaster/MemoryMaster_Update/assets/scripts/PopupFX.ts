import { Node, Graphics, UITransform, UIOpacity, Label, Color, Vec3, tween } from 'cc';

export class PopupFX {

    static confetti(popup: Node, count = 20) {
        const COLORS = [
            new Color(255,  80,  80, 255),
            new Color(255, 200,  50, 255),
            new Color( 80, 200, 100, 255),
            new Color( 80, 150, 255, 255),
            new Color(220, 100, 255, 255),
        ];
        for (let i = 0; i < count; i++) {
            const n = new Node('fx_confetti');
            popup.addChild(n);
            n.setPosition(0, 0, 0);
            n.addComponent(UITransform).setContentSize(10, 10);
            const g  = n.addComponent(Graphics);
            g.fillColor = COLORS[i % COLORS.length];
            g.rect(-5, -5, 10, 10);
            g.fill();
            const op = n.addComponent(UIOpacity);

            const angle = Math.random() * Math.PI * 2;
            const dist  = 80 + Math.random() * 200;
            const tx    = Math.cos(angle) * dist;
            const ty    = Math.sin(angle) * dist;
            const dur   = 0.55 + Math.random() * 0.3;

            tween(n)
                .to(dur, { position: new Vec3(tx, ty, 0) }, { easing: 'sineOut' })
                .start();
            tween(n)
                .to(dur, { angle: n.angle + 360 * (Math.random() > 0.5 ? 2 : -2) })
                .start();
            tween(op)
                .delay(dur * 0.4)
                .to(dur * 0.6, { opacity: 0 })
                .call(() => { if (n.isValid) n.destroy(); })
                .start();
        }
    }

    static shake(node: Node) {
        const p = node.position.clone();
        tween(node)
            .to(0.05, { position: new Vec3(p.x - 12, p.y, p.z) })
            .to(0.05, { position: new Vec3(p.x + 12, p.y, p.z) })
            .to(0.05, { position: new Vec3(p.x -  9, p.y, p.z) })
            .to(0.05, { position: new Vec3(p.x +  9, p.y, p.z) })
            .to(0.05, { position: new Vec3(p.x -  5, p.y, p.z) })
            .to(0.05, { position: new Vec3(p.x +  5, p.y, p.z) })
            .to(0.05, { position: new Vec3(p.x,      p.y, p.z) })
            .start();
    }

    static starBurst(popup: Node) {
        const COUNT = 8;
        for (let i = 0; i < COUNT; i++) {
            const n = new Node('fx_star');
            popup.addChild(n);
            n.setPosition(0, 0, 0);
            n.setScale(0, 0, 1);
            n.addComponent(UITransform).setContentSize(36, 36);
            const lbl = n.addComponent(Label);
            lbl.string   = '★';
            lbl.fontSize = 30;
            lbl.color    = new Color(255, 215, 0, 255);
            const op = n.addComponent(UIOpacity);

            const angle = (Math.PI * 2 * i) / COUNT;
            const dist  = 110 + Math.random() * 50;
            const tx    = Math.cos(angle) * dist;
            const ty    = Math.sin(angle) * dist;

            tween(n)
                .to(0.22, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' })
                .to(0.12, { scale: new Vec3(1,   1,   1) })
                .start();
            tween(n)
                .to(0.5, { position: new Vec3(tx, ty, 0) }, { easing: 'sineOut' })
                .start();
            tween(op)
                .delay(0.2)
                .to(0.38, { opacity: 0 })
                .call(() => { if (n.isValid) n.destroy(); })
                .start();
        }
        PopupFX.confetti(popup, 12);
    }
}
