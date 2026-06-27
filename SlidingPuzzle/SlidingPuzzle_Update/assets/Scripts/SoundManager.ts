import { sys, AudioSource, AudioClip, director } from 'cc';

const MUTE_KEY = 'SlidingPuzzle_Muted';

/**
 * SoundManager
 * Quản lý trạng thái tắt/bật âm thanh toàn cục — dùng qua static methods.
 * Trạng thái được lưu vào localStorage để nhớ giữa các scene.
 */
export class SoundManager {

    private static _loaded = false;
    private static _muted  = false;

    // Đọc trạng thái từ localStorage lần đầu dùng
    private static _load() {
        if (this._loaded) return;
        this._loaded = true;
        this._muted = sys.localStorage.getItem(MUTE_KEY) === '1';
    }

    static get muted(): boolean {
        this._load();
        return this._muted;
    }

    /**
     * Toggle tắt/bật âm thanh.
     * Cập nhật volume tất cả BGM (AudioSource loop) đang có trong scene ngay lập tức.
     * Trả về trạng thái muted mới.
     */
    static toggle(): boolean {
        this._load();
        this._muted = !this._muted;
        sys.localStorage.setItem(MUTE_KEY, this._muted ? '1' : '0');

        // Cập nhật volume tất cả AudioSource đang loop (BGM) trong scene hiện tại
        const scene = director.getScene();
        if (scene) {
            const sources = scene.getComponentsInChildren(AudioSource);
            for (const src of sources) {
                if (src.loop) src.volume = this._muted ? 0 : 1;
            }
        }
        return this._muted;
    }

    /** Phát nhạc nền — tự set volume về 0 nếu đang muted */
    static playBgm(source: AudioSource, clip: AudioClip) {
        if (!source || !clip) return;
        source.clip  = clip;
        source.loop  = true;
        source.volume = this.muted ? 0 : 1;
        source.play();
    }

    /** Phát SFX một lần — bỏ qua nếu đang muted */
    static playSfx(source: AudioSource | null, clip: AudioClip | null) {
        if (!source || !clip || this.muted) return;
        source.playOneShot(clip);
    }
}
