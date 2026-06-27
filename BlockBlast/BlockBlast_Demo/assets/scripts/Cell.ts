import { _decorator, Component, Sprite, Color, SpriteFrame, tween, Vec3, UIOpacity } from 'cc';
import { GameConfig } from './GameConfig';
const { ccclass, property } = _decorator;

@ccclass('Cell')
export class Cell extends Component {

    @property(Sprite)
    sprite: Sprite = null!;

    @property(SpriteFrame)
    filledFrame: SpriteFrame = null!;

    filled: boolean = false;
    cellColor: Color = new Color(255, 255, 255, 255);

    private emptyFrame: SpriteFrame | null = null;

    onLoad(): void {
        this.emptyFrame = this.sprite.spriteFrame;
    }

    setFilled(color: Color): void {
        this.filled    = true;
        this.cellColor = color.clone();
        if (this.filledFrame) this.sprite.spriteFrame = this.filledFrame;
        this.sprite.color = color;
    }

    clear(): void {
        this.filled    = false;
        this.cellColor = new Color(255, 255, 255, 60);
        if (this.emptyFrame) this.sprite.spriteFrame = this.emptyFrame;
        this.sprite.color = new Color(255, 255, 255, 60);
        // Phục hồi đúng scale CELL_SCALE, không reset về 1
        this.node.setScale(GameConfig.CELL_SCALE, GameConfig.CELL_SCALE, 1);
        const op = this.node.getComponent(UIOpacity);
        if (op) op.opacity = 255;
    }

    setHighlight(color: Color, alpha: number = 115): void {
        const c = color.clone();
        c.a = alpha;
        this.sprite.color = c;
    }

    clearHighlight(): void {
        if (this.filled) {
            if (this.filledFrame) this.sprite.spriteFrame = this.filledFrame;
            this.sprite.color = this.cellColor;
        } else {
            if (this.emptyFrame) this.sprite.spriteFrame = this.emptyFrame;
            this.sprite.color = new Color(255, 255, 255, 60);
        }
    }

    // ─── A1: Pop-in khi đặt khối ────────────────────────────────────

    popIn(delaySeconds: number = 0): void {
        const cs = GameConfig.CELL_SCALE;
        this.node.setScale(0, 0, 1);
        tween(this.node)
            .delay(delaySeconds)
            .to(0.09, { scale: new Vec3(cs * 1.25, cs * 1.25, 1) }, { easing: 'quadOut' })
            .to(0.08, { scale: new Vec3(cs, cs, 1) },               { easing: 'quadIn'  })
            .start();
    }

    // ─── A2: Line clear — scale về 0 rồi restore empty ──────────────

    clearLineAnim(delaySeconds: number = 0): void {
        const cs = GameConfig.CELL_SCALE;
        tween(this.node)
            .delay(delaySeconds)
            .to(0.06, { scale: new Vec3(cs * 1.2, cs * 1.2, 1) }, { easing: 'quadOut' })
            .to(0.20, { scale: new Vec3(0, 0, 1) },               { easing: 'backIn'  })
            .call(() => { this.clear(); })
            .start();
    }

    // ─── A5: Game Over — clone rơi xuống, nền giữ nguyên ─────────────

    breakAndFall(delaySeconds: number = 0): void {
        const op = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
        op.opacity = 255;

        const cs       = GameConfig.CELL_SCALE;
        const startPos = this.node.position.clone();

        tween(this.node)
            .delay(delaySeconds)
            .to(0.06, { scale: new Vec3(cs * 1.15, cs * 1.15, 1) })
            .to(0.38, {
                position: new Vec3(startPos.x, startPos.y - 220, startPos.z),
                scale:    new Vec3(cs * 0.4,   cs * 0.4,   1),
            }, { easing: 'quadIn' })
            .call(() => {
                this.node.setPosition(startPos);
                op.opacity = 255;
                this.clear();
            })
            .start();

        tween(op)
            .delay(delaySeconds + 0.06)
            .to(0.38, { opacity: 0 }, { easing: 'quadIn' })
            .start();
    }

    // ─── Combo: đổi màu ô filled sang màu ngẫu nhiên ────────────────

    changeColor(newColor: Color, delay: number = 0): void {
        if (!this.filled) return;
        this.scheduleOnce(() => {
            if (!this.filled) return;
            this.cellColor    = newColor.clone();
            this.sprite.color = newColor;
        }, delay);
    }

    // ─── F5: Highlight báo line sắp bị clear ────────────────────────

    setClearPreview(): void {
        const c = this.cellColor;
        this.sprite.color = new Color(
            Math.min(255, c.r + 60),
            Math.min(255, c.g + 60),
            Math.min(255, c.b + 60),
            255,
        );
    }
}
