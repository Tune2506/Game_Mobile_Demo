import { _decorator, Component, Node, Label, Prefab, instantiate, sys, UITransform, director, Color, UIOpacity, view, Graphics, tween, Vec3, Tween } from 'cc';
import { Card } from './Card';
import { LEVELS, EMOJIS } from './LevelsConfig';
import { PopupFX } from './PopupFX';
import { AudioManager } from './AudioManager';

const { ccclass, property } = _decorator;

const BEST_LEVEL_KEY = 'MemoryMatch_BestLevel';

@ccclass('GameManager')
export class GameManager extends Component {

    // ── Inspector refs ───────────────────────────────────────
    @property(Node)   winPopup: Node = null!;
    @property(Node)   losePopup: Node = null!;
    @property(Label)  timerLabel: Label = null!;
    @property(Label)  levelLabel: Label = null!;
    @property(Node)   nextLevelBtnNode: Node = null!;
    @property(Node)   winPlayAgainBtnNode: Node = null!;
    @property(Prefab) cardPrefab: Prefab = null!;
    @property(Node)   cardContainer: Node = null!;
    @property(Label)  bestLevelLabel: Label = null!;
    @property(Node)   newRecordPopup: Node = null!;
    @property(Node)   settingsPopup: Node = null!;
    @property(Node)   settingsBtnNode: Node = null!;
    @property(Node)   homeBtnNode:     Node = null!;

    // ── State ────────────────────────────────────────────────
    private currentLevel = 1;
    private bestLevel = 0;
    private timeLeft = 0;
    private timerRunning = false;
    private firstCard: Card | null = null;
    private matchedPairs = 0;
    private totalPairs = 0;
    inputLocked = false;

    private _enterOverlay:   Node | null = null;
    private _topNodeOrigPos: Vec3[] = [];
    private _btnNodeOrigPos: Vec3[] = [];

    onLoad() {
        // ── Enter animation setup ────────────────────────────
        this._enterOverlay = this.createOverlay();
        this._enterOverlay.getComponent(UIOpacity)!.opacity = 255;

        [this.timerLabel?.node, this.levelLabel?.node, this.bestLevelLabel?.node].forEach(n => {
            const pos = n ? n.position.clone() : new Vec3();
            this._topNodeOrigPos.push(pos);
            if (n) {
                (n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity)).opacity = 0;
                n.setPosition(pos.x, pos.y + 60, pos.z);
            }
        });

