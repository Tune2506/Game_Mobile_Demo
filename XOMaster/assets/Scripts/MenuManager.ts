import { _decorator, Component, Node, director, tween, Vec3, Tween, EventTouch, UIOpacity, AudioSource, AudioClip } from 'cc';
import { GameConfig } from './GameConfig';
import { MenuBgAudio } from './MenuBgAudio';
const { ccclass, property } = _decorator;

@ccclass('MenuManager')
export class MenuManager extends Component {

    // 3 card theo thứ tự: [0]=3x3, [1]=6x6, [2]=9x9
    @property([Node])
    cards: Node[] = [];

    // Node full-width bắt sự kiện vuốt carousel
    @property(Node)
    carouselContainer: Node = null!;

    @property(Node)
    pvpBtn: Node = null!;

    @property(Node)
    pveBtn: Node = null!;

    @property(Node)
    backBtn: Node = null!;

    @property(Node)
    titleLabel: Node = null!;

    @property(Node)
    settingBtn: Node = null!;

    @property(Node)
    leftArrow: Node = null!;

    @property(Node)
    rightArrow: Node = null!;

    @property(AudioSource)
    audioSource: AudioSource = null!;

    @property(AudioClip)
    clickSfx: AudioClip = null!;

    private currentIndex: number = 0;
    private readonly cardSpacing: number = 380;
    private readonly BOARD_SIZES: readonly (3 | 6 | 9 | 11)[] = [3, 6, 9, 11];
    private readonly WIN_COUNTS: readonly number[] = [3, 4, 5, 6];
    private touchStartX: number = 0;
    private isDragging: boolean = false;

    start() {
        this.updateCardPositions(false);
        this.updateArrowVisibility();
        this.setupCarouselTouch();

        this.pvpBtn.on(Node.EventType.TOUCH_END, () => { this.playSfx(); this.onModeSelected('pvp'); }, this);
        this.pveBtn.on(Node.EventType.TOUCH_END, () => { this.playSfx(); this.onModeSelected('pve'); }, this);
        this.backBtn.on(Node.EventType.TOUCH_END, () => { this.playSfx(); director.loadScene('IntroScene'); }, this);
        this.leftArrow.on(Node.EventType.TOUCH_END, () => this.navigate(-1), this);
        this.rightArrow.on(Node.EventType.TOUCH_END, () => this.navigate(1), this);

        this.playMenuOpenAnim();
    }

    private navigate(direction: number) {
        const newIndex = this.currentIndex + direction;
        if (newIndex < 0 || newIndex >= this.cards.length) return;
        this.playSfx();
        this.currentIndex = newIndex;
        this.updateCardPositions(true);
        this.updateArrowVisibility();
    }

    private playSfx() {
        if (!GameConfig.soundOn || !this.clickSfx || !this.audioSource) return;
        this.audioSource.playOneShot(this.clickSfx);
    }

    private updateArrowVisibility() {
        this.leftArrow.active = this.currentIndex > 0;
        this.rightArrow.active = this.currentIndex < this.cards.length - 1;
    }

