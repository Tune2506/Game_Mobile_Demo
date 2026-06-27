import {
    _decorator, Component, Label, Node, Button,
    sys, math, tween, Vec3, UIOpacity, Color, director,
} from 'cc';
import { GameConfig }              from './GameConfig';
import { GridManager }             from './GridManager';
import { TrayBlock }               from './TrayBlock';
import { pickTray, BlockShape }    from './BlockShapes';
import { AudioManager }            from './AudioManager';

const { ccclass, property } = _decorator;
const { clamp } = math;

@ccclass('GameManager')
export class GameManager extends Component {

    // ─── Inspector refs ───────────────────────────────────────────────

    @property(GridManager)
    gridManager: GridManager = null!;

    @property([TrayBlock])
    trayBlocks: TrayBlock[] = [];

    @property(Label)
    scoreLabel: Label = null!;

    @property(Label)
    highScoreLabel: Label = null!;

    @property(Label)
    comboLabel: Label = null!;

    @property(Label)
    scoreFloatLabel: Label = null!;   // A4: Label bay lên khi cộng điểm

    @property(Node)
    gameOverPanel: Node = null!;

    @property(Label)
    finalScoreLabel: Label = null!;       // label tĩnh "Score" — không đổi string

    @property(Label)
    finalScoreValueLabel: Label = null!;  // label số điểm thực tế

    @property(Label)
    finalHighScoreLabel: Label = null!;

    @property(Button)
    restartButton: Button = null!;

    @property(Node)
    newRecordPanel: Node = null!;

    @property(Label)
    newRecordScoreLabel: Label = null!;

    @property(Button)
    newRecordRestartButton: Button = null!;

    @property(Label)
    newRecordOldBestLabel: Label = null!;

    @property(Button)
    newRecordHomeButton: Button = null!;

    @property(Node)
    fadeOverlay: Node = null!;

    // ─── Trạng thái ───────────────────────────────────────────────────

    private score:      number = 0;
    private combo:      number = 0;
    private trayIndex:  number = 0;

    private isNewRecord:        boolean = false;
    private isGameOver:         boolean = false;
    private savedHighScore:     number  = 0;
    private originalHighScore:  number  = 0;
    private defaultBestColor: Color   = new Color(255, 255, 255, 255);

    private trayShapes: (BlockShape | null)[] = [null, null, null];

    // ─── Vòng đời ─────────────────────────────────────────────────────

    onLoad(): void {
        this.restartButton?.node.on(Button.EventType.CLICK, this.restart,    this);
        this.newRecordRestartButton?.node.on(Button.EventType.CLICK, this.restart,    this);
        this.newRecordHomeButton?.node.on(Button.EventType.CLICK, this.goToIntro, this);
    }

    start(): void {
        if (this.highScoreLabel) {
            this.defaultBestColor = this.highScoreLabel.color.clone();
        }
        this.playFadeIn();
        this.initGame();
    }

    private playFadeIn(): void {
        if (!this.fadeOverlay) return;
        const op = this.fadeOverlay.getComponent(UIOpacity)
                ?? this.fadeOverlay.addComponent(UIOpacity);
        op.opacity = 255;
        this.fadeOverlay.active = true;
        tween(op)
            .to(0.45, { opacity: 0 }, { easing: 'quadOut' })
            .call(() => { this.fadeOverlay.active = false; })
            .start();
    }

    private initGame(): void {
        this.score        = 0;
        this.combo        = 0;
        this.trayIndex    = 0;
        this.isNewRecord  = false;
        this.isGameOver   = false;
        AudioManager.instance?.playBGM();
        this.savedHighScore = parseInt(
            sys.localStorage.getItem('blockblast_highscore') ?? '0', 10,
        );
        this.originalHighScore = this.savedHighScore;
        this.updateScoreUI();
        this.gameOverPanel.active = false;
        if (this.newRecordPanel) this.newRecordPanel.active = false;
        if (this.scoreFloatLabel) this.scoreFloatLabel.node.active = false;
        this.spawnTray();
    }

