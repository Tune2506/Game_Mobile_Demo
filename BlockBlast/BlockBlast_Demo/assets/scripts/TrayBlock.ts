import {
    _decorator, Component, Node, Prefab, instantiate,
    SpriteFrame, Sprite, Vec3, Color,
    EventTouch, tween, UIOpacity,
} from 'cc';
import { GameConfig }   from './GameConfig';
import { BlockShape }   from './BlockShapes';
import { GridManager }  from './GridManager';
import { AudioManager } from './AudioManager';

const { ccclass, property } = _decorator;

@ccclass('TrayBlock')
export class TrayBlock extends Component {

    @property(Prefab)
    cellPrefab: Prefab = null!;

    @property(SpriteFrame)
    blockFrame: SpriteFrame = null!;

    @property(GridManager)
    gridManager: GridManager = null!;

    private onPlacedCallback: ((block: TrayBlock, cells: number) => void) | null = null;

    setOnPlaced(cb: (block: TrayBlock, cells: number) => void): void {
        this.onPlacedCallback = cb;
    }

    private shape: BlockShape | null = null;
    private trayPos: Vec3 = new Vec3();
    private cellNodes: Node[] = [];
    private trayScale: number = 0.75;

    private isDragging: boolean = false;
    private dragOffset: Vec3 = new Vec3();
    private readonly LIFT_Y = 120;

    private ghostNode: Node | null = null;

    // ─── Gán khối ────────────────────────────────────────────────────

    setup(shape: BlockShape): void {
        this.node.active = true;
        this.shape       = shape;
        this.trayPos     = this.node.worldPosition.clone();
        this.buildVisual();
        this.buildGhost();
    }

    hide(): void {
        this.shape = null;
        this.clearVisual();
        this.hideGhost();
        this.node.setWorldPosition(this.trayPos);
        this.node.setScale(1, 1, 1);
        this.node.active = false;
    }

    refreshTrayPos(): void {
        this.trayPos = this.node.worldPosition.clone();
    }

    /** A3: Slide-in từ dưới lên khi khay mới spawn. */
    slideIn(delaySeconds: number = 0): void {
        const op = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
        op.opacity = 0;

        const finalPos = this.node.position.clone();
        this.node.setPosition(finalPos.x, finalPos.y - 100, finalPos.z);

        tween(this.node)
            .delay(delaySeconds)
            .to(GameConfig.TRAY_SLIDE_DURATION, { position: finalPos }, { easing: 'backOut' })
            .start();
        tween(op)
            .delay(delaySeconds)
            .to(GameConfig.TRAY_SLIDE_DURATION * 0.65, { opacity: 255 })
            .start();
    }

    // ─── Hình ở khay ─────────────────────────────────────────────────

