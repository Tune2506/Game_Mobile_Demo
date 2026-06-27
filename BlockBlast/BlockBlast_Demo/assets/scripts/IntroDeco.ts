import {
    _decorator, Component, Node, Sprite,
    Prefab, instantiate, Vec3, tween, UITransform,
} from 'cc';
import { BLOCK_COLORS } from './BlockShapes';

const { ccclass, property } = _decorator;

// x, y: vị trí | rot: góc xoay (độ) | size: kích thước cạnh (px)
const DECO_CONFIGS: { x: number; y: number; rot: number; size: number }[] = [
    { x: -185, y:  570, rot: -15, size: 90 },  // trên trái — to
    { x:  150, y:  540, rot:  22, size: 68 },  // trên phải — nhỏ
    { x:  205, y:  175, rot:  16, size: 60 },  // phải trên — nhỏ nhất
    { x: -205, y: -230, rot: -20, size: 63 },  // trái dưới — nhỏ
    { x:  200, y: -300, rot:  18, size: 70 },  // phải dưới — vừa
    { x: -170, y: -510, rot: -26, size: 95 },  // góc dưới trái — to nhất
    { x:  158, y: -478, rot:  13, size: 70 },  // góc dưới phải — vừa
    { x:  -55, y:  590, rot:   9, size: 55 },  // trên giữa — nhỏ nhất
];

@ccclass('IntroDeco')
export class IntroDeco extends Component {

    @property(Prefab)
    blockPrefab: Prefab = null!;

    start(): void {
        this.spawnBlocks();
    }

    private spawnBlocks(): void {
        DECO_CONFIGS.forEach((cfg, i) => {
            const node = instantiate(this.blockPrefab);
            this.node.addChild(node);

            node.setPosition(cfg.x, cfg.y, 0);
            node.angle = cfg.rot;

            // Đặt kích thước riêng cho từng khối
            const ui = node.getComponent(UITransform);
            if (ui) {
                ui.width  = cfg.size;
                ui.height = cfg.size;
            }

            // Tô màu theo BLOCK_COLORS, luân phiên
            const sp = node.getComponent(Sprite);
            if (sp) sp.color = BLOCK_COLORS[i % BLOCK_COLORS.length];

            // Bob lên xuống, lệch pha
            this.playBobAnim(node, cfg.y, i * 0.28);
        });
    }

    private playBobAnim(node: Node, baseY: number, phaseDelay: number): void {
        const x = node.position.x;
        tween(node)
            .delay(phaseDelay)
            .to(1.3, { position: new Vec3(x, baseY + 14, 0) }, { easing: 'sineInOut' })
            .to(1.3, { position: new Vec3(x, baseY - 14, 0) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }
}
