import { _decorator, Component, Node, Sprite, Color, tween, Vec3, AudioSource, AudioClip } from 'cc';
import { GameConfig } from './GameConfig';
import { MenuBgAudio } from './MenuBgAudio';
const { ccclass, property } = _decorator;

@ccclass('SettingManager')
export class SettingManager extends Component {

    @property(Node)
    settingBtn: Node = null!;

    @property(Node)
    settingPanel: Node = null!;

    @property(Sprite)
    musicToggleTrack: Sprite = null!;

    @property(Node)
    musicToggleKnob: Node = null!;

    @property(Sprite)
    soundToggleTrack: Sprite = null!;

    @property(Node)
    soundToggleKnob: Node = null!;

    // Chỉ dùng để phát clickSfx — nhạc nền do MenuBgAudio quản lý
    @property(AudioSource)
    bgAudio: AudioSource = null!;

    @property(AudioClip)
    clickSfx: AudioClip = null!;

    // Vị trí X của knob khi BẬT — chỉnh trong Inspector cho khớp UI
    @property
    knobOnX: number = 140;

    // Vị trí X của knob khi TẮT — chỉnh trong Inspector cho khớp UI
    @property
    knobOffX: number = 99;

    start() {
        this.settingPanel.active = false;
        this.syncVisuals(false);

        this.settingBtn.on(Node.EventType.TOUCH_END, this.onOpen, this);
        this.settingPanel.getChildByName('CloseBtn')
            ?.on(Node.EventType.TOUCH_END, this.onClose, this);
        this.musicToggleTrack.node.on(Node.EventType.TOUCH_END, this.onMusicToggle, this);
        this.soundToggleTrack.node.on(Node.EventType.TOUCH_END, this.onSoundToggle, this);
    }

    private onOpen() {
        this.playSfx();
        this.syncVisuals(false);
        this.settingPanel.setScale(0, 0, 1);
        this.settingPanel.active = true;
        tween(this.settingPanel)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    private onClose() {
        this.playSfx();
        tween(this.settingPanel)
            .to(0.2, { scale: new Vec3(0, 0, 1) }, { easing: 'cubicIn' })
            .call(() => { this.settingPanel.active = false; })
            .start();
    }

    private onMusicToggle() {
        GameConfig.musicOn = !GameConfig.musicOn;
        this.playSfx();
        this.applyToggleVisual(this.musicToggleKnob, this.musicToggleTrack, GameConfig.musicOn);
        if (GameConfig.musicOn) MenuBgAudio.instance?.resumeMusic();
        else MenuBgAudio.instance?.stopMusic();
    }

    private onSoundToggle() {
        GameConfig.soundOn = !GameConfig.soundOn;
        this.playSfx();
        this.applyToggleVisual(this.soundToggleKnob, this.soundToggleTrack, GameConfig.soundOn);
    }

    private syncVisuals(animate: boolean) {
        this.applyToggleVisual(this.musicToggleKnob, this.musicToggleTrack, GameConfig.musicOn, animate);
        this.applyToggleVisual(this.soundToggleKnob, this.soundToggleTrack, GameConfig.soundOn, animate);
    }

    private applyToggleVisual(knob: Node, track: Sprite, isOn: boolean, animate: boolean = true) {
        const targetX = isOn ? this.knobOnX : this.knobOffX;
        track.color = isOn ? new Color(255, 255, 255, 255) : new Color(180, 180, 180, 255);
        if (animate) {
            tween(knob)
                .to(0.2, { position: new Vec3(targetX, knob.position.y, knob.position.z) }, { easing: 'cubicOut' })
                .start();
        } else {
            knob.setPosition(targetX, knob.position.y, knob.position.z);
        }
    }

    private playSfx() {
        if (!GameConfig.soundOn || !this.clickSfx || !this.bgAudio) return;
        this.bgAudio.playOneShot(this.clickSfx);
    }
}
