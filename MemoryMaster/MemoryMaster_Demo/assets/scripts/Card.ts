import { _decorator, Component, Node, Label, UITransform, Graphics, Color, tween, Tween, Vec3 } from 'cc';
import { GameManager } from './GameManager';

const { ccclass, property } = _decorator;

@ccclass('Card')
export class Card extends Component {

    @property(Node)  frontFace: Node = null!;
    @property(Node)  backFace: Node = null!;
    @property(Label) emojiLabel: Label = null!;

    emoji = '';
    private gm: GameManager = null!;
    private isFlipped   = false;
    private isMatched   = false;
    private isAnimating = false;

    init(emoji: string, cardSize: number, gm: GameManager) {
        this.emoji = emoji;
        this.gm    = gm;

        // Resize all layers to match calculated card size
        this.node.getComponent(UITransform)!.setContentSize(cardSize, cardSize);
        this.frontFace.getComponent(UITransform)!.setContentSize(cardSize, cardSize);
        this.backFace.getComponent(UITransform)!.setContentSize(cardSize, cardSize);
        this.emojiLabel.node.getComponent(UITransform)!.setContentSize(cardSize, cardSize);

        // Scale font to fit card; 0.55 ratio keeps emoji comfortably inside
        this.emojiLabel.string   = emoji;
        this.emojiLabel.fontSize = Math.floor(cardSize * 0.55);

        // Draw solid-color backgrounds with Graphics (no external assets needed)
        this.drawFace(this.backFace,  cardSize, new Color(74,  128, 245, 255)); // blue
        this.drawFace(this.frontFace, cardSize, new Color(255, 230, 140, 255)); // yellow

        this.frontFace.active = false;
        this.backFace.active  = true;

        this.node.on(Node.EventType.TOUCH_END, this.onTouch, this);
    }

    private drawFace(face: Node, size: number, color: Color) {
        const g = face.getComponent(Graphics)!;
        g.clear();
        g.fillColor = color;
        g.roundRect(-size / 2, -size / 2, size, size, 12);
        g.fill();
    }

    private onTouch() {
        if (!this.gm || this.gm.inputLocked || this.isFlipped || this.isMatched || this.isAnimating) return;
        this.flipForward(() => this.gm.onCardFlipped(this));
    }

    private flipForward(onDone: () => void) {
        this.isAnimating = true;
        tween(this.node)
            .to(0.1, { scale: new Vec3(0, 1, 1) })
            .call(() => {
                this.frontFace.active = true;
                this.backFace.active  = false;
            })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .call(() => {
                this.isFlipped   = true;
                this.isAnimating = false;
                onDone();
            })
            .start();
    }

    flipBack(onDone?: () => void) {
        if (!this.isFlipped || this.isMatched || this.isAnimating) return;
        this.isAnimating = true;
        tween(this.node)
            .to(0.1, { scale: new Vec3(0, 1, 1) })
            .call(() => {
                this.frontFace.active = false;
                this.backFace.active  = true;
            })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .call(() => {
                this.isFlipped   = false;
                this.isAnimating = false;
                onDone?.();
            })
            .start();
    }

    setMatched() {
        this.isMatched = true;
        this.isFlipped = true;
        this.node.off(Node.EventType.TOUCH_END, this.onTouch, this);
    }

    onDestroy() {
        Tween.stopAllByTarget(this.node);
    }
}