    private setupCarouselTouch() {
        this.carouselContainer.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
            this.touchStartX = e.getUILocation().x;
            this.isDragging = true;
        }, this);

        this.carouselContainer.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
            if (!this.isDragging) return;
            const dragDelta = e.getUILocation().x - this.touchStartX;
            this.cards.forEach((card, i) => {
                const baseX = (i - this.currentIndex) * this.cardSpacing;
                card.setPosition(baseX + dragDelta, card.position.y, 0);
            });
        }, this);

        this.carouselContainer.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            const dragDelta = e.getUILocation().x - this.touchStartX;
            if (dragDelta < -60 && this.currentIndex < this.cards.length - 1) {
                this.currentIndex++;
            } else if (dragDelta > 60 && this.currentIndex > 0) {
                this.currentIndex--;
            }
            this.updateCardPositions(true);
            this.updateArrowVisibility();
        }, this);

        this.carouselContainer.on(Node.EventType.TOUCH_CANCEL, () => {
            this.isDragging = false;
            this.updateCardPositions(true);
            this.updateArrowVisibility();
        }, this);
    }

    private updateCardPositions(animate: boolean) {
        this.cards.forEach((card, i) => {
            const targetX = (i - this.currentIndex) * this.cardSpacing;
            const targetScale = i === this.currentIndex ? 1.0 : 0.85;
            Tween.stopAllByTarget(card);
            if (animate) {
                tween(card)
                    .to(0.3, {
                        position: new Vec3(targetX, card.position.y, 0),
                        scale: new Vec3(targetScale, targetScale, 1),
                    }, { easing: 'cubicOut' })
                    .start();
            } else {
                card.setPosition(targetX, card.position.y, 0);
                card.setScale(targetScale, targetScale, 1);
            }
        });
    }

    private onModeSelected(mode: 'pvp' | 'pve') {
        GameConfig.mode = mode;
        GameConfig.boardSize = this.BOARD_SIZES[this.currentIndex] as 3 | 6 | 9 | 11;
        GameConfig.winCount = this.WIN_COUNTS[this.currentIndex];
        MenuBgAudio.cleanup();
        director.loadScene('GameScene');
    }

    private playMenuOpenAnim() {
        // TitleLabel: slide từ trên xuống + fade vào
        const tlX = this.titleLabel.position.x;
        const tlY = this.titleLabel.position.y;
        let tlOp = this.titleLabel.getComponent(UIOpacity);
        if (!tlOp) tlOp = this.titleLabel.addComponent(UIOpacity);
        tlOp.opacity = 0;
        this.titleLabel.setPosition(tlX, tlY + 60, 0);
        tween(this.titleLabel)
            .to(0.45, { position: new Vec3(tlX, tlY, 0) }, { easing: 'cubicOut' })
            .start();
        tween(tlOp).to(0.4, { opacity: 255 }).start();

        // SettingBtn + BackBtn: slide nhẹ từ trên + fade vào
        [this.settingBtn, this.backBtn].forEach(btn => {
            const bx = btn.position.x;
            const by = btn.position.y;
            let op = btn.getComponent(UIOpacity);
            if (!op) op = btn.addComponent(UIOpacity);
            op.opacity = 0;
            btn.setPosition(bx, by + 40, 0);
            tween(btn)
                .delay(0.1)
                .to(0.35, { position: new Vec3(bx, by, 0) }, { easing: 'cubicOut' })
                .start();
            tween(op).delay(0.1).to(0.3, { opacity: 255 }).start();
        });

        // Cards: scale từ nhỏ + fade vào theo thứ tự
        this.cards.forEach((card, i) => {
            const targetScale = i === this.currentIndex ? 1.0 : 0.85;
            card.setScale(0.6, 0.6, 1);
            let op = card.getComponent(UIOpacity);
            if (!op) op = card.addComponent(UIOpacity);
            op.opacity = 0;
            tween(card)
                .delay(0.15 + i * 0.1)
                .to(0.4, { scale: new Vec3(targetScale, targetScale, 1) }, { easing: 'backOut' })
                .start();
            tween(op)
                .delay(0.15 + i * 0.1)
                .to(0.35, { opacity: 255 })
                .start();
        });

        // PveBtn + PvpBtn: slide từ dưới lên + fade vào
        [this.pveBtn, this.pvpBtn].forEach((btn, i) => {
            const bx = btn.position.x;
            const by = btn.position.y;
            let op = btn.getComponent(UIOpacity);
            if (!op) op = btn.addComponent(UIOpacity);
            op.opacity = 0;
            btn.setPosition(bx, by - 60, 0);
            tween(btn)
                .delay(0.35 + i * 0.1)
                .to(0.4, { position: new Vec3(bx, by, 0) }, { easing: 'backOut' })
                .start();
            tween(op)
                .delay(0.35 + i * 0.1)
                .to(0.35, { opacity: 255 })
                .start();
        });
    }
}
