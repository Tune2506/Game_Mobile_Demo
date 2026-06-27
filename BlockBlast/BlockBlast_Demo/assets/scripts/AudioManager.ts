import { _decorator, Component, AudioSource, AudioClip, sys } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {

    public static instance: AudioManager = null!;

    @property(AudioClip) menuBgm:      AudioClip = null!;
    @property(AudioClip) bgm:          AudioClip = null!;

    @property(AudioClip) pickupSfx:    AudioClip = null!;
    @property(AudioClip) placeSfx:     AudioClip = null!;
    @property(AudioClip) clearSfx:     AudioClip = null!;
    @property(AudioClip) comboSfx:     AudioClip = null!;
    @property(AudioClip) perfectSfx:   AudioClip = null!;
    @property(AudioClip) gameOverSfx:      AudioClip = null!;
    @property(AudioClip) clickSfx:         AudioClip = null!;
    @property(AudioClip) newRecordSfx:     AudioClip = null!;
    @property(AudioClip) newRecordPopupSfx: AudioClip = null!;

    private bgmSrc: AudioSource = null!;
    private sfxSrc: AudioSource = null!;

    private _sfxOn: boolean = true;
    private _bgmOn: boolean = true;

    onLoad(): void {
        AudioManager.instance = this;

        const sources = this.node.getComponents(AudioSource);
        this.bgmSrc = sources[0] ?? this.addComponent(AudioSource);
        this.sfxSrc = sources[1] ?? this.addComponent(AudioSource);
        this.bgmSrc.loop   = true;
        this.bgmSrc.volume = 0.4;

        this._sfxOn = sys.localStorage.getItem('bb_sfx') !== '0';
        this._bgmOn = sys.localStorage.getItem('bb_bgm') !== '0';
    }

    get sfxOn(): boolean { return this._sfxOn; }
    get bgmOn(): boolean { return this._bgmOn; }

    setSfx(v: boolean): void {
        this._sfxOn = v;
        sys.localStorage.setItem('bb_sfx', v ? '1' : '0');
    }

    setBgm(v: boolean): void {
        this._bgmOn = v;
        sys.localStorage.setItem('bb_bgm', v ? '1' : '0');
        if (v) { this.playBGM(); } else { this.bgmSrc?.stop(); }
    }

    // ── BGM ──────────────────────────────────────────────────────────────

    playMenuBGM(): void {
        if (!this.menuBgm || !this._bgmOn || !this.bgmSrc) return;
        this.bgmSrc.stop();
        this.bgmSrc.clip = this.menuBgm;
        this.bgmSrc.play();
    }

    playBGM(): void {
        if (!this.bgm || !this._bgmOn || !this.bgmSrc) return;
        this.bgmSrc.stop();
        this.bgmSrc.clip = this.bgm;
        this.bgmSrc.play();
    }

    stopBGM(): void { this.bgmSrc?.stop(); }

    // ── SFX ──────────────────────────────────────────────────────────────

    playPickup():   void { if (this._sfxOn && this.pickupSfx)   this.sfxSrc?.playOneShot(this.pickupSfx,   0.8); }
    playPlace():    void { if (this._sfxOn && this.placeSfx)    this.sfxSrc?.playOneShot(this.placeSfx,    0.7); }
    playClear():    void { if (this._sfxOn && this.clearSfx)    this.sfxSrc?.playOneShot(this.clearSfx,    1.0); }
    playCombo():    void { if (this._sfxOn && this.comboSfx)    this.sfxSrc?.playOneShot(this.comboSfx,    0.9); }
    playPerfect():  void { if (this._sfxOn && this.perfectSfx)  this.sfxSrc?.playOneShot(this.perfectSfx,  1.0); }
    playGameOver(): void { if (this._sfxOn && this.gameOverSfx) this.sfxSrc?.playOneShot(this.gameOverSfx, 1.0); }
    playClick():          void { if (this._sfxOn && this.clickSfx)         this.sfxSrc?.playOneShot(this.clickSfx,         0.9); }
    playNewRecord():      void { if (this._sfxOn && this.newRecordSfx)     this.sfxSrc?.playOneShot(this.newRecordSfx,     1.0); }
    playNewRecordPopup(): void { if (this._sfxOn && this.newRecordPopupSfx)this.sfxSrc?.playOneShot(this.newRecordPopupSfx, 1.0); }
}
