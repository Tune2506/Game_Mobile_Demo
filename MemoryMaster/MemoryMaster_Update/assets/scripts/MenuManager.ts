import { _decorator, Component, Node, Label, UITransform, Sprite, SpriteFrame, Color, sys, director, tween, Tween, Vec3, UIOpacity, view, Graphics } from 'cc';
import { AudioManager } from './AudioManager';
import { LEVELS } from './LevelsConfig';

const { ccclass, property } = _decorator;

const SELECTED_LEVEL_KEY = 'Classic_SelectedLevel';
const BEST_TIME_PREFIX   = 'ClassicBestTime_';
const SPACING            = 15;
const PER_ROW            = 3;

const TILE_COLORS = [
    new Color(245, 110, 130, 255),
    new Color(250, 155,  75, 255),
    new Color(245, 205,  70, 255),
    new Color( 75, 195, 120, 255),
    new Color( 70, 195, 175, 255),
    new Color( 95, 165, 245, 255),
    new Color(145, 115, 220, 255),
    new Color(115,  75, 200, 255),
    new Color(240,  95, 115, 255),
];

@ccclass('MenuManager')
export class MenuManager extends Component {

    @property(Node) levelContainer: Node = null!;
    @property(SpriteFrame) tileFrame: SpriteFrame = null!;
    @property(Node) titleNode: Node = null!;
    @property(Node) badgeNode: Node = null!;
    @property(Node) backBinNode: Node = null!;

    private _overlay: Node | null = null;
    private _uiOp: UIOpacity | null = null;

    onLoad() {
        this._overlay = this.createOverlay();
        this._uiOp = this._overlay.getComponent(UIOpacity)!;
        this._uiOp.opacity = 255;
    }

    start() {
        AudioManager.playBGM('menu');
        this.buildMenu();
        this.animateHeader();
        this.animateTiles();
        tween(this._uiOp!)
            .to(0.5, { opacity: 0 }, { easing: 'sineInOut' })
            .call(() => { this._overlay?.destroy(); this._overlay = null; })
            .start();
    }

    private isCompleted(lvl: number): boolean {
        return sys.localStorage.getItem(BEST_TIME_PREFIX + lvl) !== null;
    }

    private buildMenu() {
        const cSize   = this.levelContainer.getComponent(UITransform)!.contentSize;
        const btnSize = Math.floor((cSize.width - SPACING * (PER_ROW - 1)) / PER_ROW);
        const startX  = -cSize.width / 2 + btnSize / 2;
        const startY  =  cSize.height / 2 - btnSize / 2;

        for (let i = 0; i < LEVELS.length; i++) {
            const lvl = i + 1;
            const col = i % PER_ROW;
            const row = Math.floor(i / PER_ROW);
            const x   = startX + col * (btnSize + SPACING);
            const y   = startY - row * (btnSize + SPACING);

            const btn = this.createBtn(lvl, btnSize);
            btn.setPosition(x, y, 0);

            btn.on(Node.EventType.TOUCH_START, () => {
                tween(btn).to(0.08, { scale: new Vec3(0.9, 0.9, 1) }).start();
            }, this);
            btn.on(Node.EventType.TOUCH_CANCEL, () => {
                tween(btn).to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
            }, this);
            btn.on(Node.EventType.TOUCH_END, () => {
                tween(btn)
                    .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                    .call(() => this.onLevelSelect(lvl))
                    .start();
            }, this);

            this.levelContainer.addChild(btn);
        }
    }

