import { _decorator, Component, Node, Vec3, tween, Tween, UIOpacity, AudioClip, AudioSource } from 'cc';
import { SceneTransition } from './SceneTransition';
import { SoundManager } from './SoundManager';
const { ccclass, property } = _decorator;

/**
 * MenuAnim.ts
 * Gắn vào node Canvas trong MenuScene.
 * Kéo thả các node vào Inspector theo tên property bên dưới.
 *
 * TIMELINE INTRO (~2.5 giây):
 *  0.0s — Block rơi từ trên + fade in
 *  0.7s — Title pop-in từ scale 0 + fade in
 *  1.3s — EasyButton trượt từ phải vào + fade in
 *  1.7s — MediumButton trượt từ trái vào + fade in
 *  2.1s — HardButton trượt từ phải vào + fade in
 *  Sau intro — Block float + Title pulse lặp vô hạn
 */
@ccclass('MenuAnim')
export class MenuAnim extends Component {

    @property(Node)
    public blockNode: Node = null!;

    @property(Node)
    public titleNode: Node = null!;

    @property(Node)
    public easyButton: Node = null!;

    @property(Node)
    public mediumButton: Node = null!;

    @property(Node)
    public hardButton: Node = null!;

    /** Nhạc nền phát loop trong màn menu */
    @property(AudioClip)
    public bgm: AudioClip = null!;

    /** SFX khi bấm nút chọn độ khó */
    @property(AudioClip)
    public sfxClick: AudioClip = null!;

    private _blockOriginY: number = 0;
    private _bgmSource: AudioSource = null!;
    private _sfxSource: AudioSource = null!;
    private _idleTweens: Tween<Node>[] = [];

    // Cờ ngăn bấm nút nhiều lần trong lúc outro đang chạy
    private _isOutroPlaying: boolean = false;

    start() {
        if (this.blockNode) {
            this._blockOriginY = this.blockNode.position.y;
        }
        this._hideAll();
        SceneTransition.fadeIn(this.node);
        this.scheduleOnce(() => this._playIntro(), 0.05);

        this._sfxSource = this.node.addComponent(AudioSource);
        if (this.bgm) {
            this._bgmSource = this.node.addComponent(AudioSource);
            SoundManager.playBgm(this._bgmSource, this.bgm);
        }
    }

    onDestroy() {
        this._idleTweens.forEach(t => t.stop());
        this._idleTweens = [];
    }

    // ─── TIỆN ÍCH ───────────────────────────────────────────────────────

    /** Lấy UIOpacity đã có hoặc thêm mới — dùng để fade in/out */
    private _opacity(node: Node): UIOpacity {
        return node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
    }

    /** Ẩn tất cả phần tử về trạng thái ban đầu trước khi intro */
    private _hideAll() {
        const nodes = [this.blockNode, this.titleNode, this.easyButton, this.mediumButton, this.hardButton];
        nodes.forEach(n => {
            if (!n) return;
            this._opacity(n).opacity = 0;
        });
        if (this.titleNode) {
            this.titleNode.setScale(new Vec3(0.3, 0.3, 1));
        }
    }

    // ─── INTRO ──────────────────────────────────────────────────────────

    private _playIntro() {
        this._animBlock();
        this._animTitle();
        this._animButtons();
    }

    /**
     * Block rơi từ trên xuống vị trí gốc với bounce.
     * Fade in song song để thấy rõ ngay khi block bắt đầu rơi.
     */
    private _animBlock() {
        if (!this.blockNode) return;
        const originY = this._blockOriginY;

        this.blockNode.setPosition(0, 1600, 0);

        tween(this._opacity(this.blockNode))
            .to(0.5, { opacity: 255 })
            .start();

        tween(this.blockNode)
            .to(1.0, { position: new Vec3(0, originY, 0) }, { easing: 'bounceOut' })
            .call(() => this._startBlockFloat())
            .start();
    }

    /**
     * Title pop-in: scale từ 0 lên vượt ngưỡng rồi về 1.
     * Fade in song song để tạo cảm giác xuất hiện mạnh.
     */
    private _animTitle() {
        if (!this.titleNode) return;

        tween(this._opacity(this.titleNode))
            .delay(0.7)
            .to(0.6, { opacity: 255 })
            .start();

        tween(this.titleNode)
            .delay(0.7)
            .to(0.55, { scale: new Vec3(1.15, 1.15, 1) }, { easing: 'backOut' })
            .to(0.2,  { scale: new Vec3(1.0,  1.0,  1) }, { easing: 'sineOut' })
            .call(() => this._startTitlePulse())
            .start();
    }

