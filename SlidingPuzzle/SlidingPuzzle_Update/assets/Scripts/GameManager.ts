import { _decorator, Component, Node, Label, Vec3, UITransform, Size, SpriteFrame, Sprite, Rect } from 'cc';
import { Tile } from './Tile';
const { ccclass, property } = _decorator;

/**
 * GameManager.ts
 * Gắn vào một node trống trong scene (ví dụ: node "GameManager").
 *
 * THIẾT LẬP TRONG INSPECTOR:
 *  - gridSize       : kích thước lưới (2 = Dễ, 3 = Trung bình, 4 = Khó)
 *  - boardSize      : tổng chiều rộng/cao của bảng (pixel, mặc định 640)
 *  - gap            : khoảng cách giữa các ô (pixel, mặc định 20)
 *  - tileNodes      : kéo thả các node Tile theo đúng thứ tự tile 1 → (gridSize²-1)
 *  - puzzleImage    : SpriteFrame ảnh gốc — code tự cắt thành N×N mảnh lúc runtime
 *  - winPopup       : node popup hiện lên khi thắng (đặt inactive mặc định)
 *  - moveCountLabel : Label hiển thị số bước (tùy chọn)
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

    /** Ảnh gốc để cắt thành các mảnh puzzle — mảnh góc trên-phải luôn bị khuyết */
    @property(SpriteFrame)
    public puzzleImage: SpriteFrame = null!;

    /** Node WinPopup — đặt inactive trong scene, sẽ active khi thắng */
    @property(Node)
    public winPopup: Node = null!;

    /** Sprite hiển thị ảnh gốc hoàn chỉnh bên trong WinPopup */
    @property(Sprite)
    public winImageSprite: Sprite = null!;

    /** Node overlay gợi ý — che màn hình + hiện ảnh gốc 3 giây (inactive mặc định) */
    @property(Node)
    public hintOverlay: Node = null!;

    /** Sprite bên trong hintOverlay để hiện ảnh gốc */
    @property(Sprite)
    public hintImageSprite: Sprite = null!;

    /** Label hiển thị số bước (tùy chọn, để trống nếu không dùng) */
    @property(Label)
    public moveCountLabel: Label = null!;

    // ─── STATE NỘI BỘ ───────────────────────────────────────────────

    // Lưới N×N: phần tử = số tile (1..N²-1) hoặc 0 (ô trống)
    private _grid: number[][] = [];

    // Map nhanh: tileNumber → Tile component
    private _tileMap: Map<number, Tile> = new Map();

    // Vị trí hiện tại của ô trống trên lưới
    private _emptyRow: number = 0;
    private _emptyCol: number = 0;

    // Số bước đã thực hiện trong ván này
    private _moveCount: number = 0;

    // Cờ ngăn nhận click khi một tile đang tween
    private _isAnimating: boolean = false;

    // Cờ khóa thao tác khi người chơi đã thắng
    private _daThang: boolean = false;

    // Kích thước mỗi ô và bước nhảy — tính lại trong startGame()
    private _tileSize: number = 0;
    private _pitch: number = 0;

    // ─── VÒNG ĐỜI ───────────────────────────────────────────────────

    onEnable() {
        // Mỗi lần vào scene (hoặc node được enable) bắt đầu ván mới
        this.startGame();
    }

    // ─── PUBLIC API ──────────────────────────────────────────────────

    /**
     * Khởi tạo toàn bộ ván chơi:
     * gán ảnh cho ô, đặt kích thước/vị trí, xáo trộn, reset số bước.
     * Gọi được từ nút "Restart" hoặc tự động qua onEnable().
     */
    public startGame() {
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

        // Tính kích thước ô và bước nhảy từ boardSize, gap, gridSize
        this._tileSize = (this.boardSize - this.gap * (n + 1)) / n;
        this._pitch = this._tileSize + this.gap;

        // Xây dựng tile map, gán ảnh và cập nhật UITransform mỗi ô
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

            // Đặt kích thước UITransform theo tileSize vừa tính
            const ui = node.getComponent(UITransform);
            if (ui) {
                ui.setContentSize(new Size(this._tileSize, this._tileSize));
            }

            // Cắt và gán mảnh ảnh tương ứng vị trí logic của tile
            this._applyImageToTile(node, i + 1);
        }

        // Reset lưới về trạng thái đã giải → xáo trộn → sync vị trí tức thì
        this._resetGrid();
        this._shuffle();
        this._syncAllTilePositions(false);

        this._moveCount = 0;
        this._isAnimating = false;
        this._daThang = false;
        this._updateMoveLabel();

        // Ẩn popup thắng nếu còn hiển thị từ ván trước
        if (this.winPopup) {
            this.winPopup.active = false;
        }
    }

    /**
     * Gọi từ nút "Restart" trong scene.
     * Hủy animation đang chạy (nếu có) rồi bắt đầu ván mới.
     */
    public restartGame() {
        this._isAnimating = false;
        this.startGame();
    }

    /**
     * Gọi từ nút gợi ý (bóng đèn).
     * Hiện ảnh gốc hoàn chỉnh trong 3 giây, khóa mọi thao tác trong lúc đó.
     */
    public showHint() {
        if (this._daThang) return;
        if (!this.hintOverlay) return;
        // Tránh bấm hint nhiều lần khi overlay đang hiện
        if (this.hintOverlay.active) return;

        if (this.hintImageSprite && this.puzzleImage) {
            this.hintImageSprite.spriteFrame = this.puzzleImage;
        }

        this.hintOverlay.active = true;
        this.scheduleOnce(() => {
            if (this.hintOverlay) {
                this.hintOverlay.active = false;
            }
        }, 2);
    }

    // ─── KHỞI TẠO LƯỚI ──────────────────────────────────────────────

    /** Đặt lưới về trạng thái giải xong chuẩn: 1…(N²-1), ô trống ở góc TRÊN-PHẢI */
    private _resetGrid() {
        const n = this.gridSize;
        this._grid = [];
        let num = 1;
        for (let r = 0; r < n; r++) {
            this._grid[r] = [];
            for (let c = 0; c < n; c++) {
                // Ô trống ở góc trên-phải (hàng 0, cột n-1)
                this._grid[r][c] = (r === 0 && c === n - 1) ? 0 : num++;
            }
        }
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
        const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

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

        const { row, col } = tile;
        const dr = Math.abs(row - this._emptyRow);
        const dc = Math.abs(col - this._emptyCol);
        const isAdjacent = (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
        if (!isAdjacent) return;

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

        this._moveCount++;
        this._updateMoveLabel();
        this._checkWin();
    }

    // ─── ĐIỀU KIỆN THẮNG ────────────────────────────────────────────

    /** Kiểm tra lưới hiện tại có phải trạng thái đã giải không (ô trống ở góc trên-phải) */
    private _isSolved(): boolean {
        const n = this.gridSize;
        let num = 1;
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
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
            // Hiển thị ảnh gốc hoàn chỉnh lên popup
            if (this.winImageSprite && this.puzzleImage) {
                this.winImageSprite.spriteFrame = this.puzzleImage;
            }
            if (this.winPopup) this.winPopup.active = true;
        }
    }

    // ─── TIỆN ÍCH VỊ TRÍ ────────────────────────────────────────────

    /**
     * Tính tọa độ local (pixel) từ vị trí lưới (row, col).
     * Node cha của các tile đặt ở trung tâm — lưới căn giữa theo boardSize.
     */
    private _calcPixelPos(row: number, col: number): Vec3 {
        // Điểm xuất phát: tâm ô ở góc trên-trái của lưới
        const startX = -this.boardSize / 2 + this.gap + this._tileSize / 2;
        const startY =  this.boardSize / 2 - this.gap - this._tileSize / 2;
        return new Vec3(
            startX + col * this._pitch,
            startY - row * this._pitch,
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

    /** Cập nhật text Label số bước */
    private _updateMoveLabel() {
        if (this.moveCountLabel) {
            this.moveCountLabel.string = `Steps: ${this._moveCount}`;
        }
    }

    // ─── CẮT ẢNH ────────────────────────────────────────────────────

    /**
     * Tính vị trí mảnh ảnh cho tileNumber, tạo SpriteFrame với rect tương ứng
     * và gán vào Sprite component của node tile.
     *
     * Quy tắc mapping (empty luôn ở góc trên-phải = vị trí (0, n-1)):
     *   - tileNumber 1..n-1   → hàng 0, cột 0..n-2  (trước ô trống)
     *   - tileNumber n..N²-1  → từ hàng 1 trở đi (bỏ qua index n-1 của ô trống)
     */
    private _applyImageToTile(node: Node, tileNumber: number) {
        if (!this.puzzleImage?.texture) return;

        const n = this.gridSize;
        const tex = this.puzzleImage.texture;
        const pw = tex.width / n;
        const ph = tex.height / n;

        let imgRow: number;
        let imgCol: number;

        if (tileNumber < n) {
            // Các tile ở hàng đầu, trước ô trống góc trên-phải
            imgRow = 0;
            imgCol = tileNumber - 1;
        } else {
            // Các tile từ hàng 1 trở đi (linearIndex = tileNumber, bỏ qua slot n-1)
            imgRow = Math.floor(tileNumber / n);
            imgCol = tileNumber % n;
        }

        const sf = new SpriteFrame();
        sf.texture = tex;
        // Rect gốc (0,0) ở góc trên-trái, Y tăng xuống dưới
        sf.rect = new Rect(imgCol * pw, imgRow * ph, pw, ph);

        const sprite = node.getComponent(Sprite);
        if (sprite) sprite.spriteFrame = sf;
    }
}
