import { _decorator, Component, director } from 'cc';
const { ccclass } = _decorator;

/**
 * SceneNav.ts
 * Gắn vào bất kỳ node nào trong scene, sau đó kéo thả các hàm này
 * vào sự kiện Click của Button tương ứng trong Inspector.
 *
 * TÊN SCENE phải khớp CHÍNH XÁC tên file .scene (không có đuôi).
 */
@ccclass('SceneNav')
export class SceneNav extends Component {

    /** Quay về màn hình menu chính */
    public moMenu() {
        director.loadScene('MenuScene');
    }

    /** Chuyển sang scene chơi Dễ (lưới 2×2) */
    public moDe() {
        director.loadScene('EasyScene');
    }

    /** Chuyển sang scene chơi Trung bình (lưới 3×3) */
    public moTrungBinh() {
        director.loadScene('MediumScene');
    }

    /** Chuyển sang scene chơi Khó (lưới 4×4) */
    public moKho() {
        director.loadScene('HardScene');
    }
}
