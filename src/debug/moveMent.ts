import '@babylonjs/core/Debug/debugLayer'
import '@babylonjs/inspector'
import '@babylonjs/loaders/glTF'

import {
  Engine,
  Scene,
  Vector3,
  Mesh,
  Color3,
  Color4,
  ShadowGenerator,
  GlowLayer,
  PointLight,
  FreeCamera,
  CubeTexture,
  Sound,
  PostProcess,
  Effect,
  SceneLoader,
  Matrix,
  MeshBuilder,
  Quaternion,
  AssetsManager,
  EngineFactory,
  ActionManager,
  ExecuteCodeAction,
  Scalar,
  TransformNode,
  UniversalCamera,
  CreateBox,
  ArcRotateCamera,
  HemisphericLight,
} from '@babylonjs/core'
import {
  AdvancedDynamicTexture,
  StackPanel,
  Button,
  TextBlock,
  Rectangle,
  Control,
  Image,
} from '@babylonjs/gui'

//enum for states
enum State {
  START = 0,
  GAME = 1,
  LOSE = 2,
  CUTSCENE = 3,
}

// App class is our entire game application
class App {
  private scene: Scene
  private engine: Engine
  private canvas: HTMLCanvasElement
  public inputMap: any
  public horizontal: number = 0
  public vertical: number = 0
  public horizontalAxis: number = 0
  public verticalAxis: number = 0
  //Camera
  private _camRoot: TransformNode
  private _yTilt: TransformNode
  public camera: UniversalCamera
  deltaTime: number
  moveDirection: Vector3
  box: Mesh

  constructor() {
    this.canvas = this._createCanvas()
    this.inputMap = {}
    this.init()
  }

  private async init(): Promise<void> {
    const engine = (this.engine = new Engine(this.canvas))
    const scene = (this.scene = new Scene(engine))
    const actionManager = new ActionManager(scene)

    this.setupObject()
    // const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene)
    // camera.attachControl(this.canvas, true)
    this.setupPlayerCamera()

    actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
        this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == 'keydown'
      })
    )
    actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
        this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == 'keydown'
      })
    )

    engine.runRenderLoop(function () {
      scene.render()
    })
    scene.onBeforeRenderObservable.add(() => {
      this.updateFromKeyboard()
    })
    scene.registerBeforeRender(() => {
      this.updateFromControls()
      this.updateGroundDetection()
      this.updateCamera()
    })
  }

  private updateCamera(): void {
    this._camRoot.position = Vector3.Lerp(
      this._camRoot.position,
      new Vector3(this.box.position.x, 0, this.box.position.z),
      0.4
    )
  }

  private updateGroundDetection(): void {
    console.log(this.moveDirection)
    this.box.moveWithCollisions(this.moveDirection)
  }

  private updateFromControls(): void {
    this.deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0

    this.moveDirection = Vector3.Zero()

    let fwd = this._camRoot.forward
    let right = this._camRoot.right
    let correctedVertical = fwd.scaleInPlace(this.vertical)
    let correctedHorizontal = right.scaleInPlace(this.horizontal)
    // console.log(fwd, right, correctedVertical, correctedHorizontal)

    let move = correctedHorizontal.addInPlace(correctedVertical)
    this.moveDirection = new Vector3(move.normalize().x, 0, move.normalize().z)
  }

  private setupObject() {
    this.box = MeshBuilder.CreateBox('box', {size: 2}, this.scene)
    this.box.moveWithCollisions(new Vector3(4, 0, 0))
  }

  private setupPlayerCamera(): UniversalCamera {
    //root camera parent that handles positioning of the camera to follow the player
    this._camRoot = new TransformNode('root')
    this._camRoot.position = new Vector3(0, 0, 0) //initialized at (0,0,0)
    //to face the player from behind (180 degrees)
    // this._camRoot.rotation = new Vector3(0, Math.PI, 0)

    //rotations along the x-axis (up/down tilting)
    let yTilt = new TransformNode('ytilt')
    //adjustments to camera view to point down at our player
    yTilt.rotation = new Vector3(0.5934119456780721, 0, 0)
    this._yTilt = yTilt
    yTilt.parent = this._camRoot

    //our actual camera that's pointing at our root's position
    this.camera = new UniversalCamera('cam', new Vector3(0, 0, -30), this.scene)
    this.camera.lockedTarget = this._camRoot.position
    this.camera.fov = 0.47350045992678597
    this.camera.parent = yTilt

    this.scene.activeCamera = this.camera
    return this.camera
  }

  private updateFromKeyboard(): void {
    if (this.inputMap['ArrowUp']) {
      this.vertical = Scalar.Lerp(this.vertical, 1, 0.2)
      this.verticalAxis = 1
    } else if (this.inputMap['ArrowDown']) {
      this.vertical = Scalar.Lerp(this.vertical, -1, 0.2)
      this.verticalAxis = -1
    } else {
      this.vertical = 0
      this.verticalAxis = 0
    }

    if (this.inputMap['ArrowLeft']) {
      this.horizontal = Scalar.Lerp(this.horizontal, -1, 0.2)
      this.horizontalAxis = -1
    } else if (this.inputMap['ArrowRight']) {
      this.horizontal = Scalar.Lerp(this.horizontal, 1, 0.2)
      this.horizontalAxis = 1
    } else {
      this.horizontal = 0
      this.horizontalAxis = 0
    }
  }

  //set up the canvas
  private _createCanvas(): HTMLCanvasElement {
    //Commented out for development
    document.documentElement.style['overflow'] = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.width = '100%'
    document.documentElement.style.height = '100%'
    document.documentElement.style.margin = '0'
    document.documentElement.style.padding = '0'
    document.body.style.overflow = 'hidden'
    document.body.style.width = '100%'
    document.body.style.height = '100%'
    document.body.style.margin = '0'
    document.body.style.padding = '0'

    //create the canvas html element and attach it to the webpage
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.canvas.id = 'gameCanvas'
    document.body.appendChild(this.canvas)

    return this.canvas
  }
}
new App()