    // ─── Spawn khay ───────────────────────────────────────────────────

    private spawnTray(): void {
        const validator    = (m: number[][]) => this.gridManager.canPlaceAnywhere(m);
        const lineValidator = (m: number[][]) => this.gridManager.canClearLineAnywhere(m);
        const shapes = pickTray(GameConfig.TRAY_COUNT, this.trayIndex, validator, lineValidator);
        this.trayIndex++;
        for (let i = 0; i < GameConfig.TRAY_COUNT; i++) {
            this.trayShapes[i] = shapes[i];
            this.trayBlocks[i].setOnPlaced(this.onBlockPlaced.bind(this));
            this.trayBlocks[i].setup(shapes[i]);
            this.trayBlocks[i].slideIn(i * 0.08);   // A3: stagger 0 / 80ms / 160ms
        }
    }

    // ─── Callback từ TrayBlock ────────────────────────────────────────

    onBlockPlaced(block: TrayBlock, cells: number): void {
        if (this.isGameOver) return;
        const idx = this.trayBlocks.indexOf(block);
        if (idx === -1) return;

        let totalGain    = cells * GameConfig.POINT_PER_CELL;
        let floatPrefix  = '+';
        this.score      += totalGain;

        AudioManager.instance?.playPlace();
        this.vibrate(30);

        const clearResult = this.gridManager.checkAndClearLines();
        const n = clearResult.count;

        if (n > 0) {
            this.combo += 1;
            const comboMul  = clamp(this.combo, 1, GameConfig.COMBO_MAX);
            const clearBase = GameConfig.LINE_BASE * n * (n + 1) / 2;
            const lineScore = clearBase * comboMul;
            this.score    += lineScore;
            totalGain     += lineScore;

            AudioManager.instance?.playClear();
            this.vibrate(60);

            if (this.gridManager.isBoardEmpty()) {
                this.score    += GameConfig.PERFECT_CLEAR_BONUS;
                totalGain     += GameConfig.PERFECT_CLEAR_BONUS;
                floatPrefix    = 'Perfect! +';
                AudioManager.instance?.playPerfect();
            }

            this.showComboUI(comboMul);

            // Combo ripple: đổi màu ngẫu nhiên các ô filled trên bàn
            if (this.combo >= 2) {
                this.gridManager.playComboRipple();
            }
        } else {
            this.combo = 0;
            this.hideComboUI();
        }

        // A4: điểm bay lên — prefix "Perfect! +" khi dọn sạch bàn
        this.showScoreFloat(totalGain, block.node.worldPosition, floatPrefix);

        this.trayShapes[idx] = null;
        block.hide();

        this.updateScoreUI();

        if (this.trayShapes.every(s => s === null)) {
            this.spawnTray();
        }

        if (this.gridManager.isGameOver(this.trayShapes)) {
            this.triggerGameOver();
        }
    }

    // ─── Game Over ────────────────────────────────────────────────────

