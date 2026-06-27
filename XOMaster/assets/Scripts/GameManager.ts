import { _decorator, Component, Node, Sprite, SpriteFrame, Label, director, UIOpacity, UITransform, Widget, Color, tween, Vec3, Vec2, Tween, Graphics, AudioClip, AudioSource, Prefab, instantiate, sys, EditBox, EventTouch } from 'cc';
import { GameConfig } from './GameConfig';
const { ccclass, property } = _decorator;

type CellValue = '' | 'O' | 'X';
type Turn = 'player' | 'ai';
type Difficulty = 'easy' | 'medium' | 'hard';

const COLOR_O = new Color(78, 205, 196, 255);
const COLOR_X = new Color(255, 107, 107, 255);

@ccclass('GameManager')
export class GameManager extends Component {

    @property(Prefab)
    cellPrefab: Prefab = null!;

    @property(Node)
    boardContainer: Node = null!;

    @property(Node)
    backBtn: Node = null!;

    @property(SpriteFrame)
    oSprite: SpriteFrame = null!;

    @property(SpriteFrame)
    xSprite: SpriteFrame = null!;

    @property(SpriteFrame)
    oPanelSprite: SpriteFrame = null!;

    @property(SpriteFrame)
    xPanelSprite: SpriteFrame = null!;

    @property(Node)
    playerSideNode: Node = null!;

    @property(Node)
    aiSideNode: Node = null!;

    @property(Label)
    playerNameLabel: Label = null!;

    @property(Label)
    opponentNameLabel: Label = null!;

    @property(Label)
    playerScoreLabel: Label = null!;

    @property(Label)
    aiScoreLabel: Label = null!;

    @property(Sprite)
    playerSymbolSprite: Sprite = null!;

    @property(Sprite)
    aiSymbolSprite: Sprite = null!;

    @property(Node)
    winLine: Node = null!;

    @property(Node)
    winPopup: Node = null!;

    @property(Node)
    losePopup: Node = null!;

    @property(Node)
    drawPopup: Node = null!;

    @property(Node)
    difficultyBar: Node = null!;

    @property(Label)
    difficultyLabel: Label = null!;

    @property(Node)
    difficultyDropdown: Node = null!;

    @property(Node)
    easyBtn: Node = null!;

    @property(Node)
    mediumBtn: Node = null!;

    @property(Node)
    hardBtn: Node = null!;

    @property(Node)
    settingBtn: Node = null!;

    @property(Node)
    settingPopup: Node = null!;

    @property(Sprite)
    musicToggleTrack: Sprite = null!;

    @property(Node)
    musicToggleKnob: Node = null!;

    @property(Sprite)
    soundToggleTrack: Sprite = null!;

    @property(Node)
    soundToggleKnob: Node = null!;

    @property(Node)
    scorePanel: Node = null!;

    @property(Node)
    boardNode: Node = null!;

    @property(Node)
    canvasNode: Node = null!;

    @property(AudioSource)
    audioSource: AudioSource = null!;

    @property(AudioClip)
    bgMusic: AudioClip = null!;

    @property(AudioClip)
    placeSfx: AudioClip = null!;

    @property(AudioClip)
    winSfx: AudioClip = null!;

    @property(AudioClip)
    loseSfx: AudioClip = null!;

    @property(AudioClip)
    drawSfx: AudioClip = null!;

    @property(AudioClip)
    clickSfx: AudioClip = null!;

    @property(AudioClip)
    deniedSfx: AudioClip = null!;

    @property(Node)
    undoBtn: Node = null!;

    @property(Node)
    hintBtn: Node = null!;

    @property(Label)
    undoCountLabel: Label = null!;

    @property(Label)
    hintCountLabel: Label = null!;

    @property(Node)
    nameInputPopup: Node = null!;

    @property(EditBox)
    player1EditBox: EditBox = null!;

    @property(EditBox)
    player2EditBox: EditBox = null!;

    @property(Node)
    nameConfirmBtn: Node = null!;

    @property(Node)
    winMessNode: Node = null!;

    @property(Label)
    winnerNameLabel: Label = null!;

    private cells: Node[] = [];
    private board: CellValue[] = [];
    private playerSymbol: CellValue = 'O';
    private aiSymbol: CellValue = 'X';
    private currentTurn: Turn = 'player';
    private gameOver: boolean = false;
    private playerScore: number = 0;
    private aiScore: number = 0;
    private winningLine: number[] | null = null;
    private difficulty: Difficulty = 'easy';
    private dropdownOpen: boolean = false;
    private dropdownBlocker: Node | null = null;
    private dropdownOpenPos: Vec3 = new Vec3();
    private dropdownClosePos: Vec3 = new Vec3();
    private musicOn: boolean = true;
    private soundOn: boolean = true;
    private musicKnobOnX: number = 0;
    private soundKnobOnX: number = 0;
    private activePopup: Node | null = null;
    private moveHistory: { index: number, symbol: CellValue }[] = [];
    private hintCell: number = -1;
    private undoUsesLeft: number = 2;
    private hintUsesLeft: number = 2;
    private readonly DAILY_UNDO_KEY = 'xo_undo_daily';
    private readonly DAILY_HINT_KEY = 'xo_hint_daily';
    // null = chưa có ván nào → random; true/false = người/AI đã đi trước ván vừa rồi
    private firstMoverIsPlayer: boolean | null = null;
    private player1Name: string = 'Player 1';
    private player2Name: string = 'Player 2';