        [this.settingsBtnNode, this.homeBtnNode].forEach(n => {
            const pos = n ? n.position.clone() : new Vec3();
            this._btnNodeOrigPos.push(pos);
            if (n) {
                (n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity)).opacity = 0;
                n.setPosition(pos.x, pos.y - 50, pos.z);
            }
        });

        // ── Game logic ───────────────────────────────────────
        const raw = sys.localStorage.getItem(BEST_LEVEL_KEY);
        this.bestLevel    = raw ? parseInt(raw, 10) : 0;
        this.currentLevel = 1;
        this.updateBestLevelDisplay();
        this.startLevel();
    }

    start() {
        AudioManager.playBGM('challenge');
        const ovOp = this._enterOverlay?.getComponent(UIOpacity);
        if (ovOp) {
            tween(ovOp).to(0.4, { opacity: 0 }, { easing: 'sineInOut' })
                .call(() => { this._enterOverlay?.destroy(); this._enterOverlay = null; })
                .start();
        }

        [this.timerLabel?.node, this.levelLabel?.node, this.bestLevelLabel?.node].forEach((n, i) => {
            if (!n || !this._topNodeOrigPos[i]) return;
            const orig = this._topNodeOrigPos[i];
            const op = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity);
            this.scheduleOnce(() => {
                tween(n).to(0.35, { position: new Vec3(orig.x, orig.y, orig.z) }, { easing: 'backOut' }).start();
                tween(op).to(0.28, { opacity: 255 }, { easing: 'sineOut' }).start();
            }, 0.15 + i * 0.07);
        });

        [this.settingsBtnNode, this.homeBtnNode].forEach((n, i) => {
            if (!n || !this._btnNodeOrigPos[i]) return;
            const orig = this._btnNodeOrigPos[i];
            const op = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity);
            this.scheduleOnce(() => {
                tween(n).to(0.35, { position: new Vec3(orig.x, orig.y, orig.z) }, { easing: 'backOut' }).start();
                tween(op).to(0.28, { opacity: 255 }, { easing: 'sineOut' }).start();
            }, 0.2 + i * 0.07);
        });
    }

    // ── Save best level ──────────────────────────────────────
    private saveBestLevel(lvl: number) {
        if (lvl > this.bestLevel) {
            this.bestLevel = lvl;
            sys.localStorage.setItem(BEST_LEVEL_KEY, String(lvl));
            this.updateBestLevelDisplay(true);
        }
    }

    private updateBestLevelDisplay(highlight = false) {
        this.bestLevelLabel.string = `Level ${this.bestLevel}`;
        this.bestLevelLabel.color  = highlight
            ? new Color(255, 215, 0, 255)
            : new Color(0, 0, 0, 255);
    }

    // ── Button handlers ──────────────────────────────────────
    onSettingsBtn() {
        AudioManager.playSFX('click');
        this.timerRunning = false;
        this.inputLocked  = true;
        this.settingsPopup.active = true;
    }

    resumeGame() {
        this.timerRunning = true;
        this.inputLocked  = false;
    }

    onHomeBtn() {
        AudioManager.playSFX('click');
        this.timerRunning = false;
        this.unscheduleAllCallbacks();
        this.fadeOut(() => {
            this.clearBoard();
            director.loadScene('IntroScene');
        });
    }

    onNextLevelBtn() {
        AudioManager.playSFX('click');
        AudioManager.resumeBGM();
        this.currentLevel++;
        this.winPopup.active = false;
        this.startLevel();
    }

    onPlayAgainBtn() {
        AudioManager.playSFX('click');
        AudioManager.resumeBGM();
        this.currentLevel = 1;
        this.winPopup.active  = false;
        this.losePopup.active = false;
        this.startLevel();
    }

    // ── Level setup ──────────────────────────────────────────
    private startLevel() {
        this.unscheduleAllCallbacks();
        const cfg = LEVELS[this.currentLevel - 1];

        this.winPopup.active       = false;
        this.losePopup.active      = false;
        this.newRecordPopup.active = false;
        this.matchedPairs          = 0;
        this.totalPairs       = (cfg.cols * cfg.rows) / 2;
        this.firstCard        = null;
        this.inputLocked      = false;

        this.clearBoard();
        this.buildGrid(cfg);

        this.timeLeft     = cfg.challengeTime;
        this.timerRunning = true;
        this.updateTimerDisplay();
        this.updateLevelDisplay();
    }

    private clearBoard() {
        this.cardContainer.destroyAllChildren();
    }

    private buildGrid(cfg: LevelConfig) {
        const { cols, rows } = cfg;
        const cSize    = this.cardContainer.getComponent(UITransform)!.contentSize;
        const spacing  = 12;
        const fitW     = (cSize.width  - spacing * (cols - 1)) / cols;
        const fitH     = (cSize.height - spacing * (rows - 1)) / rows;
        const cardSize = Math.min(fitW, fitH, 160);

        const totalW = cols * cardSize + (cols - 1) * spacing;
        const totalH = rows * cardSize + (rows - 1) * spacing;
        const startX = -totalW / 2 + cardSize / 2;
        const startY =  totalH / 2 - cardSize / 2;

        const deck = this.makeDeck(cols * rows);
        let i = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cardNode = instantiate(this.cardPrefab);
                cardNode.setPosition(
                    startX + c * (cardSize + spacing),
                    startY - r * (cardSize + spacing),
                    0
                );
                const card = cardNode.getComponent(Card)!;
                card.init(deck[i++], cardSize, this);
                this.cardContainer.addChild(cardNode);
            }
        }
    }

    private makeDeck(total: number): string[] {
        const pairs = total / 2;
        const pool  = [...EMOJIS].sort(() => Math.random() - 0.5).slice(0, pairs);
        const deck  = [...pool, ...pool];
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    private updateLevelDisplay() {
        this.levelLabel.string = `Level ${this.currentLevel}`;
    }

    // ── Timer ────────────────────────────────────────────────
    update(dt: number) {
        if (!this.timerRunning) return;
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft     = 0;
            this.timerRunning = false;
            this.updateTimerDisplay();
            this.onLose();
            return;
        }
        this.updateTimerDisplay();
    }

    private updateTimerDisplay() {
        const total = Math.max(0, Math.floor(this.timeLeft));
        const m = Math.floor(total / 60);
        const s = total % 60;
        this.timerLabel.string = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // ── Card matching ────────────────────────────────────────
    onCardFlipped(card: Card) {
        if (this.firstCard === null) {
            this.firstCard = card;
            return;
        }
        const a = this.firstCard;
        const b = card;
        this.firstCard   = null;
        this.inputLocked = true;

        if (a.emoji === b.emoji) {
            AudioManager.playSFX('correct');
            a.setMatched();
            b.setMatched();
            this.matchedPairs++;
            if (this.matchedPairs >= this.totalPairs) {
                this.scheduleOnce(() => this.onWin(), 0.35);
            } else {
                this.inputLocked = false;
            }
        } else {
            AudioManager.playSFX('incorrect');
            this.scheduleOnce(() => {
                a.flipBack();
                b.flipBack(() => { this.inputLocked = false; });
            }, 0.5);
        }
    }

    // ── Win / Lose ───────────────────────────────────────────
    private onWin() {
        this.timerRunning = false;
        AudioManager.pauseBGM();
        const isNewRecord = this.currentLevel > this.bestLevel;
        this.saveBestLevel(this.currentLevel);
        const isLast = this.currentLevel >= LEVELS.length;
        if (isLast) {
            this.nextLevelBtnNode.active    = false;
            this.winPlayAgainBtnNode.active = true;
            AudioManager.playSFX('win');
            this.showPopup(this.winPopup, () => PopupFX.confetti(this.winPopup));
        } else if (isNewRecord) {
            AudioManager.playSFX('newrecord');
            this.showPopup(this.newRecordPopup, () => PopupFX.starBurst(this.newRecordPopup));
        } else {
            this.nextLevelBtnNode.active    = true;
            this.winPlayAgainBtnNode.active = false;
            AudioManager.playSFX('win');
            this.showPopup(this.winPopup, () => PopupFX.confetti(this.winPopup));
        }
    }

    private onLose() {
        AudioManager.pauseBGM();
        AudioManager.playSFX('lose');
        this.showPopup(this.losePopup, () => PopupFX.shake(this.losePopup));
    }

    // ── Popup animation ──────────────────────────────────────
    private showPopup(node: Node, fxFn?: () => void) {
        Tween.stopAllByTarget(node);
        const op = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
        Tween.stopAllByTarget(op);
        node.setScale(0.75, 0.75, 1);
        node.active = true;
        op.opacity  = 0;
        tween(node).to(0.28, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .call(() => fxFn?.())
            .start();
        tween(op).to(0.22, { opacity: 255 }, { easing: 'sineOut' }).start();
    }

    // ── Scene transition ─────────────────────────────────────
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
