import { _decorator, Component, Node, Label, Vec3, UITransform, Size, SpriteFrame, Rect, Texture2D, Sprite, find, UIOpacity, tween, Tween, Graphics, Color, sys, AudioClip, AudioSource } from 'cc';
import { Tile } from './Tile';
import { SceneTransition } from './SceneTransition';
import { ConfettiEffect } from './ConfettiEffect';
import { SoundManager } from './SoundManager';
const { ccclass, property } = _decorator;

const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/**
 * GameManager.ts
 * Gắn vào một node trống trong scene (ví dụ: node "GameManager").
 *
 * THIẾT LẬP TRONG INSPECTOR:
 *  - gridSize       : kích thước lưới (2 = Dễ, 3 = Trung bình, 4 = Khó)
 *  - boardSize      : tổng chiều rộng/cao của bảng (pixel, mặc định 640)
 *  - gap            : khoảng cách giữa các ô (pixel, mặc định 20)
 *  - tileNodes      : kéo thả các node Tile theo đúng thứ tự tile 1 → (gridSize²-1)
 *  - puzzleImages   : mảng SpriteFrame — kéo nhiều ảnh vào, mỗi ván chọn ngẫu nhiên 1 ảnh
 *  - winPopup       : node popup hiện lên khi thắng (đặt inactive mặc định)
 *  - timeLabel      : Label hiển thị thời gian đang chạy (node TimeLabel)
 *  - bestTimeLabel  : Label hiển thị kỷ lục (node BestTimeLabel)
 */
@ccclass('GameManager')
export class GameManager extends Component {

    // ─── INSPECTOR PROPERTIES ───────────────────────────────────────

    /** Kích thước lưới: 2 (Dễ), 3 (Trung bình), 4 (Khó) */
    @property
    public gridSize: number = 3;

    /** Tổng kích thước bảng chơi (pixel) — dùng để tự tính kích thước ô */
    @property
    public boardSize: number = 640;

    /** Khoảng cách giữa các ô (pixel) */
    @property
    public gap: number = 20;

    /** Mảng các node Tile — kéo thả theo thứ tự tile 1, 2, 3 ... (gridSize²-1) */
    @property([Node])
    public tileNodes: Node[] = [];

    /** Danh sách ảnh puzzle — kéo nhiều SpriteFrame vào, mỗi ván chọn ngẫu nhiên 1 ảnh */
    @property([SpriteFrame])
    public puzzleImages: SpriteFrame[] = [];

    /** Node WinPopup — đặt inactive trong scene, sẽ active khi thắng */
    @property(Node)
    public winPopup: Node = null!;

    /** Sprite bên trong WinPopup dùng để hiển thị ảnh gốc khi thắng (tùy chọn) */
    @property(Sprite)
    public winImageSprite: Sprite = null!;

    /** Sprite component trên thumbnailNode để gán puzzleImage */
    @property(Sprite)
    public thumbnailSprite: Sprite = null!;

    /** Node overlay hiển thị ảnh gốc to khi bấm button ImageGoc */
    @property(Node)
    public imagineGocOverlay: Node = null!;

    /** Sprite lớn bên trong ImagineGocOverlay để hiển thị ảnh gốc */
    @property(Sprite)
    public overlayImageSprite: Sprite = null!;

    /** Label hiển thị thời gian đã chơi — kéo node TimeLabel vào đây */
    @property(Label)
    public timeLabel: Label = null!;

    /** Label hiển thị kỷ lục thời gian ngắn nhất — kéo node BestTimeLabel vào đây */
    @property(Label)
    public bestTimeLabel: Label = null!;

    /** Node badge "Mới!" trên BestTimeLabel — ẩn mặc định, hiện khi phá kỷ lục */
    @property(Node)
    public newRecordBadge: Node = null!;

    /** Node badge "Mới!" trong WinPopup — ẩn mặc định, hiện khi phá kỷ lục */
    @property(Node)
    public winNewRecordBadge: Node = null!;

    /** Label thời gian trong WinPopup */
    @property(Label)
    public winTimeLabel: Label = null!;

    /** Label kỷ lục trong WinPopup */
    @property(Label)
    public winBestTimeLabel: Label = null!;

    /** SFX khi bấm bất kỳ button nào trên màn chơi */
    @property(AudioClip)
    public sfxClick: AudioClip = null!;

    /** SFX ngắn phát khi trượt tile */
    @property(AudioClip)
    public sfxSlide: AudioClip = null!;

    /** Âm thanh fanfare phát khi thắng */
    @property(AudioClip)
    public sfxWin: AudioClip = null!;

    /** Nhạc nền phát loop trong suốt ván chơi */
    @property(AudioClip)
    public bgm: AudioClip = null!;

    /** Node chứa confetti — để trống sẽ tự fallback về parent của WinPopup */
    @property(Node)
    public confettiLayer: Node = null!;

    /** Node ConfirmDialog — đặt inactive mặc định, sẽ active khi bấm Quay lại giữa chừng */
    @property(Node)
    public confirmDialog: Node = null!;

    // ─── STATE NỘI BỘ ───────────────────────────────────────────────

    // Lưới N×N: phần tử = số tile (1..N²-1) hoặc 0 (ô trống)
    private _grid: number[][] = [];

