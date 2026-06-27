import { _decorator, Component, Node, UIOpacity, UITransform, Graphics, Color, tween, Tween, Vec3, view, director } from 'cc';
import { AudioManager } from './AudioManager';

const { ccclass, property } = _decorator;

@ccclass('IntroManager')
export class IntroManager extends Component {

    @property(Node) titleNode: Node = null!;
    @property(Node) btnChallenge: Node = null!;
    @property(Node) btnClassic: Node = null!;

    private _overlay: Node | null = null;
    private _uiOp: UIOpacity | null = null;
    private _titleOrigPos = new Vec3();
    private _titleUiOp: UIOpacity | null = null;
    private _btnOrigPos: Vec3[] = [];
    private _btnUiOps: (UIOpacity | null)[] = [];

    onLoad() {
        this._overlay = this.createOverlay();
        this._uiOp = this._overlay.getComponent(UIOpacity)!;
        this._uiOp.opacity = 255;

        if (this.titleNode) {
            this._titleOrigPos.set(this.titleNode.position);
            this._titleUiOp = this.titleNode.getComponent(UIOpacity) ?? this.titleNode.addComponent(UIOpacity);
            this._titleUiOp.opacity = 0;
            this.titleNode.setPosition(this._titleOrigPos.x, this._titleOrigPos.y + 120, this._titleOrigPos.z);
        }

        [this.btnChallenge, this.btnClassic].forEach((btn, i) => {
            if (!btn) return;
            this._btnOrigPos[i] = btn.position.clone();
            const uiOp = btn.getComponent(UIOpacity) ?? btn.addComponent(UIOpacity);
            uiOp.opacity = 0;
            this._btnUiOps[i] = uiOp;
            btn.setPosition(this._btnOrigPos[i].x, this._btnOrigPos[i].y - 80, this._btnOrigPos[i].z);
        });
    }

    start() {
        AudioManager.playBGM('intro');
        tween(this._uiOp!)
            .to(0.5, { opacity: 0 }, { easing: 'sineInOut' })
            .call(() => { this._overlay?.destroy(); this._overlay = null; })
            .start();

        if (this.titleNode && this._titleUiOp) {
            tween(this.titleNode)
                .to(0.55, { position: new Vec3(this._titleOrigPos.x, this._titleOrigPos.y, this._titleOrigPos.z) }, { easing: 'backOut' })
                .start();
            tween(this._titleUiOp)
                .to(0.4, { opacity: 255 }, { easing: 'sineOut' })
                .start();
        }

        [this.btnChallenge, this.btnClassic].forEach((btn, i) => {
            if (!btn || !this._btnOrigPos[i] || !this._btnUiOps[i]) return;
            this.scheduleOnce(() => {
                tween(btn)
                    .to(0.45, { position: new Vec3(this._btnOrigPos[i].x, this._btnOrigPos[i].y, this._btnOrigPos[i].z) }, { easing: 'backOut' })
                    .start();
                tween(this._btnUiOps[i]!)
                    .to(0.35, { opacity: 255 }, { easing: 'sineOut' })
                    .start();
            }, 0.25 + i * 0.1);
        });
    }

    onChallengeBtn() { AudioManager.playSFX('click'); this.exitAndLoad('ChallengeScene'); }
    onClassicBtn()   { AudioManager.playSFX('click'); this.exitAndLoad('MenuScene'); }

    private exitAndLoad(scene: string) {
        if (this.titleNode && this._titleUiOp) {
            Tween.stopAllByTarget(this.titleNode);
            Tween.stopAllByTarget(this._titleUiOp);
            tween(this.titleNode)
                .to(0.22, { position: new Vec3(this._titleOrigPos.x, this._titleOrigPos.y + 40, this._titleOrigPos.z) }, { easing: 'sineIn' })
                .start();
            tween(this._titleUiOp)
                .to(0.18, { opacity: 0 }, { easing: 'sineIn' })
                .start();
        }
        [this.btnChallenge, this.btnClassic].forEach((btn, i) => {
            if (!btn || !this._btnUiOps[i]) return;
            Tween.stopAllByTarget(btn);
            Tween.stopAllByTarget(this._btnUiOps[i]!);
            this.scheduleOnce(() => {
                tween(btn)
                    .to(0.18, { position: new Vec3(this._btnOrigPos[i].x, this._btnOrigPos[i].y - 40, this._btnOrigPos[i].z) }, { easing: 'sineIn' })
                    .start();
                tween(this._btnUiOps[i]!)
                    .to(0.15, { opacity: 0 }, { easing: 'sineIn' })
                    .start();
            }, i * 0.05);
        });
        this.scheduleOnce(() => this.fadeOut(() => director.loadScene(scene)), 0.12);
    }

    private fadeOut(onComplete: () => void) {
        const overlay = this.createOverlay();
        const uiOp = overlay.getComponent(UIOpacity)!;
        uiOp.opacity = 0;
        tween(uiOp)
            .to(0.35, { opacity: 255 }, { easing: 'sineInOut' })
            .delay(0.1)
            .call(onComplete)
            .start();
    }

    private createOverlay(): Node {
        const vSize = view.getVisibleSize();
        const overlay = new Node('__FadeOverlay');
        this.node.parent!.addChild(overlay);
        overlay.setSiblingIndex(9999);
        overlay.addComponent(UITransform).setContentSize(vSize.width, vSize.height);
        const g = overlay.addComponent(Graphics);
        g.fillColor = new Color(20, 15, 40, 255);
        g.rect(-vSize.width / 2, -vSize.height / 2, vSize.width, vSize.height);
        g.fill();
        overlay.addComponent(UIOpacity);
        return overlay;
    }
}
