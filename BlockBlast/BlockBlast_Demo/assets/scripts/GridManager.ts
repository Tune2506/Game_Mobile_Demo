import { _decorator, Component, Node, Prefab, instantiate, UITransform, Vec3, Color } from 'cc';
import { GameConfig } from './GameConfig';
import { Cell } from './Cell';
import { BlockShape, BLOCK_COLORS } from './BlockShapes';
import { LineClearFX } from './LineClearFX';

const { ccclass, property } = _decorator;

@ccclass('GridManager')
export class GridManager extends Component {

    @property(Prefab)
    cellPrefab: Prefab = null!;

    @property(LineClearFX)
    lineClearFX: LineClearFX = null!;

    private cells: Cell[][] = [];

    // F5: track rows/cols đang được clear-preview
    private previewRows: number[] = [];
    private previewCols: number[] = [];

    // ─── Khởi tạo ──────────────────────────────────────────────────

    onLoad(): void {
        this.buildGrid();
    }

    private buildGrid(): void {
        const size = GameConfig.GRID_SIZE;
        const cs   = GameConfig.CELL_SIZE;

        for (let r = 0; r < size; r++) {
            this.cells[r] = [];
            for (let c = 0; c < size; c++) {
                const node  = instantiate(this.cellPrefab);
                const total = size * cs;
                const x = -total / 2 + c * cs + cs / 2;
                const y =  total / 2 - r * cs - cs / 2;
                node.setPosition(x, y, 0);
                node.setScale(GameConfig.CELL_SCALE, GameConfig.CELL_SCALE, 1);
                this.node.addChild(node);

                const cell = node.getComponent(Cell)!;
                cell.clear();
                this.cells[r][c] = cell;
            }
        }
    }

    // ─── Tiện ích vị trí ────────────────────────────────────────────

    worldToCell(worldPos: Vec3): { row: number; col: number } | null {
        const local = this.node.getComponent(UITransform)!
            .convertToNodeSpaceAR(worldPos);
        const size  = GameConfig.GRID_SIZE;
        const cs    = GameConfig.CELL_SIZE;
        const total = size * cs;

        const col = Math.floor((local.x + total / 2) / cs);
        const row = Math.floor((-local.y + total / 2) / cs);

        if (row < 0 || row >= size || col < 0 || col >= size) return null;
        return { row, col };
    }

    cellToWorld(row: number, col: number): Vec3 {
        const cs    = GameConfig.CELL_SIZE;
        const size  = GameConfig.GRID_SIZE;
        const total = size * cs;
        const lx    = -total / 2 + col * cs + cs / 2;
        const ly    =  total / 2 - row * cs - cs / 2;

        const world = new Vec3();
        this.node.getComponent(UITransform)!
            .convertToWorldSpaceAR(new Vec3(lx, ly, 0), world);
        return world;
    }

    // ─── Logic đặt khối ─────────────────────────────────────────────