    /**
     * Ba nút trượt vào từ hai bên xen kẽ, mỗi nút cách nhau 0.4s.
     * Easy: từ phải | Medium: từ trái | Hard: từ phải
     */
    private _animButtons() {
        const entries: { node: Node; side: 1 | -1; delay: number }[] = [
            { node: this.easyButton,   side:  1, delay: 1.3 },
            { node: this.mediumButton, side: -1, delay: 1.7 },
            { node: this.hardButton,   side:  1, delay: 2.1 },
        ];
        const OFF_X = 1100;

        entries.forEach(({ node, side, delay }) => {
            if (!node) return;
            const origPos = node.position.clone();
            node.setPosition(side * OFF_X, origPos.y, origPos.z);

            tween(this._opacity(node))
                .delay(delay)
                .to(0.45, { opacity: 255 })
                .start();

            tween(node)
                .delay(delay)
                .to(0.55, { position: origPos }, { easing: 'backOut' })
                .start();
        });
    }

    // ─── IDLE LOOPS ─────────────────────────────────────────────────────

    /** Block lơ lửng lên xuống ±22px, chu kỳ 3s */
    private _startBlockFloat() {
        if (!this.blockNode) return;
        const y = this._blockOriginY;
        const t = tween(this.blockNode)
            .to(1.5, { position: new Vec3(0, y + 22, 0) }, { easing: 'sineInOut' })
            .to(1.5, { position: new Vec3(0, y - 22, 0) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
        this._idleTweens.push(t);
    }

    /** Title thở nhẹ scale 1.0 ↔ 1.06, chu kỳ 4s */
    private _startTitlePulse() {
        if (!this.titleNode) return;
        const t = tween(this.titleNode)
            .to(2.0, { scale: new Vec3(1.06, 1.06, 1) }, { easing: 'sineInOut' })
            .to(2.0, { scale: new Vec3(1.0,  1.0,  1) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
        this._idleTweens.push(t);
    }

    // ─── ĐIỀU HƯỚNG ─────────────────────────────────────────────────────

    /** Nút Easy — phát click rồi chuyển scene sau 0.1s */
    public goEasy() {
        this._playClick();
        this.scheduleOnce(() => SceneTransition.go('EasyScene', this.easyButton), 0.1);
    }

    /** Nút Medium — phát click rồi chuyển scene sau 0.1s */
    public goMedium() {
        this._playClick();
        this.scheduleOnce(() => SceneTransition.go('MediumScene', this.mediumButton), 0.1);
    }

    /** Nút Hard — phát click rồi chuyển scene sau 0.1s */
    public goHard() {
        this._playClick();
        this.scheduleOnce(() => SceneTransition.go('HardScene', this.hardButton), 0.1);
    }

    private _playClick() {
        SoundManager.playSfx(this._sfxSource, this.sfxClick);
    }

    // ─── OUTRO ──────────────────────────────────────────────────────────

    /**
     * Chạy animation thoát cho menu khi người dùng chọn mode chơi.
     * Được gọi bởi SceneTransition.go().
     *
     * Tất cả phần tử thoát ra ngoài màn hình (~0.35s),
     * sau đó gọi onComplete để SceneTransition tiếp tục fade to black.
     *
     * @param onComplete  Callback gọi sau khi outro xong
     */
    public playOutro(onComplete: () => void) {
        if (this._isOutroPlaying) return;
        this._isOutroPlaying = true;

        // Dừng nhạc nền khi chuyển sang scene chơi
        this._bgmSource?.stop();

        // Dừng idle loops để chúng không can thiệp vào outro
        this._idleTweens.forEach(t => t.stop());
        this._idleTweens = [];

        const DUR = 0.35; // thời gian outro

        // Block bay lên trên + fade out
        if (this.blockNode) {
            tween(this._opacity(this.blockNode))
                .to(DUR * 0.7, { opacity: 0 })
                .start();
            tween(this.blockNode)
                .to(DUR, { position: new Vec3(0, 1600, 0) }, { easing: 'backIn' })
                .start();
        }

        // Title thu nhỏ về 0 + fade out
        if (this.titleNode) {
            tween(this._opacity(this.titleNode))
                .to(DUR * 0.7, { opacity: 0 })
                .start();
            tween(this.titleNode)
                .to(DUR, { scale: new Vec3(0.1, 0.1, 1) }, { easing: 'backIn' })
                .start();
        }

        // Các nút bay ra ngoài theo chiều ngược lúc vào + fade out
        const buttons: { node: Node; side: 1 | -1 }[] = [
            { node: this.easyButton,   side:  1 },
            { node: this.mediumButton, side: -1 },
            { node: this.hardButton,   side:  1 },
        ];

        buttons.forEach(({ node, side }, i) => {
            if (!node) return;
            const curY = node.position.y;
            const curZ = node.position.z;
            const stagger = i * 0.04; // stagger nhỏ cho outro thêm sống động

            tween(this._opacity(node))
                .delay(stagger)
                .to(DUR * 0.6, { opacity: 0 })
                .start();
            tween(node)
                .delay(stagger)
                .to(DUR, { position: new Vec3(side * 1100, curY, curZ) }, { easing: 'backIn' })
                .start();
        });

        // Gọi callback sau khi tất cả animation outro kết thúc
        this.scheduleOnce(onComplete, DUR + 0.05);
    }
}
