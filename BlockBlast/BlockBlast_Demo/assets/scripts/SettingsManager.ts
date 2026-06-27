import {
    _decorator, Component, Node, Button,
    director, tween, Vec3,
} from 'cc';
import { ToggleSwitch } from './ToggleSwitch';
import { AudioManager }  from './AudioManager';

const { ccclass, property } = _decorator;

@ccclass('SettingsManager')
export class SettingsManager extends Component {

    @property(Button)
    settingsButton: Button = null!;

    @property(Node)
    settingsPanel: Node = null!;

    @property(Button)
    closeButton: Button = null!;

    @property(Button)
    backButton: Button = null!;

    @property(Button)
    replayButton: Button = null!;

    @property(ToggleSwitch)
    soundToggle: ToggleSwitch = null!;

    @property(ToggleSwitch)
    bgmToggle: ToggleSwitch = null!;

    // ─── Vòng đời ─────────────────────────────────────────────────────

    onLoad(): void {
        this.settingsButton?.node?.on(Button.EventType.CLICK, this.openPanel,   this);
        this.closeButton?.node?.on   (Button.EventType.CLICK, this.closePanel,  this);
        this.backButton?.node?.on    (Button.EventType.CLICK, this.goToIntro,   this);
        this.replayButton?.node?.on  (Button.EventType.CLICK, this.replayGame,  this);

        this.settingsPanel.active = false;
        this.settingsPanel.setScale(0, 0, 1);
    }

    start(): void {
        const am = AudioManager.instance;
        this.soundToggle?.setValue(am?.sfxOn ?? true);
        this.bgmToggle?.setValue(am?.bgmOn ?? true);
        this.soundToggle?.setOnChange(v => AudioManager.instance?.setSfx(v));
        this.bgmToggle?.setOnChange(v => AudioManager.instance?.setBgm(v));
    }

    onDestroy(): void {
        this.settingsButton?.node?.off(Button.EventType.CLICK, this.openPanel,   this);
        this.closeButton?.node?.off   (Button.EventType.CLICK, this.closePanel,  this);
        this.backButton?.node?.off    (Button.EventType.CLICK, this.goToIntro,   this);
        this.replayButton?.node?.off  (Button.EventType.CLICK, this.replayGame,  this);
    }

    // ─── Mở popup ─────────────────────────────────────────────────────

    private openPanel(): void {
        AudioManager.instance?.playClick();
        this.settingsPanel.setScale(0, 0, 1);
        this.settingsPanel.active = true;

        tween(this.settingsPanel)
            .to(0.30, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    // ─── Đóng popup ───────────────────────────────────────────────────

    private closePanel(): void {
        AudioManager.instance?.playClick();
        tween(this.settingsPanel)
            .to(0.20, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
            .call(() => { this.settingsPanel.active = false; })
            .start();
    }

    // ─── Replay (restart scene hiện tại) ─────────────────────────────

    private replayGame(): void {
        AudioManager.instance?.playClick();
        tween(this.settingsPanel)
            .to(0.15, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
            .call(() => director.loadScene('GameScene'))
            .start();
    }

    // ─── Về IntroScene ────────────────────────────────────────────────

    private goToIntro(): void {
        AudioManager.instance?.playClick();
        AudioManager.instance?.stopBGM();
        tween(this.settingsPanel)
            .to(0.15, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
            .call(() => director.loadScene('IntroScene'))
            .start();
    }
}
