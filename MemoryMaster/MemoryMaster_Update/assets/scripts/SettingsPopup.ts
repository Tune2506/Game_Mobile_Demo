import { _decorator, Component, Node, Sprite, Color, sys, tween, Vec3, UIOpacity, director } from 'cc';
import { GameManager } from './GameManager';
import { ClassicGameManager } from './ClassicGameManager';
import { AudioManager } from './AudioManager';

const { ccclass, property } = _decorator;

const MUSIC_KEY  = 'Settings_Music';
const SOUND_KEY  = 'Settings_Sound';
const KNOB_ON_X  = 167;
const KNOB_OFF_X = 120;
const COLOR_ON   = new Color(255, 255, 255, 255);
const COLOR_OFF  = new Color(120,  80,  60, 255);

@ccclass('SettingsPopup')
export class SettingsPopup extends Component {

    @property(Node) musicTrackNode: Node = null!;
    @property(Node) musicKnobNode:  Node = null!;
    @property(Node) soundTrackNode: Node = null!;
    @property(Node) soundKnobNode:  Node = null!;
    @property(Node) gameManagerNode: Node   = null!;
    @property       backScene:       string = 'IntroScene';

    private _musicOn = true;
    private _soundOn = true;

    onEnable() {
        this._musicOn = sys.localStorage.getItem(MUSIC_KEY) !== '0';
        this._soundOn = sys.localStorage.getItem(SOUND_KEY) !== '0';
        this.setKnob(this.musicTrackNode, this.musicKnobNode, this._musicOn, false);
        this.setKnob(this.soundTrackNode, this.soundKnobNode, this._soundOn, false);

        this.node.setScale(0.75, 0.75, 1);
        const op = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
        op.opacity = 0;
        tween(this.node).to(0.28, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
        tween(op).to(0.22, { opacity: 255 }, { easing: 'sineOut' }).start();
    }

    onMusicRow() {
        this._musicOn = !this._musicOn;
        sys.localStorage.setItem(MUSIC_KEY, this._musicOn ? '1' : '0');
        this.setKnob(this.musicTrackNode, this.musicKnobNode, this._musicOn, true);
        AudioManager.playSFX('click');
        AudioManager.applyMusicSetting();
    }

    onSoundRow() {
        this._soundOn = !this._soundOn;
        sys.localStorage.setItem(SOUND_KEY, this._soundOn ? '1' : '0');
        this.setKnob(this.soundTrackNode, this.soundKnobNode, this._soundOn, true);
        AudioManager.playSFX('click');
    }

    private setKnob(track: Node, knob: Node, isOn: boolean, animate: boolean) {
        const targetX    = isOn ? KNOB_ON_X : KNOB_OFF_X;
        const trackColor = isOn ? COLOR_ON : COLOR_OFF;
        const trackSpr   = track.getComponent(Sprite)!;
        if (animate) {
            const proxy = { x: knob.position.x };
            tween(proxy)
                .to(0.2, { x: targetX }, { easing: 'sineInOut',
                    onUpdate: () => knob.setPosition(proxy.x, knob.position.y, 0) })
                .start();
            tween(trackSpr)
                .to(0.2, { color: trackColor })
                .start();
        } else {
            knob.setPosition(targetX, knob.position.y, 0);
            trackSpr.color = trackColor;
        }
    }

    openPopup() {
        AudioManager.playSFX('click');
        this.node.active = true;
    }

    onCloseBtn() {
        AudioManager.playSFX('click');
        this.callManager(gm => gm.resumeGame());
        const op = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
        tween(this.node).to(0.18, { scale: new Vec3(0.75, 0.75, 1) }, { easing: 'sineIn' }).start();
        tween(op).to(0.15, { opacity: 0 }, { easing: 'sineIn' })
            .call(() => { this.node.active = false; this.node.setScale(1, 1, 1); op.opacity = 255; })
            .start();
    }

    onPlayAgainBtn() {
        AudioManager.playSFX('click');
        this.callManager(gm => gm.onPlayAgainBtn());
        this.node.active = false;
    }

    onBackBtn() {
        AudioManager.playSFX('click');
        director.loadScene(this.backScene);
    }

    private callManager(fn: (gm: GameManager | ClassicGameManager) => void) {
        const gm = this.gameManagerNode?.getComponent(GameManager)
                ?? this.gameManagerNode?.getComponent(ClassicGameManager);
        if (gm) fn(gm);
    }

}