    private buildVisual(): void {
        this.clearVisual();
        if (!this.shape) return;

        const { matrix, color } = this.shape;
        const cs   = GameConfig.CELL_SIZE;
        const rows = matrix.length;
        const cols = matrix[0].length;

        // Scale động: fit trong 195px mỗi chiều, không vượt 0.75
        const MAX_PX = 195;
        this.trayScale = Math.min(MAX_PX / (cols * cs), MAX_PX / (rows * cs), 0.75);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!matrix[r][c]) continue;
                const node = instantiate(this.cellPrefab);
                node.setPosition(
                    (c - (cols - 1) / 2) * cs,
                    ((rows - 1) / 2 - r) * cs,
                    0,
                );
                const sp = node.getComponent(Sprite)!;
                if (this.blockFrame) sp.spriteFrame = this.blockFrame;
                sp.color = color;
                this.node.addChild(node);
                this.cellNodes.push(node);
            }
        }
        this.node.setScale(this.trayScale, this.trayScale, 1);
    }

    private clearVisual(): void {
        for (const n of this.cellNodes) n.destroy();
        this.cellNodes = [];
    }

    // ─── Ghost block ──────────────────────────────────────────────────

    private buildGhost(): void {
        if (this.ghostNode) {
            this.ghostNode.destroy();
            this.ghostNode = null;
        }
        if (!this.shape || !this.cellPrefab) return;

        const { matrix, color } = this.shape;
        const cs   = GameConfig.CELL_SIZE;
        const rows = matrix.length;
        const cols = matrix[0].length;

        this.ghostNode = new Node('Ghost_' + this.node.name);
        this.gridManager.node.addChild(this.ghostNode);
        this.ghostNode.active = false;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!matrix[r][c]) continue;
                const cell = instantiate(this.cellPrefab);
                cell.setPosition(
                    (c - (cols - 1) / 2) * cs,
                    ((rows - 1) / 2 - r) * cs,
                    0,
                );
                const sp = cell.getComponent(Sprite)!;
                if (this.blockFrame) sp.spriteFrame = this.blockFrame;
                sp.color = new Color(color.r, color.g, color.b, 110);
                this.ghostNode.addChild(cell);
            }
        }
    }

    private showGhostAt(anchor: { row: number; col: number }): void {
        if (!this.ghostNode || !this.shape) return;

        const matrix = this.shape.matrix;
        const cs     = GameConfig.CELL_SIZE;
        const total  = GameConfig.GRID_SIZE * cs;

        const cell00X = -total / 2 + anchor.col * cs + cs / 2;
        const cell00Y =  total / 2 - anchor.row * cs - cs / 2;

        const cx = cell00X + (matrix[0].length - 1) / 2 * cs;
        const cy = cell00Y - (matrix.length    - 1) / 2 * cs;

        this.ghostNode.setPosition(cx, cy, 0);
        this.ghostNode.active = true;
    }

    private hideGhost(): void {
        if (this.ghostNode) this.ghostNode.active = false;
    }

    // ─── Touch ───────────────────────────────────────────────────────

    onLoad(): void {
        this.node.on(Node.EventType.TOUCH_START,  this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE,   this.onTouchMove,  this);
        this.node.on(Node.EventType.TOUCH_END,    this.onTouchEnd,   this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd,   this);
    }

    onDestroy(): void {
        this.node.off(Node.EventType.TOUCH_START,  this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE,   this.onTouchMove,  this);
        this.node.off(Node.EventType.TOUCH_END,    this.onTouchEnd,   this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd,   this);
        if (this.ghostNode) this.ghostNode.destroy();
    }

    private onTouchStart(e: EventTouch): void {
        if (!this.shape) return;
        AudioManager.instance?.playPickup();
        this.isDragging = true;
        this.node.setSiblingIndex(999);

        const loc     = e.getUILocation();
        const nodePos = this.node.worldPosition;

        // Offset: block nâng LIFT_Y px trên ngón tay để nhìn thấy rõ vị trí đặt
        this.dragOffset.set(
            nodePos.x - loc.x,
            nodePos.y - loc.y + this.LIFT_Y,
            0,
        );

        // Nhấc block lên ngay + animate scale mượt
        this.node.setWorldPosition(nodePos.x, nodePos.y + this.LIFT_Y, 0);
        tween(this.node).stop();
        tween(this.node)
            .to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    private onTouchMove(e: EventTouch): void {
        if (!this.isDragging || !this.shape) return;

        const loc   = e.getUILocation();
        const world = new Vec3(loc.x + this.dragOffset.x, loc.y + this.dragOffset.y, 0);
        this.node.setWorldPosition(world);

        const anchor = this.getAnchorCell(world);
        this.gridManager.clearAllHighlight();

        if (anchor && this.gridManager.canPlace(this.shape.matrix, anchor.row, anchor.col)) {
            this.gridManager.highlightCells(this.shape.matrix, anchor.row, anchor.col, this.shape.color);
            this.showGhostAt(anchor);

            // F5: highlight các line sẽ bị clear nếu đặt tại đây
            const { rows, cols } = this.gridManager.getLinesToClear(this.shape.matrix, anchor.row, anchor.col);
            if (rows.length > 0 || cols.length > 0) {
                this.gridManager.highlightClearPreview(rows, cols);
            }
        } else {
            this.hideGhost();
        }
    }

    private onTouchEnd(e: EventTouch): void {
        if (!this.isDragging || !this.shape) return;
        this.isDragging = false;
        this.gridManager.clearAllHighlight();
        this.hideGhost();

        const loc   = e.getUILocation();
        const world = new Vec3(loc.x + this.dragOffset.x, loc.y + this.dragOffset.y, 0);

        const anchor = this.getAnchorCell(world);
        if (anchor && this.gridManager.canPlace(this.shape.matrix, anchor.row, anchor.col)) {
            this.gridManager.place(this.shape.matrix, anchor.row, anchor.col, this.shape.color);
            const cells = this.gridManager.countCells(this.shape.matrix);
            this.onPlacedCallback?.(this, cells);
        } else {
            this.tweenBack();
        }
    }

    // ─── Helper ──────────────────────────────────────────────────────

    private getAnchorCell(worldCenter: Vec3): { row: number; col: number } | null {
        if (!this.shape) return null;
        const cs = GameConfig.CELL_SIZE;
        const cellWorld = new Vec3(
            worldCenter.x - (this.shape.matrix[0].length - 1) / 2 * cs,
            worldCenter.y + (this.shape.matrix.length    - 1) / 2 * cs,
            0,
        );
        return this.gridManager.worldToCell(cellWorld);
    }

    private tweenBack(): void {
        const s = this.trayScale;
        tween(this.node).stop();
        tween(this.node)
            .to(GameConfig.SNAP_DURATION, { worldPosition: this.trayPos.clone() }, { easing: 'backOut' })
            .call(() => { this.node.setScale(s, s, 1); })
            .start();
    }
}
