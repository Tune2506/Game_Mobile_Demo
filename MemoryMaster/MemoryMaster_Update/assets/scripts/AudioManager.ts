import { _decorator, Component, Node, AudioSource, AudioClip, resources, director, sys } from 'cc';

const { ccclass } = _decorator;

const MUSIC_KEY = 'Settings_Music';
const SOUND_KEY = 'Settings_Sound';

const BGM_PATHS: Record<string, string> = {
    intro:     'Sound/MenuIntro',
    menu:      'Sound/MenuIntro',
    classic:   'Sound/Classicmusic',
    challenge: 'Sound/ChallangeMusic',
};

const SFX_PATHS: Record<string, string> = {
    click:     'Sound/Click',
    slide:     'Sound/slide',
    correct:   'Sound/correct_match',
    incorrect: 'Sound/Incorrect_match',
    denied:    'Sound/Denied',
    win:       'Sound/Winsound',
    lose:      'Sound/LoseSound',
    newrecord: 'Sound/NewRecord',
};

@ccclass('AudioManager')
export class AudioManager extends Component {
    private static _inst: AudioManager | null = null;
    private _bgmSrc: AudioSource | null = null;
    private _sfxSrc: AudioSource | null = null;
    private _currentBgmPath = '';
    private _clipCache = new Map<string, AudioClip>();

    private static _ensure() {
        if (AudioManager._inst) return;
        const node = new Node('__AudioManager');
        director.getScene()!.addChild(node);
        AudioManager._inst = node.addComponent(AudioManager);
        director.addPersistRootNode(node);
    }

    onLoad() {
        if (AudioManager._inst && AudioManager._inst !== this) {
            this.node.destroy();
            return;
        }
        AudioManager._inst = this;
        this._bgmSrc = this.node.addComponent(AudioSource);
        this._bgmSrc.loop   = true;
        this._bgmSrc.volume = 0.6;
        this._sfxSrc = this.node.addComponent(AudioSource);
        this._sfxSrc.loop   = false;
        this._sfxSrc.volume = 1;
    }

    onDestroy() {
        if (AudioManager._inst === this) AudioManager._inst = null;
    }

    // ── BGM ──────────────────────────────────────────────────
    static playBGM(key: string) {
        AudioManager._ensure();
        const inst = AudioManager._inst!;
        const path = BGM_PATHS[key];
        if (!path) return;

        // Cùng clip đang phát → giữ nguyên (Intro↔Menu liên tục)
        if (inst._currentBgmPath === path && inst._bgmSrc?.playing) return;

        // Đổi track → dừng clip cũ ngay lập tức trước khi load clip mới
        if (inst._currentBgmPath !== path) {
            inst._bgmSrc?.stop();
        }
        inst._currentBgmPath = path;

        if (!AudioManager.isMusicOn()) return;

        inst._loadClip(path, clip => {
            // Nếu trong lúc load có yêu cầu track khác → bỏ qua
            if (inst._currentBgmPath !== path || !inst._bgmSrc) return;
            inst._bgmSrc.clip = clip;
            inst._bgmSrc.play();
        });
    }

    static pauseBGM() {
        AudioManager._inst?._bgmSrc?.pause();
    }

    static resumeBGM() {
        const inst = AudioManager._inst;
        if (!inst || !inst._bgmSrc) return;
        if (AudioManager.isMusicOn()) inst._bgmSrc.play();
    }

    static applyMusicSetting() {
        const inst = AudioManager._inst;
        if (!inst || !inst._bgmSrc) return;
        if (AudioManager.isMusicOn()) {
            // Load lại (cache) rồi play — không dựa vào .playing vì unreliable sau async
            const path = inst._currentBgmPath;
            if (!path) return;
            inst._loadClip(path, clip => {
                if (!inst._bgmSrc || inst._bgmSrc.playing) return;
                inst._bgmSrc.clip = clip;
                inst._bgmSrc.play();
            });
        } else {
            inst._bgmSrc.stop();
        }
    }

    // ── SFX ──────────────────────────────────────────────────
    static playSFX(key: string) {
        AudioManager._ensure();
        if (!AudioManager.isSoundOn()) return;
        const inst = AudioManager._inst!;
        const path = SFX_PATHS[key];
        if (!path) return;
        inst._loadClip(path, clip => {
            if (!inst._sfxSrc) return;
            inst._sfxSrc.stop();
            inst._sfxSrc.clip = clip;
            inst._sfxSrc.play();
        });
    }

    // ── Settings ─────────────────────────────────────────────
    static isMusicOn(): boolean { return sys.localStorage.getItem(MUSIC_KEY) !== '0'; }
    static isSoundOn(): boolean { return sys.localStorage.getItem(SOUND_KEY) !== '0'; }

    // ── Internal ─────────────────────────────────────────────
    private _loadClip(path: string, cb: (c: AudioClip) => void) {
        const cached = this._clipCache.get(path);
        if (cached) { cb(cached); return; }
        resources.load(path, AudioClip, (err, clip) => {
            if (err || !clip) return;
            this._clipCache.set(path, clip);
            cb(clip);
        });
    }
}
