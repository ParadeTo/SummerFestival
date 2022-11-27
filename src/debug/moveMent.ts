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
  Ray,
  RayHelper,
  GroundMesh,
  StandardMaterial,
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
import Axis from './drawAxis'
//enum for states
enum State {
  START = 0,
  GAME = 1,
  LOSE = 2,
  CUTSCENE = 3,
}

const JUMP_FORCE = 0.3
const GRAVITY = -8.8
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
  jumpKeyDown: boolean
  private _gravity: Vector3 = new Vector3()
  _jumped: boolean
  _isFalling: boolean

  constructor() {
    this.canvas = this._createCanvas()
    this.inputMap = {}
    this.init()
  }

  private async init(): Promise<void> {
    const engine = (this.engine = new Engine(this.canvas))
    const scene = (this.scene = new Scene(engine))
    const actionManager = (scene.actionManager = new ActionManager(scene))

    new Axis(scene)

    // Ground
    const ground = MeshBuilder.CreateGround(
      'ground',
      {width: 1000000, height: 100000},
      scene
    )
    const material = new StandardMaterial('myMaterial', scene)
    material.diffuseColor = new Color3(0.2, 0.2, 0.2)
    ground.material = material
    ground.position.y = -0.5

    this.setupObject()
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene)
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
    scene.onBeforeRenderObservable.add(() => {})
    scene.registerBeforeRender(() => {
      this.updateFromKeyboard()
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
    //if not grounded
    if (!this._isGrounded()) {
      //if the body isnt grounded, check if it's on a slope and was either falling or walking onto it
      // if (this._checkSlope() && this._gravity.y <= 0) {
      //   // console.log('slope')
      //   //if you are considered on a slope, you're able to jump and gravity wont affect you
      //   this._gravity.y = 0
      //   this._jumpCount = 1
      //   this._grounded = true
      // } else {
      //keep applying gravity
      if (this._gravity.y > 0) {
        this._gravity = this._gravity.addInPlace(
          Vector3.Up().scale(this.deltaTime * GRAVITY)
        )
      }
      // this._grounded = false
      // }
    }
    console.log(this.moveDirection, this._gravity)
    this.box.moveWithCollisions(this.moveDirection.addInPlace(this._gravity))

    if (this._isGrounded()) {
      this._gravity.y = 0
    }

    //Jump detection
    if (this.jumpKeyDown) {
      console.log(1)
      this._gravity.y = JUMP_FORCE

      this._jumped = true
      this._isFalling = false
    }
  }
  private _isGrounded() {
    if (this._floorRaycast(0, 0, 0.5).equals(Vector3.Zero())) {
      return false
    } else {
      return true
    }
  }
  private _floorRaycast(
    offsetx: number,
    offsetz: number,
    raycastlen: number
  ): Vector3 {
    //position the raycast from bottom center of mesh
    let raycastFloorPos = new Vector3(
      this.box.position.x,
      this.box.position.y,
      this.box.position.z
    )
    let ray = new Ray(raycastFloorPos, Vector3.Up().scale(-1), raycastlen)
    // const helper = new RayHelper(ray)
    // helper.show(this.scene)
    //defined which type of meshes should be pickable
    let predicate = function (mesh) {
      return mesh.isPickable && mesh.isEnabled()
    }

    let pick = this.scene.pickWithRay(ray, predicate)
    console.log(pick)
    if (pick.hit) {
      //grounded
      return pick.pickedPoint
    } else {
      //not grounded
      return Vector3.Zero()
    }
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

    //check if there is movement to determine if rotation is needed
    let input = new Vector3(this.horizontalAxis, 0, this.verticalAxis) //along which axis is the direction
    if (input.length() == 0) {
      //if there's no input detected, prevent rotation and keep player in same rotation
      return
    }

    let angle = -Math.atan2(this.horizontalAxis, -this.verticalAxis)
    this.box.rotation.y = +Scalar.Lerp(
      this.box.rotation.y,
      angle,
      10 * this.deltaTime
    )

    // let angle = -Math.atan2(this.horizontalAxis, -this.verticalAxis)
    // let targ = Quaternion.FromEulerAngles(0, angle, 0)
    // console.log(angle, targ, this.box.rotationQuaternion)
    // this.box.rotationQuaternion = Quaternion.Slerp(
    //   this.box.rotationQuaternion || new Quaternion(),
    //   targ,
    //   10 * this.deltaTime
    // )
  }

  private setupObject() {
    var faceColors = new Array(6)
    faceColors[1] = new Color4(1, 0, 0, 0.5)
    this.box = MeshBuilder.CreateBox('box', {size: 1, faceColors}, this.scene)
    this.box.isPickable = false
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

    //Jump Checks (SPACE)
    if (this.inputMap[' ']) {
      this.jumpKeyDown = true
    } else {
      this.jumpKeyDown = false
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
