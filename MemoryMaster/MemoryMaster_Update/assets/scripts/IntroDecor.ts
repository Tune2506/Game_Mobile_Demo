import { _decorator, Component, Node, Sprite, SpriteFrame, tween, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('IntroDecor')
export class IntroDecor extends Component {

    @property(SpriteFrame) cardCat: SpriteFrame = null!;
    @property(SpriteFrame) cardFox: SpriteFrame = null!;
    @property(SpriteFrame) cardRabbit: SpriteFrame = null!;
    @property(SpriteFrame) cardBear: SpriteFrame = null!;
    @property(SpriteFrame) mascotPink: SpriteFrame = null!;
    @property(SpriteFrame) mascotPurple: SpriteFrame = null!;

    onLoad() {
        const cards = [
            // Cặp 1 — trên title
            { frame: this.cardCat,      x: -265, y:  470, angle:  12 },
            { frame: this.cardFox,      x:  258, y:  480, angle: -14 },
            // Cặp 2 — ngang title
            { frame: this.mascotPink,   x: -268, y:  290, angle:   8 },
            { frame: this.mascotPurple, x:  262, y:  275, angle:  -8 },
            // Cặp 3 — ngang 2 nút Classic / Challenge
            { frame: this.cardRabbit,   x: -268, y: -120, angle: -10 },
            { frame: this.cardBear,     x:  262, y: -185, angle:  10 },
        ];

        cards.forEach(({ frame, x, y, angle }, i) => {
            const node = new Node();
            const sprite = node.addComponent(Sprite);
            sprite.spriteFrame = frame;
            sprite.sizeMode = Sprite.SizeMode.TRIMMED;
            node.setParent(this.node);
            node.setPosition(x, y);
            node.angle = angle;

            this.scheduleOnce(() => this.floatCard(node, angle), i * 0.25);
        });
    }

    private floatCard(node: Node, baseAngle: number) {
        const p = node.position.clone();
        tween(node)
            .to(2,   { position: new Vec3(p.x, p.y + 12, p.z) }, { easing: 'sineInOut' })
            .to(2,   { position: new Vec3(p.x, p.y - 12, p.z) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
        tween(node)
            .to(2.4, { angle: baseAngle + 4 }, { easing: 'sineInOut' })
            .to(2.4, { angle: baseAngle - 4 }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }
}
