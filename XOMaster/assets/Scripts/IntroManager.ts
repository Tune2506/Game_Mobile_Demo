import { _decorator, Component, Node, director, tween, Vec3, Tween, UIOpacity, AudioSource, AudioClip } from 'cc';
import { GameConfig } from './GameConfig';
const { ccclass, property } = _decorator;

@ccclass('IntroManager')
export class IntroManager extends Component {

    @property(Node)
    tapArea: Node = null!;

    @property(Node)
    titleNode: Node = null!;

    // Node đen full-screen, opacity ban đầu = 0, dùng để fade ra khi chuyển scene
    @property(Node)
    fadeOverlay: Node = null!;

    @property(Node)
    settingBtn: Node = null!;

    @property(AudioSource)
    audioSource: AudioSource = null!;

    @property(AudioClip)
    clickSfx: AudioClip = null!;

    start() {
        // Title: scale + fade vào
        this.titleNode.setScale(0.5, 0.5, 1);
        let titleOp = this.titleNode.getComponent(UIOpacity);
        if (!titleOp) titleOp = this.titleNode.addComponent(UIOpacity);
        titleOp.opacity = 0;
        tween(this.titleNode)
            .to(0.6, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
        tween(titleOp)
            .to(0.5, { opacity: 255 })
            .start();

        // SettingBtn: slide từ trên xuống + fade vào
        const sbX = this.settingBtn.position.x;
        const sbY = this.settingBtn.position.y;
        let sbOp = this.settingBtn.getComponent(UIOpacity);
        if (!sbOp) sbOp = this.settingBtn.addComponent(UIOpacity);
        sbOp.opacity = 0;
        this.settingBtn.setPosition(sbX, sbY + 60, 0);
        tween(this.settingBtn)
            .delay(0.3)
            .to(0.4, { position: new Vec3(sbX, sbY, 0) }, { easing: 'cubicOut' })
            .start();
        tween(sbOp).delay(0.3).to(0.35, { opacity: 255 }).start();

        // PlayBtn: pulse lặp vô hạn sau khi title xuất hiện xong — mời người chơi chạm
        this.scheduleOnce(() => {
            tween(this.tapArea)
                .to(0.9, { scale: new Vec3(1.07, 1.07, 1) }, { easing: 'sineInOut' })
                .to(0.9, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineInOut' })
                .union()
                .repeatForever()
                .start();
        }, 0.8);

        // Overlay bắt đầu trong suốt
        let overlayOp = this.fadeOverlay.getComponent(UIOpacity);
        if (!overlayOp) overlayOp = this.fadeOverlay.addComponent(UIOpacity);
        overlayOp.opacity = 0;

        this.tapArea.on(Node.EventType.TOUCH_END, this.onTap, this);
    }

    private onTap() {
        // Ngăn double-tap
        this.tapArea.off(Node.EventType.TOUCH_END, this.onTap, this);
        Tween.stopAllByTarget(this.tapArea);
        this.playSfx();

        const overlayOp = this.fadeOverlay.getComponent(UIOpacity)!;
        tween(overlayOp)
            .to(0.4, { opacity: 255 })
            .call(() => director.loadScene('MenuScene'))
            .start();
    }

    private playSfx() {
        if (!GameConfig.soundOn || !this.clickSfx || !this.audioSource) return;
        this.audioSource.playOneShot(this.clickSfx);
    }
}
