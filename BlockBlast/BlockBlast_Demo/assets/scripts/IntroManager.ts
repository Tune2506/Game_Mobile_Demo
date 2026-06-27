import { _decorator, Component, Button, director, tween, Vec3, Node, Label, sys, input, Input } from 'cc';
import { AudioManager } from './AudioManager';
const { ccclass, property } = _decorator;

@ccclass('IntroManager')
export class IntroManager extends Component {

    @property(Button)
    playButton: Button = null!;

    @property(Node)
    titleNode: Node = null!;    // Node chứa tên game (để animate)

    @property(Node)
    playBtnNode: Node = null!;  // Node button (để animate)

    @property(Label)
    bestScoreLabel: Label = null!;

    start(): void {
        this.updateBestScore();
        this.playIntroAnim();
        this.playButton.node.on(Button.EventType.CLICK, this.onPlay, this);
        AudioManager.instance?.playMenuBGM();
        // Browser block autoplay lần đầu → retry khi có tương tác đầu tiên
        input.once(Input.EventType.TOUCH_START, this._onFirstTouch, this);
    }

    private _onFirstTouch(): void {
        AudioManager.instance?.playMenuBGM();
    }

    private updateBestScore(): void {
        if (!this.bestScoreLabel) return;
        const hs = parseInt(sys.localStorage.getItem('blockblast_highscore') ?? '0', 10);
        this.bestScoreLabel.string = `Best: ${hs}`;
    }

    onDestroy(): void {
        this.playButton?.node?.off(Button.EventType.CLICK, this.onPlay, this);
        input.off(Input.EventType.TOUCH_START, this._onFirstTouch, this);
    }

    // ─── Hiệu ứng intro khi mở scene ─────────────────────────────────

    private playIntroAnim(): void {
        // Title rơi từ trên xuống
        if (this.titleNode) {
            const originY = this.titleNode.position.y;
            this.titleNode.setPosition(this.titleNode.position.x, originY + 300, 0);
            tween(this.titleNode)
                .to(0.55, { position: new Vec3(this.titleNode.position.x, originY, 0) },
                    { easing: 'backOut' })
                .start();
        }

        // Button fade-in sau 0.4s
        if (this.playBtnNode) {
            this.playBtnNode.setScale(0, 0, 1);
            tween(this.playBtnNode)
                .delay(0.4)
                .to(0.35, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .start();
        }
    }

    // ─── Chuyển sang GameScene ────────────────────────────────────────

    private onPlay(): void {
        AudioManager.instance?.playClick();
        const btn = this.playBtnNode ?? this.playButton.node;

        // 1. Button: bounce → phồng → thu về 0
        tween(btn)
            .to(0.08, { scale: new Vec3(0.82, 0.82, 1) })
            .to(0.10, { scale: new Vec3(1.15, 1.15, 1) })
            .to(0.20, { scale: new Vec3(0,    0,    1) }, { easing: 'backIn' })
            .start();

        // 2. Title bay lên
        if (this.titleNode) {
            const tx = this.titleNode.position.x;
            const ty = this.titleNode.position.y;
            tween(this.titleNode)
                .delay(0.08)
                .to(0.32, { position: new Vec3(tx, ty + 500, 0) }, { easing: 'backIn' })
                .start();
        }

        // 3. Load scene sau khi anim xong (GameScene sẽ tự fade-in từ đen)
        this.scheduleOnce(() => director.loadScene('GameScene'), 0.42);
    }
}
