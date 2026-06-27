import { _decorator, Component, Node, Label, Prefab, instantiate, sys, UITransform, director, Color, UIOpacity, view, Graphics, tween, Vec3, Tween } from 'cc';
import { Card } from './Card';
import { LEVELS, EMOJIS } from './LevelsConfig';
import { PopupFX } from './PopupFX';
import { AudioManager } from './AudioManager';

const { ccclass, property } = _decorator;

const SELECTED_LEVEL_KEY = 'Classic_SelectedLevel';
const BEST_TIME_PREFIX   = 'ClassicBestTime_';

@ccclass('ClassicGameManager')
export class ClassicGameManager extends Component {

    // ── Inspector refs ───────────────────────────────────────
    @property(Node)   winPopup: Node = null!;
    @property(Node)   losePopup: Node = null!;
    @property(Node)   newRecordPopup: Node = null!;
    @property(Label)  timerLabel: Label = null!;
    @property(Label)  levelLabel: Label = null!;
    @property(Label)  bestTimeLabel: Label = null!;
    @property(Node)   nextLevelBtnNode: Node = null!;
    @property(Node)   newRecordNextLevelBtnNode: Node = null!;
    @property(Prefab) cardPrefab: Prefab = null!;
    @property(Node)   cardContainer: Node = null!;
    @property(Node)   settingsPopup: Node = null!;
    @property(Node)   settingsBtnNode: Node = null!;
    @property(Node)   menuBtnNode:     Node = null!;

    // ── State ────────────────────────────────────────────────
    private currentLevel = 1;
    private bestTime     = -1;
    private elapsed      = 0;
    private timeLimit    = 0;
    private timerRunning = false;
    private firstCard: Card | null = null;
    private matchedPairs = 0;
    private totalPairs   = 0;
    inputLocked          = false;

    private _enterOverlay:   Node | null = null;
    private _topNodeOrigPos: Vec3[] = [];
    private _btnNodeOrigPos: Vec3[] = [];

    onLoad() {
        // ── Enter animation setup ────────────────────────────
        this._enterOverlay = this.createOverlay();
        this._enterOverlay.getComponent(UIOpacity)!.opacity = 255;

        [this.timerLabel?.node, this.levelLabel?.node, this.bestTimeLabel?.node].forEach(n => {
            const pos = n ? n.position.clone() : new Vec3();
            this._topNodeOrigPos.push(pos);
            if (n) {
                (n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity)).opacity = 0;
                n.setPosition(pos.x, pos.y + 60, pos.z);
            }
        });