    start() {
        // Đọc trạng thái nhạc/âm thanh từ scene trước (nếu có)
        this.musicOn = GameConfig.musicOn;
        this.soundOn = GameConfig.soundOn;

        this.backBtn.on(Node.EventType.TOUCH_END, () => {
            this.playSfx(this.clickSfx);
            director.loadScene('MenuScene');
        }, this);

        [this.winPopup, this.losePopup, this.drawPopup].forEach(popup => {
            popup.getChildByName('ContinueBtn')
                ?.on(Node.EventType.TOUCH_END, this.onContinueClicked, this);
            popup.getChildByName('ReplayBtn')
                ?.on(Node.EventType.TOUCH_END, this.onRestartClicked, this);
            popup.getChildByName('HomeBtn')
                ?.on(Node.EventType.TOUCH_END, this.onHomeClicked, this);
        });

        // Ẩn difficulty bar khi chơi với người
        this.difficultyBar.active = GameConfig.mode === 'pve';

        if (GameConfig.mode === 'pve') {
            this.setupDifficultyDropdown();
        }
        this.setupSettingPopup();
        this.setupUndoHintBtns();
        this.loadDailyUses();
        this.difficultyLabel.string = 'Dễ';
        this.startBgMusic();

        // Đặt tên mặc định trước khi anim scorepanel chạy
        if (GameConfig.mode === 'pvp') {
            this.playerNameLabel.string = 'Player 1';
            this.opponentNameLabel.string = 'Player 2';
        }

        this.playSceneOpenAnim();

        if (GameConfig.mode === 'pvp') {
            this.scheduleOnce(() => this.showNameInputPopup(), 0.7);
        } else {
            this.scheduleOnce(() => this.startGame(), 0.7);
        }
    }

    // ─── PvP Name Input ──────────────────────────────────────────────────────

    private showNameInputPopup() {
        if (!this.nameInputPopup) { this.startGame(); return; }

        // Hiển thị tên mặc định lên scorepanel ngay khi popup mở
        this.playerNameLabel.string = 'Player 1';
        this.opponentNameLabel.string = 'Player 2';

        this.player1EditBox.string = '';
        this.player2EditBox.string = '';

        // Lọc ký tự không hợp lệ ngay khi nhập
        const filterBox = (eb: EditBox) => {
            const filtered = eb.string.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 10);
            if (filtered !== eb.string) eb.string = filtered;
        };
        this.player1EditBox.node.on(EditBox.EventType.TEXT_CHANGED, () => filterBox(this.player1EditBox), this);
        this.player2EditBox.node.on(EditBox.EventType.TEXT_CHANGED, () => filterBox(this.player2EditBox), this);

        this.nameConfirmBtn.on(Node.EventType.TOUCH_END, this.onNameConfirm, this);

        this.nameInputPopup.setScale(0, 0, 1);
        this.nameInputPopup.active = true;
        tween(this.nameInputPopup)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    private onNameConfirm() {
        this.playSfx(this.clickSfx);

        // sanitizeName: xóa ký tự đặc biệt, xóa khoảng trắng cuối, tối đa 10 ký tự
        this.player1Name = this.sanitizeName(this.player1EditBox.string) || 'Player 1';
        this.player2Name = this.sanitizeName(this.player2EditBox.string) || 'Player 2';

        this.playerNameLabel.string = this.player1Name;
        this.opponentNameLabel.string = this.player2Name;

        tween(this.nameInputPopup)
            .to(0.2, { scale: new Vec3(0, 0, 1) }, { easing: 'cubicIn' })
            .call(() => {
                this.nameInputPopup.active = false;
                this.startGame();
            })
            .start();
    }

    private sanitizeName(raw: string): string {
        return raw.replace(/[^a-zA-Z0-9 ]/g, '').trimEnd().slice(0, 10);
    }

    private setupDifficultyDropdown() {
        this.dropdownOpenPos = this.difficultyDropdown.position.clone();
        const barH = this.difficultyBar.getComponent(UITransform)!.height;
        const dropH = this.difficultyDropdown.getComponent(UITransform)!.height;
        this.dropdownClosePos = new Vec3(
            this.dropdownOpenPos.x,
            this.difficultyBar.position.y - barH / 2 - dropH / 2,
            this.dropdownOpenPos.z
        );

        this.difficultyDropdown.setPosition(this.dropdownClosePos);
        this.difficultyDropdown.active = false;

        this.difficultyBar.on(Node.EventType.TOUCH_END, this.toggleDropdown, this);
        this.easyBtn.on(Node.EventType.TOUCH_END, () => this.onDifficultySelected('easy'), this);
        this.mediumBtn.on(Node.EventType.TOUCH_END, () => this.onDifficultySelected('medium'), this);
        this.hardBtn.on(Node.EventType.TOUCH_END, () => this.onDifficultySelected('hard'), this);
    }

    private toggleDropdown() {
        this.playSfx(this.clickSfx);
        Tween.stopAllByTarget(this.difficultyDropdown);

        if (this.dropdownOpen) {
            this.closeDropdownAnim();
        } else {
            this.difficultyDropdown.setPosition(this.dropdownClosePos);
            this.difficultyDropdown.active = true;
            tween(this.difficultyDropdown)
                .to(0.3, { position: this.dropdownOpenPos }, { easing: 'cubicOut' })
                .start();
            this.dropdownOpen = true;
            this.createDropdownBlocker();
        }
    }

