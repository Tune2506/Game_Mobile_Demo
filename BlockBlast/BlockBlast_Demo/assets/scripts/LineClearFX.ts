import {
    _decorator, Component, Node, Prefab, instantiate,
    ParticleSystem2D, SpriteFrame, Color, Vec3, tween,
    Sprite, UIOpacity,
} from 'cc';

const { ccclass, property } = _decorator;

@ccclass('LineClearFX')
export class LineClearFX extends Component {

    @property(Prefab)
    particlePrefab: Prefab = null!;   // Prefab chứa ParticleSystem2D (texture: particle_dot)

    @property(Prefab)
    flashPrefab: Prefab = null!;      // Prefab Sprite trắng nhỏ để flash ô

    private pool:      Node[] = [];
    private flashPool: Node[] = [];

    // ─── API công khai ────────────────────────────────────────────────

    /**
     * Phát hiệu ứng tại worldPos với màu của ô vừa bị xóa.
     * Gọi sau mỗi ô thuộc line bị clear.
     */
    playAt(worldPos: Vec3, color: Color): void {
        this.spawnParticle(worldPos, color);
        this.spawnFlash(worldPos, color);
    }

    // ─── Particle ─────────────────────────────────────────────────────

    private spawnParticle(worldPos: Vec3, color: Color): void {
        if (!this.particlePrefab) return;

        let node: Node;
        if (this.pool.length > 0) {
            node = this.pool.pop()!;
            node.active = true;
        } else {
            node = instantiate(this.particlePrefab);
        }

        this.node.addChild(node);
        node.setWorldPosition(worldPos);

        const ps = node.getComponent(ParticleSystem2D);
        if (ps) {
            // Tint particle theo màu ô
            ps.startColor     = color;
            ps.startColorVar  = new Color(30, 30, 30, 0);
            ps.endColor       = new Color(color.r, color.g, color.b, 0);
            ps.resetSystem();
        }

        // Thu hồi về pool sau 1.2 giây
        this.scheduleOnce(() => {
            if (ps) ps.stopSystem();
            node.active = false;
            this.pool.push(node);
        }, 1.2);
    }

    // ─── Flash ───────────────────────────────────────────────────────

    private spawnFlash(worldPos: Vec3, color: Color): void {
        if (!this.flashPrefab) return;

        let node: Node;
        if (this.flashPool.length > 0) {
            node = this.flashPool.pop()!;
            node.active = true;
        } else {
            node = instantiate(this.flashPrefab);
        }

        this.node.addChild(node);
        node.setWorldPosition(worldPos);

        // Lighten màu ô ~+80 mỗi channel để flash có màu sát thực hơn trắng tinh
        const sp = node.getComponent(Sprite);
        if (sp) sp.color = new Color(
            Math.min(255, color.r + 80),
            Math.min(255, color.g + 80),
            Math.min(255, color.b + 80),
            220,
        );

        const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
        opacity.opacity = 220;

        tween(opacity).stop();
        tween(opacity)
            .to(0.25, { opacity: 0 }, { easing: 'quadOut' })
            .call(() => {
                node.active = false;
                this.flashPool.push(node);
            })
            .start();
    }
}