        [this.settingsBtnNode, this.menuBtnNode].forEach(n => {
            const pos = n ? n.position.clone() : new Vec3();
            this._btnNodeOrigPos.push(pos);
            if (n) {
                (n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity)).opacity = 0;
                n.setPosition(pos.x, pos.y - 50, pos.z);
            }
        });

        // ── Game logic ───────────────────────────────────────
        const raw = sys.localStorage.getItem(SELECTED_LEVEL_KEY);
        this.currentLevel = raw ? parseInt(raw, 10) : 1;
        this.loadBestTime();
        this.updateBestTimeDisplay();
        this.startLevel();
    }

    start() {
        AudioManager.playBGM('classic');
        const ovOp = this._enterOverlay?.getComponent(UIOpacity);
        if (ovOp) {
            tween(ovOp).to(0.4, { opacity: 0 }, { easing: 'sineInOut' })
                .call(() => { this._enterOverlay?.destroy(); this._enterOverlay = null; })
                .start();
        }

        [this.timerLabel?.node, this.levelLabel?.node, this.bestTimeLabel?.node].forEach((n, i) => {
            if (!n || !this._topNodeOrigPos[i]) return;
            const orig = this._topNodeOrigPos[i];
            const op = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity);
            this.scheduleOnce(() => {
                tween(n).to(0.35, { position: new Vec3(orig.x, orig.y, orig.z) }, { easing: 'backOut' }).start();
                tween(op).to(0.28, { opacity: 255 }, { easing: 'sineOut' }).start();
            }, 0.15 + i * 0.07);
        });

        [this.settingsBtnNode, this.menuBtnNode].forEach((n, i) => {
            if (!n || !this._btnNodeOrigPos[i]) return;
            const orig = this._btnNodeOrigPos[i];
            const op = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity);
            this.scheduleOnce(() => {
                tween(n).to(0.35, { position: new Vec3(orig.x, orig.y, orig.z) }, { easing: 'backOut' }).start();
                tween(op).to(0.28, { opacity: 255 }, { easing: 'sineOut' }).start();
            }, 0.2 + i * 0.07);
        });
    }

    // ── Best time ────────────────────────────────────────────
    private loadBestTime() {
        const raw = sys.localStorage.getItem(BEST_TIME_PREFIX + this.currentLevel);
        this.bestTime = raw ? parseFloat(raw) : -1;
    }

    private saveBestTime(time: number): boolean {
        if (this.bestTime < 0 || time < this.bestTime) {
            this.bestTime = time;
            sys.localStorage.setItem(BEST_TIME_PREFIX + this.currentLevel, String(time));
            this.updateBestTimeDisplay(true);
            return true;
        }
        return false;
    }

    private updateBestTimeDisplay(highlight = false) {
        if (this.bestTime < 0) {
            this.bestTimeLabel.string = '--:--';
            this.bestTimeLabel.color  = new Color(0, 0, 0, 255);
        } else {
            this.bestTimeLabel.string = this.formatTime(this.bestTime);
            this.bestTimeLabel.color  = highlight
                ? new Color(255, 215, 0, 255)
                : new Color(0, 0, 0, 255);
        }
    }

    private formatTime(seconds: number): string {
        const total = Math.floor(seconds);
        const m = Math.floor(total / 60);
        const s = total % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
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

    onMenuBtn() {
        AudioManager.playSFX('click');
        this.timerRunning = false;
        this.unscheduleAllCallbacks();
        this.fadeOut(() => {
            this.clearBoard();
            director.loadScene('MenuScene');
        });
    }

    onNextLevelBtn() {
        AudioManager.playSFX('click');
        AudioManager.resumeBGM();
        this.currentLevel++;
        sys.localStorage.setItem(SELECTED_LEVEL_KEY, String(this.currentLevel));
        this.winPopup.active       = false;
        this.newRecordPopup.active = false;
        this.loadBestTime();
        this.updateBestTimeDisplay();
        this.startLevel();
    }

    onPlayAgainBtn() {
        AudioManager.playSFX('click');
        AudioManager.resumeBGM();
        this.winPopup.active       = false;
        this.losePopup.active      = false;
        this.newRecordPopup.active = false;
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
        this.elapsed          = 0;
        this.timeLimit        = cfg.classicTime;
        this.timerRunning     = true;
        this.clearBoard();
        this.buildGrid(cfg);
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
        const totalW   = cols * cardSize + (cols - 1) * spacing;
        const totalH   = rows * cardSize + (rows - 1) * spacing;
        const startX   = -totalW / 2 + cardSize / 2;
        const startY   =  totalH / 2 - cardSize / 2;
        const deck = this.makeDeck(cols * rows);
        let i = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cardNode = instantiate(this.cardPrefab);
                cardNode.setPosition(
                    startX + c * (cardSize + spacing),
                    startY - r * (cardSize + spacing), 0
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

    // ── Timer (đếm xuống, thua khi hết giờ) ─────────────────
    update(dt: number) {
        if (!this.timerRunning) return;
        this.elapsed += dt;
        if (this.elapsed >= this.timeLimit) {
            this.elapsed      = this.timeLimit;
            this.timerRunning = false;
            this.updateTimerDisplay();
            this.onLose();
            return;
        }
        this.updateTimerDisplay();
    }

    private updateTimerDisplay() {
        this.timerLabel.string = this.formatTime(this.timeLimit - this.elapsed);
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
        const isNewRecord = this.saveBestTime(this.elapsed);
        const isLast      = this.currentLevel >= LEVELS.length;
        this.nextLevelBtnNode.active          = !isLast;
        this.newRecordNextLevelBtnNode.active = !isLast;
        if (isNewRecord) {
            AudioManager.playSFX('newrecord');
            this.showPopup(this.newRecordPopup, () => PopupFX.starBurst(this.newRecordPopup));
        } else {
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