    // Map nhanh: tileNumber → Tile component
    private _tileMap: Map<number, Tile> = new Map();

    // Vị trí hiện tại của ô trống trên lưới
    private _emptyRow: number = 0;
    private _emptyCol: number = 0;

    // Thời gian đã trôi qua trong ván này (giây)
    private _elapsedTime: number = 0;

    // Đồng hồ đang chạy khi true, dừng khi false (thắng hoặc chưa bắt đầu)
    private _timerRunning: boolean = false;

    // Cờ ngăn nhận click khi một tile đang tween
    private _isAnimating: boolean = false;

    // Cờ khóa thao tác khi người chơi đã thắng
    private _daThang: boolean = false;

    // Fade-in chỉ chạy một lần khi scene mới load, không lặp lại khi restart
    private _hasShownFadeIn: boolean = false;

    // Cờ ngăn bấm hint nhiều lần khi đang hiển thị gợi ý
    private _isHinting: boolean = false;

    // Kỷ lục thời gian ngắn nhất của mode này (giây) — Infinity nếu chưa có kỷ lục
    private _bestTime: number = Infinity;

    // Kích thước mỗi ô và bước nhảy — tính lại trong startGame()
    private _tileSize: number = 0;
    private _pitch: number = 0;

    // Tọa độ ô đầu tiên (hàng 0, cột 0) tính từ tâm BoardBG — tính lại trong startGame()
    private _startX: number = 0;
    private _startY: number = 0;

    // Callback ẩn overlay ảnh gốc — lưu reference để unschedule khi cần
    private readonly _onHideImageOverlay = () => {
        if (this.imagineGocOverlay?.isValid) this.imagineGocOverlay.active = false;
    };

    // Node viền vàng nhấp nháy, tile đang gợi ý, và tween nhấp nháy
    private _hintBorderNode: Node | null = null;
    private _hintTile: Tile | null = null;
    private _hintTween: Tween<UIOpacity> | null = null;

    // Lời giải IDA* đã tính trước và bước gợi ý hiện tại
    private _hintSolution: number[] = [];
    private _hintStep: number = 0;

    // AudioSource phát SFX một lần (slide, win)
    private _sfxSource: AudioSource = null!;
    // AudioSource phát nhạc nền loop
    private _bgmSource: AudioSource = null!;

    // Nhớ trạng thái timer trước khi mở confirm dialog — để khôi phục khi bấm Không
    private _wasTimerRunning: boolean = false;

    // Ảnh puzzle đang dùng trong ván hiện tại — chọn ngẫu nhiên từ puzzleImages mỗi startGame()
    private _currentImage: SpriteFrame | null = null;
    // Index ảnh vừa dùng — để đảm bảo không chọn lại ảnh liền trước
    private _currentImageIndex: number = -1;

    // ─── VÒNG ĐỜI ───────────────────────────────────────────────────

    onLoad() {
        // Khởi tạo 2 AudioSource trên node GameManager — chỉ chạy một lần khi scene load
        this._sfxSource = this.node.addComponent(AudioSource);
        this._bgmSource = this.node.addComponent(AudioSource);
        this._bgmSource.loop = true;
    }

    onEnable() {
        // Fade-in từ đen → trong suốt chỉ một lần khi scene mới load
        if (!this._hasShownFadeIn) {
            this._hasShownFadeIn = true;
            const canvas = find('Canvas');
            if (canvas) SceneTransition.fadeIn(canvas);
        }
        // Mỗi lần vào scene (hoặc node được enable) bắt đầu ván mới
        this.startGame();
    }

    update(dt: number) {
        if (!this._timerRunning) return;
        this._elapsedTime += dt;
        this._updateTimerLabel();
    }

    // ─── PUBLIC API ──────────────────────────────────────────────────