    canPlace(matrix: number[][], anchorRow: number, anchorCol: number): boolean {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (!matrix[r][c]) continue;
                const gr = anchorRow + r;
                const gc = anchorCol + c;
                if (gr < 0 || gr >= GameConfig.GRID_SIZE) return false;
                if (gc < 0 || gc >= GameConfig.GRID_SIZE) return false;
                if (this.cells[gr][gc].filled) return false;
            }
        }
        return true;
    }

    /** A1: Đặt khối + pop-in stagger từng ô. */
    place(matrix: number[][], anchorRow: number, anchorCol: number, color: Color): void {
        let delay = 0;
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (!matrix[r][c]) continue;
                const cell = this.cells[anchorRow + r][anchorCol + c];
                cell.setFilled(color);
                cell.popIn(delay);
                delay += GameConfig.CELL_POP_STAGGER;
            }
        }
    }

    countCells(matrix: number[][]): number {
        return matrix.reduce((s, row) => s + row.reduce((a, v) => a + v, 0), 0);
    }

    // ─── F5: Preview line sẽ bị clear ───────────────────────────────

    /**
     * Tính rows/cols sẽ bị clear nếu đặt shape tại anchor.
     * Không thay đổi trạng thái lưới.
     */
    getLinesToClear(matrix: number[][], anchorRow: number, anchorCol: number): { rows: number[]; cols: number[] } {
        const size = GameConfig.GRID_SIZE;
        const rows: number[] = [];
        const cols: number[] = [];

        const placing = new Set<string>();
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c]) placing.add(`${anchorRow + r},${anchorCol + c}`);
            }
        }

        for (let r = 0; r < size; r++) {
            let full = true;
            for (let c = 0; c < size; c++) {
                if (!this.cells[r][c].filled && !placing.has(`${r},${c}`)) { full = false; break; }
            }
            if (full) rows.push(r);
        }
        for (let c = 0; c < size; c++) {
            let full = true;
            for (let r = 0; r < size; r++) {
                if (!this.cells[r][c].filled && !placing.has(`${r},${c}`)) { full = false; break; }
            }
            if (full) cols.push(c);
        }

        return { rows, cols };
    }

    /** F5: Làm sáng các ô filled thuộc hàng/cột sắp bị clear. */
    highlightClearPreview(rows: number[], cols: number[]): void {
        this.previewRows = rows;
        this.previewCols = cols;
        const size = GameConfig.GRID_SIZE;

        for (const r of rows) {
            for (let c = 0; c < size; c++) {
                if (this.cells[r][c].filled) this.cells[r][c].setClearPreview();
            }
        }
        for (const col of cols) {
            for (let r = 0; r < size; r++) {
                if (!rows.includes(r) && this.cells[r][col].filled) {
                    this.cells[r][col].setClearPreview();
                }
            }
        }
    }

    // ─── Xóa hàng / cột ─────────────────────────────────────────────

    checkAndClearLines(): { count: number; rows: number[]; cols: number[] } {
        const size = GameConfig.GRID_SIZE;
        const rowsToClear: number[] = [];
        const colsToClear: number[] = [];

        for (let r = 0; r < size; r++) {
            if (this.cells[r].every(cell => cell.filled)) rowsToClear.push(r);
        }
        for (let c = 0; c < size; c++) {
            if (this.cells.every(row => row[c].filled)) colsToClear.push(c);
        }

        if (rowsToClear.length === 0 && colsToClear.length === 0)
            return { count: 0, rows: [], cols: [] };

        const clearedSet = new Set<string>();

        // Rows: wave trái→phải
        for (const r of rowsToClear) {
            for (let c = 0; c < size; c++) {
                clearedSet.add(`${r},${c}`);
                const cell = this.cells[r][c];
                const color = cell.cellColor.clone();
                cell.filled = false;
                cell.clearLineAnim(c * GameConfig.LINE_WAVE_STAGGER);
                this.lineClearFX?.playAt(this.cellToWorld(r, c), color);
            }
        }

        // Cols: wave trên→dưới
        for (const col of colsToClear) {
            for (let r = 0; r < size; r++) {
                if (!clearedSet.has(`${r},${col}`)) {
                    clearedSet.add(`${r},${col}`);
                    const cell = this.cells[r][col];
                    const color = cell.cellColor.clone();
                    cell.filled = false;
                    cell.clearLineAnim(r * GameConfig.LINE_WAVE_STAGGER);
                    this.lineClearFX?.playAt(this.cellToWorld(r, col), color);
                }
            }
        }

        return { count: rowsToClear.length + colsToClear.length, rows: rowsToClear, cols: colsToClear };
    }

    // ─── Tiện ích trạng thái ─────────────────────────────────────────

    /** Combo ≥ 2: đổi màu ngẫu nhiên tất cả ô filled đang có trên bàn. */
    playComboRipple(): void {
        for (let r = 0; r < GameConfig.GRID_SIZE; r++) {
            for (let c = 0; c < GameConfig.GRID_SIZE; c++) {
                const cell = this.cells[r][c];
                if (!cell.filled) continue;
                const delay = Math.random() * 0.5;
                const color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
                cell.changeColor(color, delay);
            }
        }
    }

    canPlaceAnywhere(matrix: number[][]): boolean {
        for (let r = 0; r < GameConfig.GRID_SIZE; r++) {
            for (let c = 0; c < GameConfig.GRID_SIZE; c++) {
                if (this.canPlace(matrix, r, c)) return true;
            }
        }
        return false;
    }

    /** Trả về true nếu đặt shape ở bất kỳ vị trí hợp lệ nào đều xóa được ít nhất 1 hàng/cột. */
    canClearLineAnywhere(matrix: number[][]): boolean {
        for (let r = 0; r < GameConfig.GRID_SIZE; r++) {
            for (let c = 0; c < GameConfig.GRID_SIZE; c++) {
                if (!this.canPlace(matrix, r, c)) continue;
                const { rows, cols } = this.getLinesToClear(matrix, r, c);
                if (rows.length > 0 || cols.length > 0) return true;
            }
        }
        return false;
    }

    isBoardEmpty(): boolean {
        return this.cells.every(row => row.every(cell => !cell.filled));
    }

    public resetGrid(): void {
        this.cells.forEach(row => row.forEach(cell => cell.clear()));
    }

    isGameOver(trayShapes: (BlockShape | null)[]): boolean {
        const size = GameConfig.GRID_SIZE;
        for (const shape of trayShapes) {
            if (!shape) continue;
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (this.canPlace(shape.matrix, r, c)) return false;
                }
            }
        }
        return true;
    }

    /** A5: Lấy toàn bộ ô đang filled để animate board collapse. */
    getAllFilledCells(): { row: number; col: number; cell: Cell }[] {
        const result: { row: number; col: number; cell: Cell }[] = [];
        for (let r = 0; r < GameConfig.GRID_SIZE; r++) {
            for (let c = 0; c < GameConfig.GRID_SIZE; c++) {
                if (this.cells[r][c].filled) result.push({ row: r, col: c, cell: this.cells[r][c] });
            }
        }
        return result;
    }

    // ─── Highlight hỗ trợ kéo thả ───────────────────────────────────

    highlightCells(matrix: number[][], anchorRow: number, anchorCol: number, color: Color): void {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (!matrix[r][c]) continue;
                const gr = anchorRow + r;
                const gc = anchorCol + c;
                if (gr < 0 || gr >= GameConfig.GRID_SIZE) continue;
                if (gc < 0 || gc >= GameConfig.GRID_SIZE) continue;
                this.cells[gr][gc].setHighlight(color);
            }
        }
    }

    /** Bỏ toàn bộ highlight và clear preview state. */
    clearAllHighlight(): void {
        this.previewRows = [];
        this.previewCols = [];
        this.cells.forEach(row => row.forEach(cell => cell.clearHighlight()));
    }
}
