import { _decorator, Component, Node, sys, director } from 'cc';

const { ccclass, property } = _decorator;

const SAVE_KEY = 'MemoryMatch_Level';

@ccclass('IntroManager')
export class IntroManager extends Component {

    @property(Node) continueBtnNode: Node = null!;

    onLoad() {
        this.continueBtnNode.active = sys.localStorage.getItem(SAVE_KEY) !== null;
    }

    onPlayBtn() {
        sys.localStorage.removeItem(SAVE_KEY);
        director.loadScene('GameScene');
    }

    onContinueBtn() {
        director.loadScene('GameScene');
    }
}
