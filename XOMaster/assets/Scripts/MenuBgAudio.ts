import { _decorator, Component, AudioSource, AudioClip, director, isValid } from 'cc';
import { GameConfig } from './GameConfig';
const { ccclass, property } = _decorator;

@ccclass('MenuBgAudio')
export class MenuBgAudio extends Component {

    @property(AudioSource)
    audio: AudioSource = null!;

    @property(AudioClip)
    bgMusic: AudioClip = null!;

    private static _instance: MenuBgAudio | null = null;

    static get instance(): MenuBgAudio | null {
        return MenuBgAudio._instance;
    }

    start() {
        // Kiểm tra instance cũ còn sống không — tránh reference stale sau khi scene unload
        const prevAlive = MenuBgAudio._instance && isValid(MenuBgAudio._instance.node);
        if (prevAlive) {
            // Nhạc đang phát liên tục từ scene trước → xoá node thừa, không replay
            this.node.destroy();
            return;
        }
        // Không có instance hợp lệ → trở thành instance mới
        MenuBgAudio._instance = this;
        director.addPersistRootNode(this.node);
        this.playIfEnabled();
    }

    playIfEnabled() {
        if (!GameConfig.musicOn || !this.bgMusic || !this.audio) return;
        if (this.audio.playing) return;
        this.audio.clip = this.bgMusic;
        this.audio.loop = true;
        this.audio.volume = 0.5;
        this.audio.play();
    }

    stopMusic() {
        if (this.audio) this.audio.stop();
    }

    resumeMusic() {
        if (this.audio && GameConfig.musicOn && !this.audio.playing) this.audio.play();
    }

    // Gọi trước khi load GameScene — dừng nhạc và huỷ node persistent
    static cleanup() {
        if (!MenuBgAudio._instance) return;
        const node = MenuBgAudio._instance.node;
        MenuBgAudio._instance.audio?.stop();
        // Xoá reference trước khi destroy để tránh re-entrancy
        MenuBgAudio._instance = null;
        if (node && isValid(node)) {
            director.removePersistRootNode(node);
            node.destroy();
        }
    }
}
