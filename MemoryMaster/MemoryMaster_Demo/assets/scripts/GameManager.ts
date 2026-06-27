import { _decorator, Component, Node, Label, Prefab, instantiate, sys, UITransform, director } from 'cc';
import { Card } from './Card';

const { ccclass, property } = _decorator;

const SAVE_KEY = 'MemoryMatch_Level';
const EMOJIS = ['🍎','🚀','🐶','💎','🚗','⚽','🎸','⏰','🌞','🌙','🔥','💧'];

interface LevelConfig { cols: number; rows: number; time: number; }

const LEVELS: LevelConfig[] = [
    { cols: 2, rows: 2, time: 15  },
    { cols: 4, rows: 3, time: 35  },
    { cols: 4, rows: 4, time: 50  },
    { cols: 4, rows: 5, time: 65  },
    { cols: 4, rows: 6, time: 80  },
];

@ccclass('GameManager')
export class GameManager extends Component {

    // ── Inspector refs ───────────────────────────────────────
    @property(Node)   winPopup: Node = null!;
    @property(Node)   losePopup: Node = null!;
    @property(Label)  timerLabel: Label = null!;
    @property(Label)  levelLabel: Label = null!;
    @property(Label)  winMessageLabel: Label = null!;
    @property(Node)   nextLevelBtnNode: Node = null!;
    @property(Node)   winPlayAgainBtnNode: Node = null!;
    @property(Prefab) cardPrefab: Prefab = null!;
    @property(Node)   cardContainer: Node = null!;

    // ── State ────────────────────────────────────────────────
    private currentLevel = 1;
    private timeLeft = 0;
    private timerRunning = false;
    private firstCard: Card | null = null;
    private matchedPairs = 0;
    private totalPairs = 0;
    inputLocked = false;

    onLoad() {
        // Nếu có save → tiếp tục từ level đó; không có → bắt đầu từ L1
        const raw = sys.localStorage.getItem(SAVE_KEY);
        this.currentLevel = raw ? parseInt(raw, 10) : 1;
        this.startLevel();
    }

    // ── Save / Load ──────────────────────────────────────────
    private saveLevel(lvl: number) { sys.localStorage.setItem(SAVE_KEY, String(lvl)); }
    private clearSave()             { sys.localStorage.removeItem(SAVE_KEY); }

    // ── Button handlers ──────────────────────────────────────
    onHomeBtn() {
        this.unscheduleAllCallbacks();
        this.timerRunning = false;
        this.saveLevel(this.currentLevel);
        this.clearBoard();
        director.loadScene('IntroScene');
    }

    onNextLevelBtn() {
        this.currentLevel++;
        this.saveLevel(this.currentLevel);
        this.winPopup.active = false;
        this.startLevel();
    }

    onPlayAgainBtn() {
        this.clearSave();
        this.currentLevel = 1;
        this.winPopup.active  = false;
        this.losePopup.active = false;
        this.startLevel();
    }

    // ── Level setup ──────────────────────────────────────────
    private startLevel() {
        this.unscheduleAllCallbacks();
        const cfg = LEVELS[this.currentLevel - 1];

        this.winPopup.active  = false;
        this.losePopup.active = false;
        this.matchedPairs     = 0;
        this.totalPairs       = (cfg.cols * cfg.rows) / 2;
        this.firstCard        = null;
        this.inputLocked      = false;

        this.clearBoard();
        this.buildGrid(cfg);

        this.timeLeft     = cfg.time;
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
            a.setMatched();
            b.setMatched();
            this.matchedPairs++;
            if (this.matchedPairs >= this.totalPairs) {
                this.scheduleOnce(() => this.onWin(), 0.35);
            } else {
                this.inputLocked = false;
            }
        } else {
            this.scheduleOnce(() => {
                a.flipBack();
                b.flipBack(() => { this.inputLocked = false; });
            }, 0.5);
        }
    }

    // ── Win / Lose ───────────────────────────────────────────
    private onWin() {
        this.timerRunning = false;
        const isLast = this.currentLevel >= LEVELS.length;
        this.winMessageLabel.string     = isLast ? "Congratulations,\nyou're done!" : 'Good Job!';
        this.nextLevelBtnNode.active    = !isLast;
        this.winPlayAgainBtnNode.active = isLast;
        this.winPopup.active            = true;
    }

    private onLose() {
        this.losePopup.active = true;
    }
}