    private createBtn(lvl: number, btnSize: number): Node {
        const completed = this.isCompleted(lvl);
        const bestRaw   = sys.localStorage.getItem(BEST_TIME_PREFIX + lvl);

        const btn = new Node(`Btn_${lvl}`);
        btn.addComponent(UITransform).setContentSize(btnSize, btnSize);

        const sprNode = new Node('Tile');
        sprNode.addComponent(UITransform).setContentSize(btnSize, btnSize);
        const spr = sprNode.addComponent(Sprite);
        spr.spriteFrame = this.tileFrame;
        spr.sizeMode    = Sprite.SizeMode.CUSTOM;
        spr.color       = TILE_COLORS[(lvl - 1) % TILE_COLORS.length];
        btn.addChild(sprNode);

        const numNode = new Node('Num');
        numNode.addComponent(UITransform).setContentSize(btnSize, btnSize);
        const numLabel = numNode.addComponent(Label);
        numLabel.overflow        = Label.Overflow.SHRINK;
        numLabel.horizontalAlign = 1;
        numLabel.verticalAlign   = 1;
        numLabel.string          = String(lvl);
        numLabel.fontSize        = Math.floor(btnSize * 0.50);
        numLabel.color           = new Color(255, 255, 255, 255);
        numNode.setPosition(0, completed ? btnSize * 0.14 : 0, 0);
        btn.addChild(numNode);

        if (completed && bestRaw) {
            const timeNode = new Node('BestTime');
            timeNode.addComponent(UITransform).setContentSize(btnSize, btnSize * 0.3);
            const timeLabel = timeNode.addComponent(Label);
            timeLabel.overflow        = Label.Overflow.SHRINK;
            timeLabel.horizontalAlign = 1;
            timeLabel.verticalAlign   = 1;
            timeLabel.string          = this.formatTime(parseFloat(bestRaw));
            timeLabel.fontSize        = Math.floor(btnSize * 0.18);
            timeLabel.color           = new Color(255, 255, 255, 200);
            timeNode.setPosition(0, -btnSize * 0.22, 0);
            btn.addChild(timeNode);
        }

        return btn;
    }

    private formatTime(seconds: number): string {
        const total = Math.floor(seconds);
        const m = Math.floor(total / 60);
        const s = total % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }

    private onLevelSelect(level: number) {
        AudioManager.playSFX('click');
        sys.localStorage.setItem(SELECTED_LEVEL_KEY, String(level));
        this.exitAndLoad('ClassicScene');
    }

    onBackBtn() {
        AudioManager.playSFX('click');
        this.exitAndLoad('IntroScene');
    }

    private exitAndLoad(scene: string) {
        [...this.levelContainer.children].reverse().forEach((tile, i) => {
            this.scheduleOnce(() => {
                Tween.stopAllByTarget(tile);
                tween(tile).to(0.12, { scale: new Vec3(0, 0, 1) }, { easing: 'sineIn' }).start();
            }, i * 0.025);
        });
        [this.titleNode, this.badgeNode].forEach(n => {
            if (!n) return;
            const uiOp = n.getComponent(UIOpacity);
            if (uiOp) tween(uiOp).to(0.18, { opacity: 0 }).start();
            tween(n).to(0.2, { position: new Vec3(n.position.x, n.position.y + 40, n.position.z) }).start();
        });
        const delay = Math.min(this.levelContainer.children.length * 0.025 + 0.15, 0.5);
        this.scheduleOnce(() => this.fadeOut(() => director.loadScene(scene)), delay);
    }

    private animateHeader() {
        [this.titleNode, this.badgeNode].forEach((n, i) => {
            if (!n) return;
            const orig = n.position.clone();
            n.setPosition(orig.x, orig.y + 60, orig.z);
            const uiOp = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity);
            uiOp.opacity = 0;
            this.scheduleOnce(() => {
                tween(n).to(0.4, { position: new Vec3(orig.x, orig.y, orig.z) }, { easing: 'backOut' }).start();
                tween(uiOp).to(0.3, { opacity: 255 }, { easing: 'sineOut' }).start();
            }, i * 0.1);
        });
        if (this.backBinNode) {
            const n = this.backBinNode;
            const orig = n.position.clone();
            n.setPosition(orig.x - 80, orig.y, orig.z);
            const uiOp = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity);
            uiOp.opacity = 0;
            this.scheduleOnce(() => {
                tween(n).to(0.35, { position: new Vec3(orig.x, orig.y, orig.z) }, { easing: 'backOut' }).start();
                tween(uiOp).to(0.3, { opacity: 255 }, { easing: 'sineOut' }).start();
            }, 0.15);
        }
    }

    private animateTiles() {
        this.levelContainer.children.forEach((tile, i) => {
            tile.setScale(0, 0, 1);
            this.scheduleOnce(() => {
                tween(tile)
                    .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                    .start();
            }, 0.3 + i * 0.06);
        });
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
