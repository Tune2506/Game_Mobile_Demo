import { _decorator, Component } from 'cc';
import { SceneTransition } from './SceneTransition';
const { ccclass } = _decorator;

/**
 * SceneNav.ts
 * Gắn vào bất kỳ node nào trong scene, sau đó kéo thả các hàm này
 * vào sự kiện Click của Button tương ứng trong Inspector.
 *
 * Mọi lần chuyển scene đều đi qua SceneTransition để có hiệu ứng fade.
 * TÊN SCENE phải khớp CHÍNH XÁC tên file .scene (không có đuôi).
 */
@ccclass('SceneNav')
export class SceneNav extends Component {

    /** Quay về màn hình menu chính */
    public moMenu() {
        SceneTransition.go('MenuScene', this.node);
    }

    /** Chuyển sang scene chơi Dễ (lưới 2×2) */
    public moDe() {
        SceneTransition.go('EasyScene', this.node);
    }

    /** Chuyển sang scene chơi Trung bình (lưới 3×3) */
    public moTrungBinh() {
        SceneTransition.go('MediumScene', this.node);
    }

    /** Chuyển sang scene chơi Khó (lưới 4×4) */
    public moKho() {
        SceneTransition.go('HardScene', this.node);
    }
}