    private triggerGameOver(): void {
        this.isGameOver = true;
        AudioManager.instance?.stopBGM();
        AudioManager.instance?.playGameOver();
        this.vibrate(150);
        const hsKey = 'blockblast_highscore';
        let hs = parseInt(sys.localStorage.getItem(hsKey) ?? '0', 10);
        if (this.score > hs) {
            hs = this.score;
            sys.localStorage.setItem(hsKey, String(hs));
        }

        if (this.finalScoreValueLabel) this.finalScoreValueLabel.string = String(this.score);
        this.finalHighScoreLabel.string = `Best: ${hs}`;

        // A5: board collapse trước khi hiện panel
        this.animateBoardCollapse(() => {
            if (this.isNewRecord && this.newRecordPanel) {
                if (this.newRecordScoreLabel)
                    this.newRecordScoreLabel.string = String(this.score);
                if (this.newRecordOldBestLabel)
                    this.newRecordOldBestLabel.string = `Kỷ lục cũ: ${this.originalHighScore}`;
                this.newRecordPanel.active = true;
                this.newRecordPanel.setScale(0, 0, 1);
                tween(this.newRecordPanel)
                    .to(0.35, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                    .start();
                AudioManager.instance?.playNewRecordPopup();
            } else {
                this.gameOverPanel.active = true;
                this.gameOverPanel.setScale(0, 0, 1);
                tween(this.gameOverPanel)
                    .to(0.35, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                    .start();
            }
        });
    }

    /** A5: Các ô rơi xuống theo cột (stagger), sau đó gọi callback. */
    private animateBoardCollapse(onDone: () => void): void {
        const filledCells = this.gridManager.getAllFilledCells();
        if (filledCells.length === 0) {
            onDone();
            return;
        }

        let maxDelay = 0;
        for (const { row, col, cell } of filledCells) {
            const delay = col * 0.08 + row * 0.03;
            maxDelay = Math.max(maxDelay, delay + 0.5);
            cell.filled = false;
            cell.breakAndFall(delay);
        }

        this.scheduleOnce(onDone, maxDelay + 0.05);
    }

    private restart(): void {
        this.gridManager.resetGrid();
        this.initGame();
    }

    private goToIntro(): void {
        AudioManager.instance?.playClick();
        AudioManager.instance?.stopBGM();
        director.loadScene('IntroScene');
    }

    // ─── UI ──────────────────────────────────────────────────────────

    private updateScoreUI(): void {
        this.scoreLabel.string = String(this.score);

        if (this.score > this.savedHighScore) {
            const wasNewRecord = this.isNewRecord;
            this.savedHighScore = this.score;
            sys.localStorage.setItem('blockblast_highscore', String(this.score));
            this.isNewRecord = true;
            if (!wasNewRecord) AudioManager.instance?.playNewRecord();
        }

        if (this.isNewRecord) {
            this.highScoreLabel.string = `Best: ${this.score}`;
            this.highScoreLabel.color  = new Color(255, 215, 0, 255); // vàng
        } else {
            this.highScoreLabel.string = `Best: ${this.savedHighScore}`;
            this.highScoreLabel.color  = this.defaultBestColor;
        }
    }

    private showComboUI(mul: number): void {
        if (!this.comboLabel) return;
        if (mul >= 2) {
            this.unschedule(this._hideComboTimer);
            this.comboLabel.node.active = true;
            this.comboLabel.string = `Combo ×${mul}`;
            AudioManager.instance?.playCombo();
            tween(this.comboLabel.node).stop();
            tween(this.comboLabel.node)
                .to(0.08, { scale: new Vec3(1.3, 1.3, 1) })
                .to(0.12, { scale: new Vec3(1,   1,   1) })
                .start();
            this.scheduleOnce(this._hideComboTimer, 1.2);
        } else {
            this.comboLabel.node.active = false;
        }
    }

    private _hideComboTimer = () => { this.hideComboUI(); };

    private hideComboUI(): void {
        if (this.comboLabel) this.comboLabel.node.active = false;
    }

    private vibrate(ms: number): void {
        try { sys.vibrate(ms); } catch (_) {}
    }

    /** A4: Số điểm bay lên từ vị trí đặt khối. prefix mặc định '+', Perfect Clear dùng 'Perfect!' */
    private showScoreFloat(amount: number, worldPos: Vec3, prefix: string = '+'): void {
        if (!this.scoreFloatLabel) return;
        const lbl = this.scoreFloatLabel;

        const op = lbl.node.getComponent(UIOpacity) ?? lbl.node.addComponent(UIOpacity);

        lbl.string = `${prefix} ${amount}`;
        lbl.node.setWorldPosition(worldPos.x, worldPos.y + 40, worldPos.z);
        lbl.node.active = true;
        op.opacity = 255;

        tween(lbl.node).stop();
        tween(op).stop();

        tween(lbl.node)
            .by(0.7, { position: new Vec3(0, GameConfig.SCORE_FLOAT_RISE, 0) }, { easing: 'quadOut' })
            .call(() => { lbl.node.active = false; })
            .start();
        tween(op)
            .delay(0.25)
            .to(0.45, { opacity: 0 })
            .start();
    }
}