    /**
     * Khởi tạo toàn bộ ván chơi:
     * gán số cho ô, đặt kích thước/vị trí, xáo trộn, reset số bước.
     * Gọi được từ nút "Restart" hoặc tự động qua onEnable().
     */
    public startGame() {
        // Dừng tất cả tween tile và callback pending — tránh xung đột khi spam restart
        this.unscheduleAllCallbacks();
        this._stopHintBlink();
        for (const n of this.tileNodes) {
            if (!n?.isValid) continue;
            Tween.stopAllByTarget(n);
            const op = n.getComponent(UIOpacity);
            if (op) { Tween.stopAllByTarget(op); op.opacity = 255; }
        }

        // Dừng nhạc nền và confetti của ván trước (nếu restart giữa chừng)
        this._bgmSource?.stop();
        this._getConfettiLayer()?.getComponent(ConfettiEffect)?.stop();
        if (this.confirmDialog?.isValid) this.confirmDialog.active = false;

        // Chọn ngẫu nhiên ảnh puzzle cho ván này
        this._currentImage = this._pickRandomImage();

        const n = this.gridSize;
        const expected = n * n - 1;

        // Kiểm tra số lượng tile có khớp với gridSize không
        if (this.tileNodes.length !== expected) {
            console.warn(
                `[GameManager] Số ô tile không khớp: lưới ${n}×${n} cần ${expected} ô ` +
                `nhưng tileNodes có ${this.tileNodes.length} phần tử. Dừng khởi tạo an toàn.`
            );
            return;
        }

        // Đọc kích thước và vị trí BoardBG để tính tile size và điểm đặt tile chính xác
        const boardNode  = this.tileNodes[0]?.parent;
        const boardBG    = boardNode?.getChildByName('BoardBG');
        const boardBGUI  = boardBG?.getComponent(UITransform);
        const boardBGPos = boardBG?.position;
        const actualSize = boardBGUI?.contentSize.width ?? this.boardSize;

        this._tileSize = (actualSize - this.gap * (n + 1)) / n;
        this._pitch    = this._tileSize + this.gap;

        // Tính điểm xuất phát (tâm tile ở hàng 0, cột 0) dựa trên tâm và kích thước BoardBG
        const ox = boardBGPos?.x ?? 0;
        const oy = boardBGPos?.y ?? 0;
        this._startX = ox - actualSize / 2 + this.gap + this._tileSize / 2;
        this._startY = oy + actualSize / 2 - this.gap - this._tileSize / 2;

        // Xây dựng tile map, gán số logic và cập nhật Label + UITransform mỗi ô
        this._tileMap.clear();
        for (let i = 0; i < this.tileNodes.length; i++) {
            const node = this.tileNodes[i];
            if (!node) {
                console.warn(`[GameManager] tileNodes[${i}] chưa được gán trong Inspector.`);
                continue;
            }

            const tile = node.getComponent(Tile);
            if (!tile) {
                console.error(`[GameManager] tileNodes[${i}] ("${node.name}") không có component Tile!`);
                continue;
            }

            // Tile ở index i có số cố định là i+1
            tile.tileNumber = i + 1;
            this._tileMap.set(tile.tileNumber, tile);
            tile.setClickCallback((t) => this._onTileClicked(t));

            // Cập nhật UITransform theo tileSize vừa tính từ BoardBG
            const ui = node.getComponent(UITransform);
            if (ui) ui.setContentSize(new Size(this._tileSize, this._tileSize));

            if (this._currentImage) {
                // Chế độ ảnh: cắt SpriteFrame đúng vùng ảnh của ô này từ texture gốc
                const tex = this._currentImage.texture as Texture2D;
                // Chia đều texture thành n×n mảnh theo kích thước pixel thực
                const pieceW = tex.width / n;
                const pieceH = tex.height / n;
                // Vị trí đã giải của tile thứ i (0-indexed), bỏ qua ô trống (0, n-1):
                //   i < n-1  → hàng 0, cột i (bên trái ô trống)
                //   i >= n-1 → bỏ qua vị trí (0, n-1), tiếp tục từ (1, 0)
                let solvedRow: number, solvedCol: number;
                if (i < n - 1) {
                    solvedRow = 0;
                    solvedCol = i;
                } else {
                    const adjusted = i + 1; // bỏ qua index n-1 là ô trống
                    solvedRow = Math.floor(adjusted / n);
                    solvedCol = adjusted % n;
                }

                const tileSF = new SpriteFrame();
                tileSF.texture = tex;
                tileSF.rect = new Rect(solvedCol * pieceW, solvedRow * pieceH, pieceW, pieceH);
                tileSF.originalSize = new Size(pieceW, pieceH);
                tile.setupImageTile(tileSF);

                // Ẩn Label số nếu vẫn còn trong node tile
                const label = node.getComponentInChildren(Label);
                if (label) {
                    label.node.active = false;
                }
            } else {
                // Chế độ fallback: hiển thị chữ số như cũ
                const label = node.getComponentInChildren(Label);
                if (label) {
                    label.node.active = true;
                    label.string = String(i + 1);
                }
            }
        }

        // Reset lưới về trạng thái đã giải → xáo trộn → sync vị trí tức thì
        this._resetGrid();
        this._shuffle();
        this._syncAllTilePositions(false);

        this._elapsedTime = 0;
        this._daThang = false;
        this._stopHintBlink();
        this._hintSolution = [];
        this._hintStep = 0;
        if (this.newRecordBadge) this.newRecordBadge.active = false;
        if (this.winNewRecordBadge) this.winNewRecordBadge.active = false;
        this.unschedule(this._onHideImageOverlay);
        if (this.imagineGocOverlay) this.imagineGocOverlay.active = false;
        this._updateTimerLabel();
        if (this.winPopup) this.winPopup.active = false;

        // Đọc kỷ lục từ localStorage (key riêng cho từng kích thước lưới)
        const storedBest = sys.localStorage.getItem(`SlidingPuzzle_BestTime_${this.gridSize}`);
        this._bestTime = storedBest ? parseFloat(storedBest) : Infinity;
        this._updateBestTimeLabel();

        // Gán ảnh gốc vào thumbnail (luôn hiển thị trong info panel)
        if (this.thumbnailSprite && this._currentImage) {
            this.thumbnailSprite.spriteFrame = this._currentImage;
            this.thumbnailSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        }

        this._timerRunning = false;
        this._isAnimating = true;

        // Bắt đầu nhạc nền — tự im lặng nếu đang muted
        SoundManager.playBgm(this._bgmSource, this.bgm);

        // Tính trước lời giải hint ngay frame tiếp theo — sẵn sàng trước khi người chơi kịp bấm
        this.scheduleOnce(() => { this._hintSolution = this._computeHintSolution(); }, 0);

        this._playBoardEntrance();
    }

