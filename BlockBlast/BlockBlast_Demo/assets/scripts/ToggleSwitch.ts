import { _decorator, Component, Node, Sprite, Color, Vec3, tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ToggleSwitch')
export class ToggleSwitch extends Component {

    @property(Node)   track:      Node   = null!;
    @property(Node)   knob:       Node   = null!;
    @property         knobOffset: number = 23;   // ← chỉnh số này trong Editor cho khớp track

    private static readonly ON_COLOR  = new Color( 82, 196, 108, 255);
    private static readonly OFF_COLOR = new Color( 80,  90, 110, 255);

    private _isOn:    boolean = true;
    private _onChange: ((v: boolean) => void) | null = null;

    onLoad(): void {
        this.node.on(Node.EventType.TOUCH_END, this._handleTap, this);
    }

    onDestroy(): void {
        this.node.off(Node.EventType.TOUCH_END, this._handleTap, this);
    }

    setOnChange(cb: (v: boolean) => void): void {
        this._onChange = cb;
    }

    setValue(v: boolean, animated: boolean = false): void {
        this._isOn = v;
        const sp = this.track?.getComponent(Sprite);
        if (sp) sp.color = v ? ToggleSwitch.ON_COLOR : ToggleSwitch.OFF_COLOR;
        const targetX = v ? this.knobOffset : -this.knobOffset;
        if (this.knob) {
            if (animated) {
                tween(this.knob)
                    .to(0.15, { position: new Vec3(targetX, 0, 0) }, { easing: 'quadOut' })
                    .start();
            } else {
                this.knob.setPosition(targetX, 0, 0);
            }
        }
    }

    get isOn(): boolean { return this._isOn; }

    private _handleTap(): void {
        this.setValue(!this._isOn, true);
        this._onChange?.(this._isOn);
    }
}