    private createDropdownBlocker() {
        this.dropdownBlocker = new Node('DropdownBlocker');
        const parent = this.difficultyBar.parent!;
        parent.addChild(this.dropdownBlocker);
        // Kế thừa layer từ UI element — nếu không, camera UI sẽ bỏ qua node này và không nhận touch
        this.dropdownBlocker.layer = this.difficultyBar.layer;
        this.dropdownBlocker.addComponent(UITransform).setContentSize(720, 1280);
        this.dropdownBlocker.setPosition(0, 0, 0);
        // Chèn ngay phía sau difficultyBar để chặn touch lên board/scorePanel
        this.dropdownBlocker.setSiblingIndex(this.difficultyBar.getSiblingIndex());
        this.dropdownBlocker.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            const hitIndex = this.getCellIndexAtUIPos(event.getUILocation());
            this.closeDropdownAnim();
            if (hitIndex >= 0) {
                // Chờ anim dropdown đóng xong rồi mới đặt quân vào ô người chơi vừa bấm
                this.scheduleOnce(() => this.onCellClicked(hitIndex), 0.26);
            }
        }, this);
    }

    private destroyDropdownBlocker() {
        if (this.dropdownBlocker) {
            this.dropdownBlocker.destroy();
            this.dropdownBlocker = null;
        }
    }

    private getCellIndexAtUIPos(uiPos: Vec2): number {
        for (let i = 0; i < this.cells.length; i++) {
            const uitf = this.cells[i].getComponent(UITransform);
            if (uitf && uitf.hitTest(uiPos)) return i;
        }
        return -1;
    }

    private closeDropdownAnim() {
        Tween.stopAllByTarget(this.difficultyDropdown);
        tween(this.difficultyDropdown)
            .to(0.25, { position: this.dropdownClosePos }, { easing: 'cubicIn' })
            .call(() => { this.difficultyDropdown.active = false; })
            .start();
        this.dropdownOpen = false;
        this.destroyDropdownBlocker();
    }

    private onDifficultySelected(level: Difficulty) {
        this.playSfx(this.clickSfx);
        this.closeDropdownAnim();

        this.difficulty = level;
        const names: Record<Difficulty, string> = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' };
        this.difficultyLabel.string = names[level];

        this.playerScore = 0;
        this.aiScore = 0;
        this.firstMoverIsPlayer = null;
        this.startGame();
    }

    private startGame() {
        this.unscheduleAllCallbacks();
        if (this.musicOn) this.audioSource?.play();

        this.clearHintHighlight();
        this.initBoard();
        this.moveHistory = [];

        const totalCells = GameConfig.boardSize * GameConfig.boardSize;
        this.board = new Array(totalCells).fill('') as CellValue[];
        this.gameOver = false;
        this.winningLine = null;
        Tween.stopAllByTarget(this.winLine);
        this.winLine.active = false;

        this.winPopup.active = false;
        this.losePopup.active = false;
        this.drawPopup.active = false;

        // Ván đầu tiên: random; các ván sau: đổi lượt cho đối phương
        const playerGoesFirst = this.firstMoverIsPlayer === null
            ? Math.random() < 0.5
            : !this.firstMoverIsPlayer;
        this.firstMoverIsPlayer = playerGoesFirst;

        if (playerGoesFirst) {
            this.playerSymbol = 'O';
            this.aiSymbol = 'X';
            this.currentTurn = 'player';
        } else {
            this.playerSymbol = 'X';
            this.aiSymbol = 'O';
            this.currentTurn = 'ai';
        }

        this.updateScorePanel();
        this.updateTurnHighlight();

        if (this.currentTurn === 'ai' && GameConfig.mode === 'pve') {
            this.scheduleOnce(() => this.aiMove(), 0.5);
        }
    }

    private initBoard() {
        this.boardContainer.removeAllChildren();
        this.cells = [];

        const size = GameConfig.boardSize;
        const totalSize = this.boardContainer.getComponent(UITransform)!.width;
        const gap = 8;
        const cellSize = (totalSize - gap * (size - 1)) / size;
        const iconMargin = cellSize * 0.13;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const cell = instantiate(this.cellPrefab);
                this.boardContainer.addChild(cell);
                cell.getComponent(UITransform)!.setContentSize(cellSize, cellSize);
                cell.setPosition(
                    c * (cellSize + gap) + cellSize / 2 - totalSize / 2,
                    -(r * (cellSize + gap) + cellSize / 2 - totalSize / 2),
                    0
                );
                const iconNode = cell.getChildByName('Icon');
                if (iconNode) {
                    const w = iconNode.getComponent(Widget);
                    if (w) {
                        w.left = w.right = w.top = w.bottom = iconMargin;
                        w.updateAlignment();
                    }
                }
                this.cells.push(cell);
            }
        }

        this.cells.forEach((cell, i) => {
            cell.on(Node.EventType.TOUCH_END, () => this.onCellClicked(i), this);
        });
    }

    private onCellClicked(index: number) {
        if (this.gameOver) return;
        // PvP: cả 2 người đều click được; PvE: chỉ lượt player mới được click
        if (GameConfig.mode === 'pve' && this.currentTurn !== 'player') return;

        // Dropdown đang mở → đóng trước, sau khi anim xong mới đặt quân
        if (this.dropdownOpen) {
            this.closeDropdownAnim();
            this.scheduleOnce(() => this.onCellClicked(index), 0.26);
            return;
        }

        if (this.board[index] !== '') {
            this.playSfx(this.deniedSfx);
            this.shakeCell(index);
            return;
        }

        const symbol = this.currentTurn === 'player' ? this.playerSymbol : this.aiSymbol;
        this.placeSymbol(index, symbol);

        const result = this.checkWinner();
        if (result !== null) {
            this.endGame(result);
            return;
        }

        this.currentTurn = this.currentTurn === 'player' ? 'ai' : 'player';
        this.updateTurnHighlight();

        if (GameConfig.mode === 'pve' && this.currentTurn === 'ai') {
            this.scheduleOnce(() => this.aiMove(), 0.5);
        }
    }

    private aiMove() {
        if (this.gameOver) return;

        if (this.difficulty === 'easy') {
            this.aiMoveEasy();
        } else if (this.difficulty === 'medium') {
            this.aiMoveMedium();
        } else {
            this.aiMoveHard();
        }

        const result = this.checkWinner();
        if (result !== null) {
            this.endGame(result);
            return;
        }

        this.currentTurn = 'player';
        this.updateTurnHighlight();
    }

    private aiMoveEasy() {
        const empty = this.getEmptyCells();
        if (empty.length === 0) return;
        this.placeSymbol(empty[Math.floor(Math.random() * empty.length)], this.aiSymbol);
    }

    private aiMoveMedium() {
        const winMove = this.findWinningMove(this.aiSymbol);
        if (winMove !== null) { this.placeSymbol(winMove, this.aiSymbol); return; }

        const blockMove = this.findWinningMove(this.playerSymbol);
        if (blockMove !== null) { this.placeSymbol(blockMove, this.aiSymbol); return; }

        this.aiMoveEasy();
    }

    private aiMoveHard() {
        // Luôn thắng ngay nếu có cơ hội
        const winMove = this.findWinningMove(this.aiSymbol);
        if (winMove !== null) { this.placeSymbol(winMove, this.aiSymbol); return; }

        // Luôn chặn người chơi thắng
        const blockMove = this.findWinningMove(this.playerSymbol);
        if (blockMove !== null) { this.placeSymbol(blockMove, this.aiSymbol); return; }

        // 40% cơ hội đi ngẫu nhiên — tạo cơ hội để người chơi tận dụng
        if (Math.random() < 0.40) {
            this.aiMoveEasy();
            return;
        }

        const s = GameConfig.boardSize;
        const centerIdx = Math.floor(s / 2) * s + Math.floor(s / 2);
        if (this.board[centerIdx] === '') { this.placeSymbol(centerIdx, this.aiSymbol); return; }

        const corners = [0, s - 1, s * (s - 1), s * s - 1].filter(i => this.board[i] === '');
        if (corners.length > 0) {
            this.placeSymbol(corners[Math.floor(Math.random() * corners.length)], this.aiSymbol);
            return;
        }

        this.aiMoveEasy();
    }

    private findWinningMove(symbol: CellValue): number | null {
        const lines = this.buildAllLines(GameConfig.boardSize, GameConfig.winCount);
        for (const line of lines) {
            const filled = line.filter(i => this.board[i] === symbol).length;
            const emptyIdx = line.find(i => this.board[i] === '');
            if (filled === line.length - 1 && emptyIdx !== undefined) return emptyIdx;
        }
        return null;
    }

    private getEmptyCells(): number[] {
        return this.board
            .map((val, idx) => (val === '' ? idx : -1))
            .filter(idx => idx !== -1);
    }

    private placeSymbol(index: number, symbol: CellValue) {
        this.board[index] = symbol;
        this.moveHistory.push({ index, symbol });
        this.clearHintHighlight();
        const icon = this.cells[index].getChildByName('Icon')!;
        icon.getComponent(Sprite)!.spriteFrame = symbol === 'O' ? this.oSprite : this.xSprite;
        icon.setScale(0, 0, 1);
        tween(icon)
            .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
        this.playSfx(this.placeSfx);
    }

    private checkWinner(): 'player' | 'ai' | 'draw' | null {
        const lines = this.buildAllLines(GameConfig.boardSize, GameConfig.winCount);
        for (const line of lines) {
            const sym = this.board[line[0]];
            if (sym && line.every(i => this.board[i] === sym)) {
                this.winningLine = line;
                return sym === this.playerSymbol ? 'player' : 'ai';
            }
        }
        this.winningLine = null;
        if (this.board.every(v => v !== '')) return 'draw';
        return null;
    }

    private buildAllLines(s: number, wc: number): number[][] {
        const lines: number[][] = [];
        for (let r = 0; r < s; r++)
            for (let c = 0; c <= s - wc; c++)
                lines.push(Array.from({ length: wc }, (_, i) => r * s + c + i));
        for (let c = 0; c < s; c++)
            for (let r = 0; r <= s - wc; r++)
                lines.push(Array.from({ length: wc }, (_, i) => (r + i) * s + c));
        for (let r = 0; r <= s - wc; r++)
            for (let c = 0; c <= s - wc; c++)
                lines.push(Array.from({ length: wc }, (_, i) => (r + i) * s + (c + i)));
        for (let r = 0; r <= s - wc; r++)
            for (let c = wc - 1; c < s; c++)
                lines.push(Array.from({ length: wc }, (_, i) => (r + i) * s + (c - i)));
        return lines;
    }

    private endGame(result: 'player' | 'ai' | 'draw') {
        this.gameOver = true;

        if (result === 'draw') {
            this.scheduleOnce(() => this.showDrawPopup(), 0.3);
            return;
        }

        if (result === 'player') {
            this.playerScore++;
            this.updateScorePanel();
            this.drawWinLine(this.playerSymbol);
        } else {
            this.aiScore++;
            this.updateScorePanel();
            this.drawWinLine(this.aiSymbol);
        }

        if (GameConfig.mode === 'pvp') {
            const winnerName = result === 'player' ? this.player1Name : this.player2Name;
            this.scheduleOnce(() => this.showWinPopupPvP(winnerName), 0.8);
        } else {
            if (result === 'player') {
                this.scheduleOnce(() => this.showWinPopup(), 0.8);
            } else {
                this.scheduleOnce(() => this.showLosePopup(), 0.8);
            }
        }
    }

    private drawWinLine(winnerSymbol: CellValue) {
        if (!this.winningLine) return;

        const posA = this.cells[this.winningLine[0]].getWorldPosition();
        const posC = this.cells[this.winningLine[this.winningLine.length - 1]].getWorldPosition();

        const midX = (posA.x + posC.x) / 2;
        const midY = (posA.y + posC.y) / 2;

        const dx = posC.x - posA.x;
        const dy = posC.y - posA.y;
        const gap = 8;
        const size = GameConfig.boardSize;
        const totalSize = this.boardContainer.getComponent(UITransform)!.width;
        const cellSize = (totalSize - gap * (size - 1)) / size;
        const length = Math.sqrt(dx * dx + dy * dy) + cellSize * 0.6;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        this.winLine.getComponent(Sprite)!.color = winnerSymbol === 'O' ? COLOR_O : COLOR_X;
        this.winLine.getComponent(UITransform)!.setContentSize(length, 18);
        this.winLine.setWorldPosition(midX, midY, 0);
        this.winLine.angle = angle;
        this.winLine.setScale(0, 1, 1);
        this.winLine.active = true;

        tween(this.winLine)
            .to(0.6, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private updateScorePanel() {
        this.playerScoreLabel.string = String(this.playerScore);
        this.aiScoreLabel.string = String(this.aiScore);
        this.playerSymbolSprite.spriteFrame = this.playerSymbol === 'O' ? this.oPanelSprite : this.xPanelSprite;
        this.aiSymbolSprite.spriteFrame = this.aiSymbol === 'O' ? this.oPanelSprite : this.xPanelSprite;
    }

    private updateTurnHighlight() {
        this.setSideOpacity(this.playerSideNode, this.currentTurn === 'player' ? 255 : 120);
        this.setSideOpacity(this.aiSideNode, this.currentTurn === 'ai' ? 255 : 120);
    }

    private setSideOpacity(node: Node, opacity: number) {
        let uiOpacity = node.getComponent(UIOpacity);
        if (!uiOpacity) uiOpacity = node.addComponent(UIOpacity);
        uiOpacity.opacity = opacity;
    }

    private onContinueClicked() {
        this.playSfx(this.clickSfx);
        const popup = this.activePopup;
        this.activePopup = null;
        if (popup) this.hidePopupWithAnim(popup, () => this.startGame());
    }

    private onRestartClicked() {
        this.playSfx(this.clickSfx);
        const popup = this.activePopup;
        this.activePopup = null;
        if (popup) this.hidePopupWithAnim(popup, () => {
            this.playerScore = 0;
            this.aiScore = 0;
            this.firstMoverIsPlayer = null;
            this.startGame();
        });
    }

    private onHomeClicked() {
        this.playSfx(this.clickSfx);
        const popup = this.activePopup;
        this.activePopup = null;
        if (popup) this.hidePopupWithAnim(popup, () => director.loadScene('MenuScene'));
        else director.loadScene('MenuScene');
    }

    private setupSettingPopup() {
        this.settingPopup.active = false;

        this.settingBtn.on(Node.EventType.TOUCH_END, this.onSettingOpen, this);

        this.settingPopup.getChildByName('CloseBtn')
            ?.on(Node.EventType.TOUCH_END, this.onSettingClose, this);
        this.settingPopup.getChildByName('ReplayBtn')
            ?.on(Node.EventType.TOUCH_END, this.onSettingReplay, this);
        this.settingPopup.getChildByName('HomeBtn')
            ?.on(Node.EventType.TOUCH_END, this.onSettingHome, this);

        this.musicKnobOnX = 140;
        this.soundKnobOnX = 140;

        this.musicToggleTrack.node.on(Node.EventType.TOUCH_END, this.onMusicToggle, this);
        this.soundToggleTrack.node.on(Node.EventType.TOUCH_END, this.onSoundToggle, this);

        this.syncToggleVisuals();
    }

    private syncToggleVisuals() {
        const setImmediate = (knob: Node, track: Sprite, isOn: boolean, knobOnX: number) => {
            knob.setPosition(isOn ? knobOnX : 99, knob.position.y, knob.position.z);
            track.color = isOn ? new Color(255, 255, 255, 255) : new Color(180, 180, 180, 255);
        };
        setImmediate(this.musicToggleKnob, this.musicToggleTrack, this.musicOn, this.musicKnobOnX);
        setImmediate(this.soundToggleKnob, this.soundToggleTrack, this.soundOn, this.soundKnobOnX);
    }

    private onSettingOpen() {
        this.playSfx(this.clickSfx);
        this.showPopupWithAnim(this.settingPopup);
    }

    private onSettingClose() {
        this.playSfx(this.clickSfx);
        this.hidePopupWithAnim(this.settingPopup, () => {});
    }

    private onSettingReplay() {
        this.playSfx(this.clickSfx);
        this.hidePopupWithAnim(this.settingPopup, () => {
            this.playerScore = 0;
            this.aiScore = 0;
            this.firstMoverIsPlayer = null;
            this.startGame();
        });
    }

    private onSettingHome() {
        this.playSfx(this.clickSfx);
        this.hidePopupWithAnim(this.settingPopup, () => director.loadScene('MenuScene'));
    }

    private playSceneOpenAnim() {
        const spOrigY = this.scorePanel.position.y;
        this.scorePanel.setPosition(this.scorePanel.position.x, spOrigY + 150, 0);
        let spOp = this.scorePanel.getComponent(UIOpacity);
        if (!spOp) spOp = this.scorePanel.addComponent(UIOpacity);
        spOp.opacity = 0;
        tween(this.scorePanel)
            .to(0.45, { position: new Vec3(this.scorePanel.position.x, spOrigY, 0) }, { easing: 'cubicOut' })
            .start();
        tween(spOp)
            .to(0.4, { opacity: 255 })
            .start();

        this.boardNode.setScale(0, 0, 1);
        tween(this.boardNode)
            .delay(0.15)
            .to(0.5, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();

        // difficultyBar + settingBtn: fade đơn giản
        const fadeNodes = (GameConfig.mode === 'pve'
            ? [this.difficultyBar, this.settingBtn]
            : [this.settingBtn]
        ).filter(n => !!n);
        fadeNodes.forEach((node, i) => {
            let op = node.getComponent(UIOpacity);
            if (!op) op = node.addComponent(UIOpacity);
            op.opacity = 0;
            tween(op)
                .delay(0.3 + i * 0.1)
                .to(0.3, { opacity: 255 })
                .start();
        });

        // undoBtn + hintBtn: pop bounce từ scale 0
        [this.undoBtn, this.hintBtn].filter(n => !!n).forEach((node, i) => {
            node.setScale(0, 0, 1);
            let op = node.getComponent(UIOpacity);
            if (!op) op = node.addComponent(UIOpacity);
            op.opacity = 0;
            tween(node)
                .delay(0.5 + i * 0.1)
                .to(0.4, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .start();
            tween(op)
                .delay(0.5 + i * 0.1)
                .to(0.3, { opacity: 255 })
                .start();
        });
    }

    private showWinPopup() {
        this.audioSource?.pause();
        this.playSfx(this.winSfx);
        // PvE: hiện sprite gốc "Bạn thắng!", ẩn label tên
        if (this.winMessNode) this.winMessNode.active = true;
        if (this.winnerNameLabel) this.winnerNameLabel.node.active = false;
        this.showPopupWithAnim(this.winPopup);
        this.scheduleOnce(() => this.spawnConfetti(), 0.1);
    }

    private showWinPopupPvP(winnerName: string) {
        this.audioSource?.pause();
        this.playSfx(this.winSfx);
        // PvP: ẩn sprite "Bạn thắng!", hiện label tên người thắng
        if (this.winMessNode) this.winMessNode.active = false;
        if (this.winnerNameLabel) {
            this.winnerNameLabel.string = `${winnerName} thắng!`;
            this.winnerNameLabel.node.active = true;
        }
        this.showPopupWithAnim(this.winPopup);
        this.scheduleOnce(() => this.spawnConfetti(), 0.1);
    }

    private showLosePopup() {
        this.audioSource?.pause();
        this.playSfx(this.loseSfx);
        const origY = this.losePopup.position.y;
        this.losePopup.setPosition(this.losePopup.position.x, origY + 900, 0);
        this.losePopup.setScale(1, 1, 1);
        this.losePopup.active = true;
        this.activePopup = this.losePopup;
        tween(this.losePopup)
            .to(0.5, { position: new Vec3(this.losePopup.position.x, origY, 0) }, { easing: 'backOut' })
            .start();
    }

    private showDrawPopup() {
        this.audioSource?.pause();
        this.playSfx(this.drawSfx);
        this.drawPopup.setScale(0, 0, 1);
        this.drawPopup.angle = 15;
        this.drawPopup.active = true;
        this.activePopup = this.drawPopup;
        tween(this.drawPopup)
            .to(0.4, { scale: new Vec3(1, 1, 1), angle: 0 }, { easing: 'backOut' })
            .start();
    }

    private spawnConfetti() {
        const colors = [
            new Color(255, 80, 80),
            new Color(255, 210, 50),
            new Color(80, 200, 100),
            new Color(80, 150, 255),
            new Color(180, 80, 255),
            new Color(255, 140, 50),
        ];

        const sides = [
            { baseX: -160, dirX: -1 },
            { baseX:  160, dirX:  1 },
        ];

        sides.forEach(side => {
            for (let i = 0; i < 15; i++) {
                const piece = new Node('confetti');
                this.canvasNode.addChild(piece);

                const tf = piece.addComponent(UITransform);
                tf.setContentSize(10, 14);

                const g = piece.addComponent(Graphics);
                const c = colors[Math.floor(Math.random() * colors.length)];
                g.fillColor = c;
                g.fillRect(-5, -7, 10, 14);
                g.fill();

                const op = piece.addComponent(UIOpacity);
                op.opacity = 255;

                const startX = side.baseX + (Math.random() - 0.5) * 40;
                const startY = -120;
                piece.setPosition(startX, startY, 0);

                const endX = startX + side.dirX * (80 + Math.random() * 180);
                const endY = startY + 400 + Math.random() * 300;
                const duration = 1.0 + Math.random() * 0.4;

                tween(piece)
                    .to(duration, {
                        position: new Vec3(endX, endY, 0),
                        angle: (Math.random() - 0.5) * 720,
                    })
                    .start();

                tween(op)
                    .delay(duration * 0.55)
                    .to(duration * 0.45, { opacity: 0 })
                    .call(() => { piece.destroy(); })
                    .start();
            }
        });
    }

    private showPopupWithAnim(popup: Node) {
        this.activePopup = popup;
        popup.setScale(0, 0, 1);
        popup.active = true;
        tween(popup)
            .to(0.35, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    private hidePopupWithAnim(popup: Node, onComplete: () => void) {
        Tween.stopAllByTarget(popup);
        tween(popup)
            .to(0.25, { scale: new Vec3(0, 0, 1) }, { easing: 'cubicIn' })
            .call(() => {
                popup.active = false;
                onComplete();
            })
            .start();
    }

    private onMusicToggle() {
        this.playSfx(this.clickSfx);
        this.musicOn = !this.musicOn;
        GameConfig.musicOn = this.musicOn;
        this.applyToggle(this.musicToggleKnob, this.musicToggleTrack, this.musicOn, this.musicKnobOnX);
        if (this.musicOn) {
            this.audioSource?.play();
        } else {
            this.audioSource?.stop();
        }
    }

    private onSoundToggle() {
        this.soundOn = !this.soundOn;
        GameConfig.soundOn = this.soundOn;
        this.playSfx(this.clickSfx);
        this.applyToggle(this.soundToggleKnob, this.soundToggleTrack, this.soundOn, this.soundKnobOnX);
    }

    private applyToggle(knob: Node, track: Sprite, isOn: boolean, knobOnX: number) {
        const targetX = isOn ? knobOnX : 99;
        tween(knob)
            .to(0.2, { position: new Vec3(targetX, knob.position.y, knob.position.z) }, { easing: 'cubicOut' })
            .start();
        track.color = isOn ? new Color(255, 255, 255, 255) : new Color(180, 180, 180, 255);
    }

    private shakeCell(index: number) {
        const icon = this.cells[index].getChildByName('Icon')!;
        const ox = icon.position.x;
        const oy = icon.position.y;
        Tween.stopAllByTarget(icon);
        tween(icon)
            .to(0.05, { position: new Vec3(ox + 12, oy, 0) })
            .to(0.05, { position: new Vec3(ox - 12, oy, 0) })
            .to(0.05, { position: new Vec3(ox + 8,  oy, 0) })
            .to(0.05, { position: new Vec3(ox - 8,  oy, 0) })
            .to(0.05, { position: new Vec3(ox,      oy, 0) })
            .start();
    }

    private startBgMusic() {
        if (!this.audioSource || !this.bgMusic) return;
        this.audioSource.clip = this.bgMusic;
        this.audioSource.loop = true;
        this.audioSource.volume = 0.5;
        if (this.musicOn) this.audioSource.play();
    }

    private playSfx(clip: AudioClip) {
        if (!this.soundOn || !clip || !this.audioSource) return;
        this.audioSource.playOneShot(clip);
    }

    // ─── Undo / Hint setup ───────────────────────────────────────────────────

    private setupUndoHintBtns() {
        if (this.undoBtn) this.undoBtn.on(Node.EventType.TOUCH_END, this.onUndoClicked, this);
        if (this.hintBtn) this.hintBtn.on(Node.EventType.TOUCH_END, this.onHintClicked, this);
    }

    // ─── Daily usage ─────────────────────────────────────────────────────────

    private loadDailyUses() {
        const today = new Date().toDateString();
        const read = (key: string) => {
            try {
                const raw = sys.localStorage.getItem(key);
                if (!raw) return 2;
                const d = JSON.parse(raw);
                return d.date === today ? Math.max(0, 2 - d.used) : 2;
            } catch { return 2; }
        };
        this.undoUsesLeft = read(this.DAILY_UNDO_KEY);
        this.hintUsesLeft = read(this.DAILY_HINT_KEY);
        this.updateUsageLabels();
    }

    private saveDailyUse(key: string) {
        const today = new Date().toDateString();
        try {
            const raw = sys.localStorage.getItem(key);
            let used = 0;
            if (raw) {
                const d = JSON.parse(raw);
                used = d.date === today ? d.used : 0;
            }
            sys.localStorage.setItem(key, JSON.stringify({ date: today, used: used + 1 }));
        } catch {}
    }

    private updateUsageLabels() {
        if (this.undoCountLabel) this.undoCountLabel.string = String(this.undoUsesLeft);
        if (this.hintCountLabel) this.hintCountLabel.string = String(this.hintUsesLeft);
    }

    // ─── Undo ────────────────────────────────────────────────────────────────

    private onUndoClicked() {
        if (this.gameOver) return;
        if (GameConfig.mode === 'pve' && this.currentTurn !== 'player') return;
        if (this.undoUsesLeft <= 0) { this.playSfx(this.deniedSfx); this.shakeNode(this.undoBtn); return; }
        if (this.moveHistory.length === 0) return;

        if (GameConfig.mode === 'pve') {
            // Undo nước AI (nếu AI vừa đi) + nước player trước đó
            const last = this.moveHistory[this.moveHistory.length - 1];
            if (last.symbol === this.aiSymbol) {
                const m = this.moveHistory.pop()!;
                this.board[m.index] = '';
                this.animateCellDisappear(m.index);
            }
            if (this.moveHistory.length > 0) {
                const m = this.moveHistory.pop()!;
                this.board[m.index] = '';
                this.animateCellDisappear(m.index);
            }
            this.currentTurn = 'player';
        } else {
            // PvP: undo nước đi mới nhất, trả lượt về
            const m = this.moveHistory.pop()!;
            this.board[m.index] = '';
            this.animateCellDisappear(m.index);
            this.currentTurn = this.currentTurn === 'player' ? 'ai' : 'player';
        }

        this.undoUsesLeft--;
        this.saveDailyUse(this.DAILY_UNDO_KEY);
        this.updateUsageLabels();
        this.clearHintHighlight();
        this.updateTurnHighlight();
        this.playSfx(this.clickSfx);
    }

    private animateCellDisappear(index: number) {
        const icon = this.cells[index].getChildByName('Icon');
        if (!icon) return;
        Tween.stopAllByTarget(icon);
        let op = icon.getComponent(UIOpacity);
        if (!op) op = icon.addComponent(UIOpacity);
        const uiOp = op;
        uiOp.opacity = 255;
        // Scale lên nhẹ rồi thu về 0 + fade out đồng thời
        tween(icon)
            .to(0.12, { scale: new Vec3(1.3, 1.3, 1) }, { easing: 'cubicOut' })
            .to(0.22, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
            .call(() => {
                const sp = icon.getComponent(Sprite);
                if (sp) sp.spriteFrame = null;
                icon.setScale(1, 1, 1);
                uiOp.opacity = 255;
            })
            .start();
        tween(uiOp)
            .delay(0.1)
            .to(0.24, { opacity: 0 })
            .call(() => { uiOp.opacity = 255; })
            .start();
    }

    // ─── Hint ────────────────────────────────────────────────────────────────

    private onHintClicked() {
        if (this.gameOver) return;
        if (GameConfig.mode === 'pve' && this.currentTurn !== 'player') return;
        if (this.hintUsesLeft <= 0) { this.playSfx(this.deniedSfx); this.shakeNode(this.hintBtn); return; }

        const cell = this.getHintCell();
        if (cell < 0) return;

        this.hintUsesLeft--;
        this.saveDailyUse(this.DAILY_HINT_KEY);
        this.updateUsageLabels();
        this.showHintHighlight(cell);
        this.playSfx(this.clickSfx);
    }

    private getHintCell(): number {
        const me  = this.currentTurn === 'player' ? this.playerSymbol : this.aiSymbol;
        const opp = me === 'O' ? 'X' : 'O';
        const s   = GameConfig.boardSize;
        const wc  = GameConfig.winCount;
        const lines = this.buildAllLines(s, wc);
        const scores = new Array(s * s).fill(0);

        for (const line of lines) {
            const myCount  = line.filter(i => this.board[i] === me).length;
            const oppCount = line.filter(i => this.board[i] === opp).length;
            const empties  = line.filter(i => this.board[i] === '');
            if (empties.length === 0) continue;

            if (myCount === wc - 1 && oppCount === 0) {
                // Thắng ngay — ưu tiên tuyệt đối
                empties.forEach(i => scores[i] += 10000);
            } else if (oppCount === wc - 1 && myCount === 0) {
                // Chặn đòn thắng đối thủ — ưu tiên cực cao
                empties.forEach(i => scores[i] += 9000);
            } else if (myCount >= 2 && oppCount === 0) {
                // Đang có chuỗi dài của mình
                empties.forEach(i => scores[i] += myCount * 80);
            } else if (oppCount >= 2 && myCount === 0) {
                // Chuỗi dài của đối thủ cần chặn
                empties.forEach(i => scores[i] += oppCount * 60);
            } else if (oppCount === 0) {
                // Hàng trống có quân mình
                empties.forEach(i => scores[i] += myCount * 10 + 1);
            } else if (myCount === 0) {
                // Hàng trống có quân đối thủ
                empties.forEach(i => scores[i] += oppCount * 5);
            }
        }

        // Bonus tâm bàn
        const center = Math.floor(s / 2) * s + Math.floor(s / 2);
        if (this.board[center] === '') scores[center] += 30;
        // Bonus 4 góc (bàn nhỏ)
        if (s <= 6) [0, s - 1, s * (s - 1), s * s - 1].forEach(i => {
            if (this.board[i] === '') scores[i] += 15;
        });

        let best = -1, bestScore = -1;
        for (let i = 0; i < s * s; i++) {
            if (this.board[i] === '' && scores[i] > bestScore) {
                bestScore = scores[i];
                best = i;
            }
        }
        return best;
    }

    private showHintHighlight(cellIndex: number) {
        this.clearHintHighlight();
        if (cellIndex < 0) return;
        this.hintCell = cellIndex;
        const cell = this.cells[cellIndex];

        // Tạo node riêng vẽ viền vàng — không đụng màu nền ô
        const borderNode = new Node('HintBorder');
        cell.addChild(borderNode);

        const g = borderNode.addComponent(Graphics);
        const size = cell.getComponent(UITransform)!.contentSize;
        const inset = 5;
        const w = size.width - inset * 2;
        const h = size.height - inset * 2;
        g.strokeColor = new Color(255, 210, 0, 255);
        g.lineWidth = 7;
        g.roundRect(-w / 2, -h / 2, w, h, 14);
        g.stroke();

        // Nháy viền bằng opacity
        const op = borderNode.addComponent(UIOpacity);
        op.opacity = 255;
        tween(op)
            .to(0.45, { opacity: 40 }, { easing: 'sineInOut' })
            .to(0.45, { opacity: 255 }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    private clearHintHighlight() {
        if (this.hintCell < 0) return;
        if (this.hintCell < this.cells.length) {
            this.cells[this.hintCell].getChildByName('HintBorder')?.destroy();
        }
        this.hintCell = -1;
    }

    // ─── Shake button khi hết lượt ───────────────────────────────────────────

    private shakeNode(node: Node) {
        const ox = node.position.x;
        const oy = node.position.y;
        Tween.stopAllByTarget(node);
        tween(node)
            .to(0.05, { position: new Vec3(ox + 10, oy, 0) })
            .to(0.05, { position: new Vec3(ox - 10, oy, 0) })
            .to(0.05, { position: new Vec3(ox + 7,  oy, 0) })
            .to(0.05, { position: new Vec3(ox - 7,  oy, 0) })
            .to(0.05, { position: new Vec3(ox,       oy, 0) })
            .start();
    }
}