    /**
     * Gọi từ nút "ImageGoc" trong scene.
     * Hiển thị ảnh gốc to trong 2 giây rồi tự ẩn.
     */
    public showImageGoc() {
        this._playClick();
        if (!this.imagineGocOverlay) return;

        // Gán ảnh puzzle vào sprite lớn trong overlay
        if (this.overlayImageSprite && this._currentImage) {
            this.overlayImageSprite.spriteFrame = this._currentImage;
            this.overlayImageSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        }

        // Hủy lịch ẩn cũ (nếu bấm nhanh 2 lần) rồi hiện overlay
        this.unschedule(this._onHideImageOverlay);
        this.imagineGocOverlay.active = true;
        this.scheduleOnce(this._onHideImageOverlay, 2);
    }

    /**
     * Gọi từ nút "Restart" trong scene.
     * Hủy animation đang chạy (nếu có) rồi bắt đầu ván mới.
     */
    public restartGame() {
        this._playClick();
        this._isAnimating = false;
        this.startGame();
    }

    /**
     * Gọi từ nút "Hint" trong scene.
     * Tính lời giải tối ưu (IDA*) rồi gợi ý tile cần di chuyển tiếp theo.
     * Bấm Hint liên tục sẽ giải được toàn bộ màn chơi.
     */
    public showHint() {
        this._playClick();
        if (this._daThang || this._isHinting || this._isAnimating) return;

        // Tính lại nếu chưa có lời giải hoặc đã dùng hết các bước
        if (this._hintStep >= this._hintSolution.length) {
            this._hintSolution = this._computeHintSolution();
            this._hintStep = 0;
            if (this._hintSolution.length === 0) return;
        }

        const tileNum = this._hintSolution[this._hintStep];
        const hintTile = this._tileMap.get(tileNum);
        if (!hintTile) return;

        // Cộng 5 giây penalty vào timer và nháy label để báo hiệu
        this._elapsedTime += 5;
        this._updateTimerLabel();
        this._flashTimerPenalty();

        this._isHinting = true;
        this._hintTile = hintTile;
        this._showHintBlink(hintTile);
    }

    /**
     * IDA* với heuristic Manhattan + Linear Conflict.
     * - Ngưỡng ban đầu = MD + LC → thường tìm lời giải ngay vòng đầu, ít lặp hơn Manhattan thuần.
     * - Incremental Manhattan O(1) mỗi bước DFS.
     * - Timeout 200ms → fallback beam search nếu lưới 4×4 quá phức tạp.
     */
    private _computeHintSolution(): number[] {
        const n = this.gridSize;
        const grid = this._grid.map(r => [...r]);
        const { goalR, goalC } = this._buildGoalPositions();

        // Manhattan ban đầu — tính đầy đủ một lần
        let initMD = 0;
        for (let r = 0; r < n; r++)
            for (let c = 0; c < n; c++) {
                const v = grid[r][c];
                if (v !== 0) initMD += Math.abs(r - goalR[v]) + Math.abs(c - goalC[v]);
            }
        if (initMD === 0) return [];

        // Linear Conflict tại root — nâng ngưỡng IDA* ban đầu, giảm số vòng lặp
        let lc = 0;
        for (let r = 0; r < n; r++)
            for (let c1 = 0; c1 < n - 1; c1++) {
                const t1 = grid[r][c1];
                if (!t1 || goalR[t1] !== r) continue;
                for (let c2 = c1 + 1; c2 < n; c2++) {
                    const t2 = grid[r][c2];
                    if (!t2 || goalR[t2] !== r) continue;
                    if (goalC[t1] > goalC[t2]) lc += 2;
                }
            }
        for (let c = 0; c < n; c++)
            for (let r1 = 0; r1 < n - 1; r1++) {
                const t1 = grid[r1][c];
                if (!t1 || goalC[t1] !== c) continue;
                for (let r2 = r1 + 1; r2 < n; r2++) {
                    const t2 = grid[r2][c];
                    if (!t2 || goalC[t2] !== c) continue;
                    if (goalR[t1] > goalR[t2]) lc += 2;
                }
            }

        const path: number[] = [];
        let nodeCount = 0;
        const TIMEOUT_MS = 200;
        const startTime = Date.now();
        let timedOut = false;

        // DFS của IDA* — incremental Manhattan O(1) mỗi bước
        const dfs = (
            er: number, ec: number,
            depth: number, threshold: number,
            prevDr: number, prevDc: number,
            curMD: number
        ): number => {
            const f = depth + curMD;
            if (f > threshold) return f;
            if (curMD === 0) return -1; // giải xong!
            // Kiểm tra timeout mỗi 65536 node — tránh gọi Date.now() quá nhiều
            if ((++nodeCount & 0xFFFF) === 0 && Date.now() - startTime > TIMEOUT_MS) {
                timedOut = true;
                return Infinity;
            }

            let minF = Infinity;
            for (const [dr, dc] of DIRS) {
                if (dr === -prevDr && dc === -prevDc) continue;
                const nr = er + dr, nc = ec + dc;
                if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;

                const t = grid[nr][nc];
                const nextMD = curMD
                    - Math.abs(nr - goalR[t]) - Math.abs(nc - goalC[t])
                    + Math.abs(er - goalR[t]) + Math.abs(ec - goalC[t]);

                grid[er][ec] = t; grid[nr][nc] = 0;
                path.push(t);
                const res = dfs(nr, nc, depth + 1, threshold, dr, dc, nextMD);
                if (res === -1) return -1;
                if (res < minF) minF = res;
                path.pop();
                grid[nr][nc] = t; grid[er][ec] = 0;
                if (timedOut) return Infinity;
            }
            return minF;
        };

        // Ngưỡng ban đầu = MD + LC → thường giải được ngay vòng đầu tiên
        let threshold = initMD + lc;
        while (threshold <= 200 && !timedOut) {
            const res = dfs(this._emptyRow, this._emptyCol, 0, threshold, 0, 0, initMD);
            if (res === -1) return [...path];
            if (res === Infinity) break;
            threshold = res;
        }

        // Fallback: beam search nếu IDA* timeout (lưới 4×4 rất khó)
        return this._greedyHintStep();
    }

    /**
     * Beam search độ sâu 7, beam width 25 — fallback khi IDA* timeout.
     * Tìm chuỗi bước giảm Manhattan nhiều nhất trong tầm nhìn gần.
     * Trả về toàn bộ path để người chơi có thể bấm hint nhiều lần liên tiếp.
     */
    private _greedyHintStep(): number[] {
        const DEPTH = 7, BEAM = 25;
        const n = this.gridSize;
        const { goalR, goalC } = this._buildGoalPositions();

        const hFn = (g: number[][]): number => {
            let s = 0;
            for (let r = 0; r < n; r++)
                for (let c = 0; c < n; c++) {
                    const v = g[r][c];
                    if (v !== 0) s += Math.abs(r - goalR[v]) + Math.abs(c - goalC[v]);
                }
            return s;
        };

        type St = { g: number[][]; er: number; ec: number; path: number[]; hv: number };
        let front: St[] = [{
            g: this._grid.map(r => [...r]),
            er: this._emptyRow, ec: this._emptyCol,
            path: [], hv: hFn(this._grid)
        }];
        let bestH = front[0].hv, bestPath: number[] = [];

        for (let d = 0; d < DEPTH && front.length > 0; d++) {
            const next: St[] = [];
            for (const st of front) {
                for (const [dr, dc] of DIRS) {
                    const nr = st.er + dr, nc = st.ec + dc;
                    if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
                    const ng = st.g.map(r => [...r]);
                    const t = ng[nr][nc];
                    ng[st.er][st.ec] = t; ng[nr][nc] = 0;
                    const hv = hFn(ng);
                    const path = [...st.path, t];
                    if (hv === 0) return path; // giải xong!
                    if (hv < bestH) { bestH = hv; bestPath = path; }
                    next.push({ g: ng, er: nr, ec: nc, path, hv });
                }
            }
            next.sort((a, b) => a.hv - b.hv);
            front = next.slice(0, BEAM);
        }

        if (bestPath.length > 0) return bestPath;
        // Last resort: bất kỳ tile kề nào
        for (const [dr, dc] of DIRS) {
            const nr = this._emptyRow + dr, nc = this._emptyCol + dc;
            if (nr >= 0 && nr < n && nc >= 0 && nc < n) return [this._grid[nr][nc]];
        }
        return [];
    }

    /** Bảng vị trí đã giải: goalR[t] và goalC[t] là hàng/cột đích của tile t */
    private _buildGoalPositions(): { goalR: number[]; goalC: number[] } {
        const n = this.gridSize;
        const goalR = new Array<number>(n * n);
        const goalC = new Array<number>(n * n);
        goalR[0] = 0; goalC[0] = n - 1; // ô trống về góc trên phải
        let num = 1;
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                if (r === 0 && c === n - 1) continue;
                goalR[num] = r; goalC[num] = c; num++;
            }
        }
        return { goalR, goalC };
    }

    /** Tạo viền vàng nhấp nháy 3 lần trên tile được gợi ý */
    private _showHintBlink(tile: Tile) {
        const node = tile.node;
        node.getChildByName('__HintBorder__')?.destroy();

        const borderNode = new Node('__HintBorder__');
        node.addChild(borderNode);
        borderNode.layer = node.layer;
        borderNode.setPosition(0, 0, 0);

        const ui = borderNode.addComponent(UITransform);
        ui.setContentSize(new Size(this._tileSize, this._tileSize));

        const gfx = borderNode.addComponent(Graphics);
        gfx.strokeColor = new Color(255, 200, 0, 255); // vàng
        gfx.lineWidth = 8;
        const half = this._tileSize / 2;
        gfx.rect(-half, -half, this._tileSize, this._tileSize);
        gfx.stroke();

        const opComp = borderNode.addComponent(UIOpacity);
        opComp.opacity = 0;
        this._hintBorderNode = borderNode;

        const PHASE = 0.25; // giây mỗi pha sáng/tắt
        this._hintTween = tween(opComp)
            .to(PHASE, { opacity: 255 })
            .to(PHASE, { opacity: 0 })
            .to(PHASE, { opacity: 255 })
            .to(PHASE, { opacity: 0 })
            .to(PHASE, { opacity: 255 })
            .to(PHASE, { opacity: 0 })
            .call(() => {
                if (borderNode.isValid) borderNode.destroy();
                this._hintBorderNode = null;
                this._hintTile = null;
                this._hintTween = null;
                this._isHinting = false;
            })
            .start();
    }

    /** Dừng nhấp nháy gợi ý ngay lập tức và dọn dẹp */
    private _stopHintBlink() {
        if (this._hintTween) {
            this._hintTween.stop();
            this._hintTween = null;
        }
        if (this._hintBorderNode?.isValid) {
            this._hintBorderNode.destroy();
        }
        this._hintBorderNode = null;
        this._hintTile = null;
        this._isHinting = false;
    }

    // ─── KHỞI TẠO LƯỚI ──────────────────────────────────────────────

    /** Đặt lưới về trạng thái giải xong chuẩn: ô trống ở góc TRÊN PHẢI (0, n-1), tile 1..N²-1 điền các ô còn lại theo thứ tự */
    private _resetGrid() {
        const n = this.gridSize;
        this._grid = [];
        // Điền tile theo thứ tự trái→phải, trên→dưới, bỏ qua vị trí (0, n-1)
        let num = 1;
        for (let r = 0; r < n; r++) {
            this._grid[r] = [];
            for (let c = 0; c < n; c++) {
                this._grid[r][c] = (r === 0 && c === n - 1) ? 0 : num++;
            }
        }
        // Ô trống ở góc trên phải
        this._emptyRow = 0;
        this._emptyCol = n - 1;
    }

    /**
     * XÁO TRỘN AN TOÀN — đảm bảo 100% lưới luôn giải được.
     *
     * Nguyên lý: bắt đầu từ trạng thái ĐÃ GIẢI XONG, thực hiện
     * 150–250 bước trượt ngẫu nhiên HỢP LỆ liên tiếp.
     * Vì mỗi bước là một nước trượt thực tế nên trạng thái cuối
     * luôn nằm trong không gian giải được — không cần đếm inversion.
     */
    private _shuffle() {
        const n = this.gridSize;
        // Lưu vị trí ô trống trước bước vừa rồi để tránh undo ngay lập tức
        let prevEmptyRow = -1;
        let prevEmptyCol = -1;

        const doOneStep = () => {
            const candidates: [number, number][] = [];
            for (const [dr, dc] of DIRS) {
                const nr = this._emptyRow + dr;
                const nc = this._emptyCol + dc;
                if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
                if (nr === prevEmptyRow && nc === prevEmptyCol) continue;
                candidates.push([nr, nc]);
            }
            if (candidates.length === 0) return;

            const [mr, mc] = candidates[Math.floor(Math.random() * candidates.length)];
            prevEmptyRow = this._emptyRow;
            prevEmptyCol = this._emptyCol;

            this._grid[this._emptyRow][this._emptyCol] = this._grid[mr][mc];
            this._grid[mr][mc] = 0;
            this._emptyRow = mr;
            this._emptyCol = mc;
        };

        // Thực hiện 150–250 bước xáo ngẫu nhiên
        const steps = 150 + Math.floor(Math.random() * 101);
        for (let i = 0; i < steps; i++) {
            doOneStep();
        }

        // Phòng trường hợp cực hiếm: xáo xong lại ra đúng trạng thái thắng
        while (this._isSolved()) {
            const extra = 30 + Math.floor(Math.random() * 20);
            for (let i = 0; i < extra; i++) {
                doOneStep();
            }
        }
    }

    // ─── XỬ LÝ CLICK ────────────────────────────────────────────────

    /** Nhận sự kiện click từ một Tile, xử lý logic trượt */
    private _onTileClicked(tile: Tile) {
        if (this._daThang) return;
        if (this._isAnimating) return;

        // Dừng nhấp nháy nếu đang hiển thị
        if (this._isHinting) this._stopHintBlink();

        const { row, col } = tile;
        const dr = Math.abs(row - this._emptyRow);
        const dc = Math.abs(col - this._emptyCol);
        const isAdjacent = (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
        if (!isAdjacent) {
            this._playClick();
            return;
        }

        // Tile kề ô trống: cập nhật theo dõi lời giải gợi ý
        // Kiểm tra theo tileNumber và isAdjacent thực tế — không phụ thuộc trạng thái blink
        if (this._hintSolution.length > 0 && this._hintStep < this._hintSolution.length) {
            if (tile.tileNumber === this._hintSolution[this._hintStep]) {
                this._hintStep++;
            } else {
                this._hintSolution = [];
                this._hintStep = 0;
            }
        }

        SoundManager.playSfx(this._sfxSource, this.sfxSlide);

        // Cập nhật mảng dữ liệu lưới
        this._grid[this._emptyRow][this._emptyCol] = tile.tileNumber;
        this._grid[row][col] = 0;

        const destRow = this._emptyRow;
        const destCol = this._emptyCol;
        this._emptyRow = row;
        this._emptyCol = col;
        tile.row = destRow;
        tile.col = destCol;

        // Tween tile tới vị trí ô trống, khóa click trong lúc di chuyển
        this._isAnimating = true;
        tile.moveTo(this._calcPixelPos(destRow, destCol), () => {
            this._isAnimating = false;
        });

        this._checkWin();
    }

    // ─── ANIMATION ──────────────────────────────────────────────────

    /**
     * Tile rơi từ trên xuống vị trí đúng với stagger theo thứ tự hàng-cột.
     * Giữ _isAnimating = true trong suốt thời gian, mở khóa và bắt đầu đếm giờ khi xong.
     */
    private _playBoardEntrance() {
        const n = this.gridSize;
        const tiles: Tile[] = [];
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const num = this._grid[r][c];
                if (num === 0) continue;
                const tile = this._tileMap.get(num);
                if (tile) tiles.push(tile);
            }
        }

        const STAGGER = 0.045; // giây giữa mỗi tile
        const DUR     = 0.28;  // thời gian rơi mỗi tile
        const DROP    = 130;   // pixel rơi từ trên xuống

        tiles.forEach((tile, i) => {
            const dest = tile.node.position.clone();
            tile.node.setPosition(dest.x, dest.y + DROP, dest.z);

            const op = tile.node.getComponent(UIOpacity) ?? tile.node.addComponent(UIOpacity);
            op.opacity = 0;

            tween(op)
                .delay(i * STAGGER)
                .to(DUR * 0.55, { opacity: 255 })
                .start();

            tween(tile.node)
                .delay(i * STAGGER)
                .to(DUR, { position: dest }, { easing: 'backOut' })
                .start();
        });

        // Mở khóa input và bắt đầu đếm giờ sau khi tile cuối cùng đổ xuống xong
        const totalTime = tiles.length * STAGGER + DUR + 0.05;
        this.scheduleOnce(() => {
            this._isAnimating = false;
            this._timerRunning = true;
        }, totalTime);
    }

    /** WinPopup bật ra từ nhỏ với bounce và fade in */
    private _showWinPopup() {
        if (!this.winPopup) return;
        this.winPopup.setScale(new Vec3(0.15, 0.15, 1));
        this.winPopup.active = true;

        // Kích hoạt confetti ngay khi popup xuất hiện
        const layer = this._getConfettiLayer();
        if (layer?.isValid) {
            const effect = layer.getComponent(ConfettiEffect) ?? layer.addComponent(ConfettiEffect);
            effect.play();
        }

        const op = this.winPopup.getComponent(UIOpacity) ?? this.winPopup.addComponent(UIOpacity);
        op.opacity = 0;

        tween(op)
            .to(0.22, { opacity: 255 })
            .start();

        tween(this.winPopup)
            .to(0.38, { scale: new Vec3(1.06, 1.06, 1) }, { easing: 'backOut' })
            .to(0.12, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineOut' })
            .start();
    }

    // ─── ĐIỀU KIỆN THẮNG ────────────────────────────────────────────

    /** Kiểm tra lưới hiện tại có phải trạng thái đã giải không: ô trống về (0, n-1), tile về đúng vị trí */
    private _isSolved(): boolean {
        const n = this.gridSize;
        let num = 1;
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                // Ô trống phải ở góc trên phải
                const expected = (r === 0 && c === n - 1) ? 0 : num++;
                if (this._grid[r][c] !== expected) return false;
            }
        }
        return true;
    }

    /** Hiện popup thắng nếu lưới đã về trạng thái giải xong */
    private _checkWin() {
        if (this._isSolved()) {
            this._daThang = true;
            this._timerRunning = false; // đóng băng đồng hồ tại thời điểm thắng

            this._bgmSource?.stop();
            SoundManager.playSfx(this._sfxSource, this.sfxWin);

            // Cập nhật kỷ lục nếu thời gian lần này ngắn hơn
            if (this._elapsedTime < this._bestTime) {
                this._bestTime = this._elapsedTime;
                sys.localStorage.setItem(
                    `SlidingPuzzle_BestTime_${this.gridSize}`,
                    String(this._bestTime)
                );
                this._updateBestTimeLabel();
                if (this.newRecordBadge) this.newRecordBadge.active = true;
                if (this.winNewRecordBadge) this.winNewRecordBadge.active = true;
            }

            // Gán ảnh gốc vào Sprite hiển thị bên trong WinPopup (nếu có)
            if (this.winImageSprite && this._currentImage) {
                this.winImageSprite.spriteFrame = this._currentImage;
                this.winImageSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            }
            // Hiển thị thời gian và kỷ lục trong WinPopup
            if (this.winTimeLabel) {
                this.winTimeLabel.string = `Thời gian\n${this._formatTime(this._elapsedTime)}`;
            }
            if (this.winBestTimeLabel) {
                const best = this._bestTime < Infinity ? this._formatTime(this._bestTime) : '--:--';
                this.winBestTimeLabel.string = `Kỷ lục\n${best}`;
            }
            if (this.winPopup) this._showWinPopup();
        }
    }

    // ─── TIỆN ÍCH VỊ TRÍ ────────────────────────────────────────────

    /**
     * Tính tọa độ local (pixel) từ vị trí lưới (row, col).
     * Node cha của các tile đặt ở trung tâm — lưới căn giữa theo boardSize.
     */
    private _calcPixelPos(row: number, col: number): Vec3 {
        // _startX/_startY là tâm tile (0,0) đã được tính căn theo BoardBG trong startGame()
        return new Vec3(
            this._startX + col * this._pitch,
            this._startY - row * this._pitch,
            0
        );
    }

    /** Đồng bộ vị trí pixel của tất cả tile theo trạng thái lưới hiện tại */
    private _syncAllTilePositions(animate: boolean) {
        const n = this.gridSize;
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                const num = this._grid[r][c];
                if (num === 0) continue; // ô trống không có node

                const tile = this._tileMap.get(num);
                if (!tile) continue;

                tile.row = r;
                tile.col = c;
                const pos = this._calcPixelPos(r, c);
                if (animate) {
                    tile.moveTo(pos);
                } else {
                    tile.node.setPosition(pos);
                }
            }
        }
    }

    /** Định dạng tổng số giây → chuỗi MM:SS */
    private _formatTime(totalSeconds: number): string {
        const total = Math.floor(totalSeconds);
        const mm = Math.floor(total / 60).toString().padStart(2, '0');
        const ss = (total % 60).toString().padStart(2, '0');
        return `${mm}:${ss}`;
    }

    /** Cập nhật Label thời gian hiện tại */
    private _updateTimerLabel() {
        if (!this.timeLabel) return;
        this.timeLabel.string = `Thời gian\n${this._formatTime(this._elapsedTime)}`;
    }

    /** Cập nhật Label kỷ lục — hiển thị "--:--" nếu chưa có kỷ lục */
    private _updateBestTimeLabel() {
        if (!this.bestTimeLabel) return;
        const timeStr = this._bestTime < Infinity
            ? this._formatTime(this._bestTime)
            : '--:--';
        this.bestTimeLabel.string = `Kỷ lục\n${timeStr}`;
    }

    /**
     * Gọi từ nút Back và nút "Quay lại" trong WinPopup.
     * Nếu đã thắng (WinPopup) → về menu thẳng.
     * Nếu chưa thắng → hiện confirm dialog trước.
     */
    public goToMenu() {
        this._playClick();
        if (this._daThang) {
            this.scheduleOnce(() => SceneTransition.go('MenuScene', this.node), 0.1);
            return;
        }
        this._showConfirmDialog();
    }

    /** Hiện confirm dialog với pop-in animation, tạm dừng timer */
    private _showConfirmDialog() {
        // Fallback: chưa setup dialog trong Editor → về menu thẳng như cũ
        if (!this.confirmDialog?.isValid) {
            this.scheduleOnce(() => SceneTransition.go('MenuScene', this.node), 0.1);
            return;
        }
        this._wasTimerRunning = this._timerRunning;
        this._timerRunning = false;
        this.confirmDialog.active = true;
        const op = this.confirmDialog.getComponent(UIOpacity) ?? this.confirmDialog.addComponent(UIOpacity);
        op.opacity = 0;
        this.confirmDialog.setScale(new Vec3(0.7, 0.7, 1));
        tween(op).to(0.2, { opacity: 255 }).start();
        tween(this.confirmDialog)
            .to(0.22, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    /** Nút "Có" trong ConfirmDialog — đóng dialog rồi về MenuScene */
    public onConfirmBack() {
        if (this.confirmDialog?.isValid) this.confirmDialog.active = false;
        SoundManager.playSfx(this._sfxSource, this.sfxClick);
        this.scheduleOnce(() => SceneTransition.go('MenuScene', this.node), 0.1);
    }

    /** Nút "Không" trong ConfirmDialog — đóng dialog, tiếp tục chơi */
    public onCancelBack() {
        if (!this.confirmDialog?.isValid) return;
        SoundManager.playSfx(this._sfxSource, this.sfxClick);
        const op = this.confirmDialog.getComponent(UIOpacity) ?? this.confirmDialog.addComponent(UIOpacity);
        tween(op)
            .to(0.15, { opacity: 0 })
            .call(() => { if (this.confirmDialog?.isValid) this.confirmDialog.active = false; })
            .start();
        this._timerRunning = this._wasTimerRunning;
    }

    /**
     * Dùng khi cần gọi playClickSfx độc lập từ bên ngoài (nếu cần).
     */
    public playClickSfx() {
        this._playClick();
    }

    private _playClick() {
        SoundManager.playSfx(this._sfxSource, this.sfxClick);
    }

    /** Nháy mờ Label thời gian 2 lần để báo hiệu penalty gợi ý */
    private _flashTimerPenalty() {
        if (!this.timeLabel?.isValid) return;
        const op = this.timeLabel.node.getComponent(UIOpacity)
                 ?? this.timeLabel.node.addComponent(UIOpacity);
        tween(op)
            .to(0.08, { opacity: 60 })
            .to(0.08, { opacity: 255 })
            .to(0.08, { opacity: 60 })
            .to(0.12, { opacity: 255 })
            .start();
    }

    /** Chọn ngẫu nhiên 1 SpriteFrame từ puzzleImages, không trùng ảnh vừa dùng */
    private _pickRandomImage(): SpriteFrame | null {
        const len = this.puzzleImages.length;
        if (!len) return null;
        // Nếu chỉ có 1 ảnh thì không thể tránh trùng — trả về luôn
        if (len === 1) return this.puzzleImages[0];
        let idx: number;
        do {
            idx = Math.floor(Math.random() * len);
        } while (idx === this._currentImageIndex);
        this._currentImageIndex = idx;
        return this.puzzleImages[idx];
    }

    /** Trả về node chứa confetti: confettiLayer nếu có, fallback về parent của WinPopup */
    private _getConfettiLayer(): Node | null {
        if (this.confettiLayer?.isValid) return this.confettiLayer;
        const parent = this.winPopup?.parent;
        return parent?.isValid ? parent : null;
    }

}
