import {
	Engine,
	Scene,
	HemisphericLight,
	PointLight,
	Vector3,
	FreeCamera,
	ShadowGenerator,
	StandardMaterial,
	Texture,
	PhysicsImpostor,
	CannonJSPlugin,
	Color3,
	setAndStartTimer,
	MeshBuilder,
	PointerDragBehavior,
	DistanceJoint,
	VertexBuffer,
	ExecuteCodeAction,
	ActionManager,
	Sound,
	AdvancedTimer

} from 'babylonjs';
import CANNON from 'cannon';


function sigmoid(t) {
    return 1/(1+Math.pow(Math.E, -t))-0.5;
}

class Basket{
	constructor(subdivisions, rows, scene){
		// console.log(this);
		this._scene = scene;
		this.subdivisions = subdivisions;
		this.rows = rows;
		this.material = this.addMaterial();
		this.mesh = this.addMesh();
		this.default_positions = null;
		this.spheres = this.addSpheres();
		this.addChains()
		// console.log(this.spheres);
		this.loop = this.loop.bind(this)
		this.mesh.registerBeforeRender(this.loop);
	}

	dispose(){
		// this.mesh.dispose();
		// this.spheres.forEach((s, idx)=> {s.physicsImpostor.dispose(); s.dispose()});
	}

	addMaterial(){
		var clothMat = new StandardMaterial("texture3", this._scene);
	    clothMat.diffuseTexture = new Texture("/textures/net3.png", this._scene);
	    // clothMat.disableLighting = true
		clothMat.specularColor = new Color3(0.5, 0.6, 0.87);
		clothMat.emissiveColor = new Color3(0.7, 0.7, 0.7);
		clothMat.ambientColor = new Color3(0.23, 0.98, 0.53);
	    // Texture = new Texture("/assets/textures/net3.png", this._scene);
	    clothMat.diffuseTexture.hasAlpha = true;

	    clothMat.diffuseTexture.uScale = 2;
	    // clothMat.zOffset = -20;
	    clothMat.backFaceCulling = false;
	    return clothMat
	}

	addMesh(){
		const myPath = [];
	    for (var i=0; i<this.rows; i++){
	        myPath.push(new Vector3(0,2.5-i*0.2, -2))
	    }
	    const radiusChange = (index, distance) => {
	        // console.log((rows-index)*0.01+0.25)
	        const radius =  (this.rows-index)*0.03+0.2;
	        return radius;
	    };
	    
	     const basket = MeshBuilder.CreateTube("tube", {path: myPath, radiusFunction: radiusChange, tessellation: this.subdivisions, updatable: true}, this._scene, true);
	       
	    basket.material = this.material;
	    return basket
	}

	addSpheres(){
		var positions = this.mesh.getVerticesData(VertexBuffer.PositionKind);
        var defpos = [];
        // console.log(positions);
        var spheres = [];
        for (var i = 0; i < positions.length; i = i + 3) {
            if ((i/3)%(this.subdivisions+1)!=this.subdivisions) {
            var v = Vector3.FromArray(positions, i);
            defpos.push(v)
            // console.log(v);
            // console.log(v);
            var name = "s"+i
            if(i<=this.subdivisions*2) name = "top"; 
            // var name = "top"?i<this.subdivisions:"s"+i
            var s = MeshBuilder.CreateSphere(name, { diameter: 0.0001 }, this._scene);
            s.position.copyFrom(v);
            spheres.push(s);
            }
        }
        this.default_position = defpos;
        return spheres
	}

	startAgain(){
		this.spheres.forEach((s, idx)=> {
            // s.physicsImpostor.setLinearVelicity = new Vector3(0,0,0);
            // s.physicsImpostor.setAngularVelicity = new Vector3(0,0,0);
            s.position.copyFrom(this.default_position[idx]);
            s.physicsImpostor.dispose();
            // s.physicsImpostor.setAngularVelicity = new Vector3(0,0,0);
        });
        this.addChains();
	}


	addChains(){
		function createJoint(imp1, imp2, dist) {
            var joint = new DistanceJoint({
                maxDistance: dist
            })
            imp1.addJoint(imp2, joint);
        };
        this.spheres.forEach((point, idx) => {
		var mass = idx < this.subdivisions ? 0 : 0.1;
		// console.log(this);
            point.physicsImpostor = new PhysicsImpostor(point, PhysicsImpostor.ParticleImpostor, { mass: mass, pressure :6000, friction:0}, this._scene);
            if (idx >= this.subdivisions) {
                // console.log(BABYLON.Vector3.Distance(point.position, spheres[idx- 1].position))
                createJoint(point.physicsImpostor, this.spheres[idx - this.subdivisions].physicsImpostor, Vector3.Distance(point.position, this.spheres[idx- this.subdivisions].position));
                // if (idx % this.subdivisions == 0) createJoint(point.physicsImpostor, this.spheres[idx - (this.subdivisions-1)].physicsImpostor, 0);
                if (idx % this.subdivisions) {
                    // createJoint(point.physicsImpostor, this.spheres[idx - (this.subdivisions-1)].physicsImpostor);
                	createJoint(point.physicsImpostor, this.spheres[idx - 1].physicsImpostor, Vector3.Distance(point.position, this.spheres[idx- 1].position));
                }
                else{
                    if (idx>this.subdivisions){
                		createJoint(this.spheres[idx - 1].physicsImpostor, this.spheres[idx - this.subdivisions].physicsImpostor, Vector3.Distance(this.spheres[idx - 1].position, this.spheres[idx - this.subdivisions].position));
            		}
                }
            }
	})
	}

	// getPositions

	loop(){
        var positions = [];
        // console.log(this.spheres)
        this.spheres.forEach((s, idx)=> {
            positions.push(s.position.x, s.position.y, s.position.z);
            if (idx%this.subdivisions==this.subdivisions-1) {
                var p = this.spheres[idx-this.subdivisions+1].position;
                positions.push(p.x, p.y, p.z);
                }
        });
        this.mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
        this.mesh.refreshBoundingInfo();
        // }
    }
	
}

class GameScene {

	constructor(canvas, onFinish, onScore){
		window.CANNON = CANNON;
		this.onFinish = onFinish;
		this.onScore = onScore;
		this._engine = new Engine(canvas,false, {audioEngine: true , doNotHandleContextLost: true}, true);
		this._scene = new Scene(this._engine);

		this.fd = false
		this.score = 0;
		this.start_game = false;
		// this.throw_sound = null;
		// this.ball_sound = null;
		// this.hitboard_sound = null;
		this.throw_sound = new Sound("throw", "/sounds/throw.wav", this._scene, null, {autoplay: false, volume: 0.05});
		this.ball_sound = new Sound("ball", "/sounds/ball.wav", this._scene, null, {autoplay: false, volume: 0.01});
		
		this.hitboard_sound = new Sound("hitboard", "/sounds/hitboard.wav", this._scene, null, {autoplay: false, volume: 0.01});

		this.win_sound = new Sound("win", "/sounds/win.wav", this._scene, null, {autoplay: false, volume: 0.01});
		this.loose_sound = new Sound("loose", "/sounds/lose.wav", this._scene, null, {autoplay: false,volume: 0.005});
		this._canvas = canvas;
		this.loose_timer = this.addTimer(1500, ()=> 
						{
							// console.log(this.hit2,this.lose,this.start_throw)
							if (!this.hit2 && !this.lose && this.start_throw) {

		           		// this.start_throw = false;
		           		this.lose = true;
		           		this.onFinish();
		           	}
		           	});

		this.levels = [{ 'ball': new Vector3(0, 0.5, 1),
						 'camera': new Vector3(0, 2.5, 6),
						 'drag': new Vector3(0,1,5),
						 'impulse':  new Vector3(1,13,7)},
						 { 'ball': new Vector3(1.8,0.5,-0.7),
						 'camera': new Vector3(5,2,3),
						 'drag': new Vector3(5,1,2), 
						 'impulse':  new Vector3(5, 13, 5)},
						 { 'ball': new Vector3(-1.8,0.5,-0.7),
						 'camera': new Vector3(-5,2,3),
						 'drag': new Vector3(-5,1,2), 
						 'impulse':  new Vector3(5, 13, 5)}]
		this.current_level = 0;
		// this._scene.clearColor  = new Color3(255, 255, 255);
		this._sounds = {};
		this.normalGravity = new Vector3(0, -9.807, 0);
		this.addPhysics();
		
		this.light = this.addLights();
		this.camera = this.addCamera();
		// this._scene.onPointerObservable.add((pointerInfo) => {console.log(pointerInfo)});
		this.lose = false;
		this.ball = this.addBall()
		this.addGround();
		this.addTorus();
		this.addBoard()
		// console.log("created")
		// this.addBall();
		this.shadows = this.addShadow()
		this.last_drag = null;
		this.last_last_drag = null;
		this.last_time = null;
		this.last_delta_time = null;
		this.start_position = null;

		this.hit1 = false;
		this.hit2 = false;
		this.start_throw = false;
		this.behaivour = this.addDragBehaviour();
		this._scene.onPointerObservable.add((pointerInfo) => {
			if (this.start_game && pointerInfo.pickInfo.hit&& pointerInfo.pickInfo.pickedMesh.id == "sphere" && this.fd==false){
				this.fd = true;
				this.behaivour.startDrag(pointerInfo.event.pointerId, pointerInfo.pickInfo.ray,pointerInfo.pickedPoint);
			}
		});
		this.basket =new  Basket(8,4, this._scene);
		this.addColliderListener();
		this.addWinTrigger();
		this._scene.autoClear = false; // Color buffer
		this._scene.autoClearDepthAndStencil = false; 
		// console.log(this._scene.getEngine().hostInformation.isMobile)
		// this.addLoadingTasks();
		// this.addPlatforms();
		// this.addTouchListeners();
		//this.loadSounds();
		// allow moderate degradation
		//SceneOptimizer.OptimizeAsync(this._scene)
	}
	
	gameStart(){
		// console.log('yeah')
		Engine.audioEngine.unlock();
		// Engine.audioEngine.setGlobalVolume(0.01);
		// this.win_sound.setVolume(0);
		// console.log(this.win_sound.getVolume());
		this.start_game = true;
	}
	mute(muted){
		if (muted)	Engine.audioEngine.setGlobalVolume(0);
		else Engine.audioEngine.setGlobalVolume(1);
	}
	
	addTimer(timedelta, foo){
		// console.log(foo);
		var advancedTimer = new AdvancedTimer({
	    	timeout: timedelta,
	    	contextObservable: this._scene.onBeforeRenderObservable
		});
		advancedTimer.onTimerEndedObservable.add(foo);
		// advancedTimer.onTimerAbortedObservable.add(()=>console.log("abort"))
		return advancedTimer;
	}
	addWinTrigger(){
		var wintrigger = MeshBuilder.CreateSphere("win1", {diameter: 0.1, segments: 4}, this._scene);
		wintrigger.position.z = -2
        wintrigger.position.y = 2.3
        wintrigger.isVisible = false
	    wintrigger.isPickable = false;
	    wintrigger.checkCollisions = false;

	    var wintrigger2 = MeshBuilder.CreateSphere("win2", {diameter: 0.1, segments: 4}, this._scene);
		wintrigger2.position.z = -2
        wintrigger2.position.y = 2.0
        wintrigger2.isVisible = false
	    wintrigger2.isPickable = false;
	    wintrigger2.checkCollisions = false;


	    this.ball.actionManager.registerAction(
    		new ExecuteCodeAction(
        {
            trigger: ActionManager.OnIntersectionEnterTrigger,
            parameter: wintrigger,
        },
        () => {	if (this.start_throw && this.hit1==false)  this.hit1 = true}));


	    this.ball.actionManager.registerAction(
    		new ExecuteCodeAction(
        {
            trigger: ActionManager.OnIntersectionEnterTrigger,
            parameter: wintrigger2,
        },
        () => {
        	if (this.start_throw && this.hit2==false && this.hit1==true){
        	// this.hitboard_sound.play();
            this.hit2 = true;
            this.win_sound.play();
            this.onScore();
            this.loose_timer.stop();
            // console.log('stop')
            setAndStartTimer({
				  timeout: 1500,
				  contextObservable: this._scene.onBeforeRenderObservable,
				  onEnded: () => {
				   this.dispose();
				  },
				});
        }
        },
    ),
);
	}

	dispose(){
		if (this.score%6<2) this.current_level = 0;
		else if (this.score%6>=2 && this.score%6<4) this.current_level = 1;
		else this.current_level = 2;
		this.lose = false;
		this.hit1 = false;
		this.hit2 = false;
		this.ball_sound.setVolume(0.01);
		this.fd = false;
		this.start_throw = false;
		this.ball.isPickable = true;
		this.last_drag = null;
		this.last_last_drag = null;
		this.ball.position = this.levels[this.current_level].ball
		this.camera.position = this.levels[this.current_level].camera
		this.camera.setTarget(new Vector3(0,2,-3));
		this.ball.getBehaviorByName('PointerDrag').options = {dragPlaneNormal: this.levels[this.current_level].drag}
		this.ball.physicsImpostor.setLinearVelocity(new Vector3(0,0,0));
		this.ball.physicsImpostor.setAngularVelocity(new Vector3(0,0,0));
		this.ball.physicsImpostor.forceUpdate();
		// console.log(this.basket);
		// this.basket.dispose()
		// this.basket = null;
		this.basket.startAgain();
		
		this._scene.getPhysicsEngine().setGravity(new Vector3(0, 0, 0));
		this.basket.startAgain();
		// console.log('disp', this.lose);
		// this.basket =new  Basket(8,4, this._scene);
		// this.basket.startAgain();
		

		
		// this._scene.dispose();
	}

	addColliderListener(){
		// this.ball.physicsImpostor.onCollide = (body, point) =>{console.log(body.body.id);};
		this.ball.physicsImpostor.onCollideEvent =  (self, other)=>{
		// console.log(other.object.id);
		if (other.object.name =='top' && this.hitboard_sound.isPlaying==false){this.hitboard_sound.play();}
		if (other.object.name =='board'){this.ball_sound.play();}

          if (other.object.id == 'ground'&& this.start_throw){

           	this.ball_sound.play();
           	// console.log(this.ball_sound.getVolume());
           	this.ball_sound.setVolume(Math.max(0,this.ball_sound.getVolume()-0.001));
           	// console.log(this.ball_sound.volume);
           	// this.ball_sound.setVolume(this.ball_sound.volume-0.1);
           	if (!this.hit2) {
           		// console.log('collide', this.hit1, this.lose, this.start_throw)

           		// this.start_throw = false;
           		if (!this.lose){
           		// console.log("lose")
           		this.loose_sound.play();
           		this.lose = true;
           		this.loose_timer.stop();
           		// console.log('stop')
           		this.onFinish();
           		
           		
           	}
           		// 
           	}
           }
            //     can_hit =  true;
            //     ballsound.play();
        }
	}
	addDragBehaviour(){		
        var pointerDragBehavior = new PointerDragBehavior( {dragPlaneNormal: this.levels[this.current_level].drag});
        pointerDragBehavior.validateDrag = (targetPosition) =>{
        	// console.log('validate', this.start_game)
        	if (targetPosition.y<3 && targetPosition.y> 0.4 && this.start_game) return true;
        	return false;
        }
        // pointerDragBehavior.maxDragAngle = Math.PI/2;
        // console.log(pointerDragBehavior.name);
        pointerDragBehavior.useObjectOrientationForDragging = false;
        pointerDragBehavior.onDragStartObservable.add((event)=>{
        	// console.log(event)
            this.start_position = new Vector3(this.ball.position.x,this.ball.position.y,this.ball.position.z)
            // this.start_position.copyFrom();            
            // if (this.throw_sound==null) this.addSounds();
        })
        pointerDragBehavior.onDragObservable.add((event)=>{
        	// console.log(event)
        	// const v = Date.now();
        	// if (this.last_time!==null) this.last_delta_time =  v - this.last_time
        	// this.last_time = v;

        	// if (this.last_drag!==null) 	this.last_last_drag = new Vector3(this.last_drag.x,this.last_drag.y, this.last_drag.z);
        	// console.log('1',this.last_drag, event.delta)
            // this.last_last_drag = new Vector3(event.delta.x,event.delta.y, event.delta.z);
            this.last_drag = event.delta;
            // console.log('2',this.last_drag)

            
        })
        pointerDragBehavior.onDragEndObservable.add((event)=>{
        	// console.log('f')
        	if (!this.start_game) return;
     		// console.log(event)
     		// console.log('end');
            this._scene.getPhysicsEngine().setGravity(this.normalGravity);
            this.start_throw = true;
            this.ball.isPickable = false;
            if (this.last_drag === null) this.last_drag = new Vector3(0,0,0);
            if (this.last_drag.y<=0){
            	this.last_drag.y = 0.001;
            }
            // console.log('y',this.last_drag)
            var fy = this.last_drag.y*this.last_drag.y*400;
            var fz = fy/5;
            var fx = this.last_drag.x*30;
            // console.log(fy)
            if (fy>7.5) fy=7.5;
            if (fz>4) fz=4;
            // console.log(this.last_delta_time)
            // if (this.last_delta_time>7) this.last_last_drag = new Vector3(0,0,0);
            // console.log(this.last_last_drag, this.last_drag)
            var impulse = new Vector3(
            						sigmoid(this.last_drag.x*100)*this.levels[this.current_level].impulse.x, 
            						// 5,
            						// -5);
            						sigmoid(this.last_drag.y*100)*this.levels[this.current_level].impulse.y, 	
            						sigmoid(this.last_drag.z*100)*this.levels[this.current_level].impulse.z);	
            // impulse = new Vector3(-2.5,5.5, -5);
          // 

            // console.log('2',impulse);
            this.ball.physicsImpostor.applyImpulse(impulse, this.ball.position);
            this.throw_sound.play();
            this.start_throw = true;
            // console.log(this.throw_sound);
            this.loose_timer._breakOnNextTick = false;
            // this.loose_timer.start();
            // this.loose_timer.stop();
            this.loose_timer.start(2000);
            // console.log( this.loose_timer)
            // console.log('s',this.loose_timer._state)
        })
        this.ball.addBehavior(pointerDragBehavior);
        return pointerDragBehavior;
	}

	addShadow(){
		var shadowGenerator = new ShadowGenerator(1024, this.light);
		shadowGenerator.useExponentialShadowMap = true;
		shadowGenerator.getShadowMap().renderList.push(this.ball);
		return shadowGenerator
	}
	loop(){
		this._engine.runRenderLoop(() => {
				this._scene.render();
			});
	}

	addBoard(){
		var box = MeshBuilder.CreateBox("board", {width: 2, height:1.3, depth: 0.1}, this._scene);
		box.position.y = 3
		box.position.z = -2.7

		var board_material = new StandardMaterial("board_material", this._scene);
		board_material.diffuseTexture = new Texture("/textures/backboard.jpg", this._scene);
		board_material.specularTexture = new Texture("/textures/back_normal.png", this._scene);
		// board_material.bumpTexture = new Texture("/textures/normal_back.png", this._scene);
		box.receiveShadows = true;
        // board_material.specularTexture = new Texture("assets/textures/normal_ball2.png", this._scene);
        board_material.freeze();
        box.material = board_material;
		box.physicsImpostor = new PhysicsImpostor(box, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.3 , friction:0.3}, this._scene);

		var bb = MeshBuilder.CreateBox("bb", {width: 0.2, height:0.1, depth: 0.7}, this._scene);
		bb.position.y = 2.5
		bb.position.z = -2.7
		var torusMaterial = new StandardMaterial("torussMaterial", this._scene);
        torusMaterial.diffuseColor = new Color3.FromHexString("#c81f1f");
        torusMaterial.metallic = 1;
        torusMaterial.freeze();
        bb.material = torusMaterial;

	}

	addBall(){
		var sphere = MeshBuilder.CreateSphere("sphere", {diameter: 0.5, segments: 32},this._scene);
        var sphere_material = new StandardMaterial("sphere_material", this._scene);
        sphere_material.diffuseTexture = new Texture("/textures/ball.png", this._scene);
        
        sphere_material.bumpTexture = new Texture("/textures/ball_normal.png", this._scene);
        sphere_material.freeze();
        sphere.material = sphere_material;
        sphere.position = this.levels[this.current_level].ball
        sphere.isPickable = true;
        sphere.physicsImpostor = new PhysicsImpostor(sphere, PhysicsImpostor.SphereImpostor, { mass: 1, restitution: 0.9 }, this._scene);
        sphere.actionManager = new ActionManager(this._scene);
        // console.log(this._scene.getPhysicsEngine.gravity)
        return sphere
        
           
	}
	

	addTorus(){
		const torus = MeshBuilder.CreateTorus("torus", {diameter: 0.7, thickness:0.05} , this._scene);
        torus.position.z = -2
        torus.position.y = 2.5
        var torusMaterial = new StandardMaterial("torusMaterial", this._scene);
        torusMaterial.diffuseColor = new Color3.FromHexString("#c81f1f");
        torusMaterial.metallic = 1;
        torusMaterial.freeze();
        torus.material = torusMaterial;
        // console.log(torus);

        torus.isPickable = false;
        torus.freezeWorldMatrix();
        torus.physicsImpostor =  new PhysicsImpostor(torus, PhysicsImpostor.MeshImpostor, { mass: 0, friction: 0.1}, this._scene);
   //      torus.physicsImpostor.onCollideEvent =  (self, other)=>{
			// console.log(other.object.id);};
	}

	addGround(){
		var ground = MeshBuilder.CreateGround("ground", {width: 30, height: 30}, this._scene);
        // ground.rotation.y = Math.PI/2
        // ground.position.z = -2
        var ground_material = new StandardMaterial("ground_material", this._scene);
        // ground_material.diffuseColor = new Color3.FromHexString("#CCCCCC");
        ground_material.roughness = 1;
        var tex = new Texture("textures/parq.jpg", this._scene);
        tex.uScale = 6;
        tex.zOffset = Math.PI
        ground_material.diffuseTexture = tex
        ground_material.ambientColor = new Color3(0,0,0);
        ground_material.freeze()
        ground.material = ground_material;
        ground.receiveShadows = true;
        ground.isPickable = false;
        ground.freezeWorldMatrix();
        ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, this._scene);

        var back = MeshBuilder.CreateGround("ground", {width: 30, height: 30}, this._scene);
        back.rotation.x = Math.PI/2
        back.position.z = -3.7
        var back_material = new StandardMaterial("back_material", this._scene);
        var backtex = new Texture("textures/wall.jpg", this._scene);
        backtex.uScale = 10;
        backtex.vScale = 10;
        back_material.diffuseTexture = backtex;
        var backntex = new Texture("textures/wall_normal.png", this._scene);
        backntex.uScale = 10;
        backntex.vScale = 10;
        back_material.bumpTexture = backntex;
        back_material.freeze()
        back.material = back_material;
        back.receiveShadows = true;
        back.isPickable = false;
        back.freezeWorldMatrix();
        back.physicsImpostor = new PhysicsImpostor(back, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, this._scene);

        var floor = MeshBuilder.CreateBox("floor", {width: 30, height: 0.2, depth: 0.2}, this._scene);
        floor.position.z = -3.6
        floor.position.y = 0
        var floor_material = new StandardMaterial("floor_material", this._scene);

        var t = new Texture("textures/floor.png", this._scene);
        t.uScale = 16;
         floor_material.diffuseTexture = t;
         floor_material.freeze();
        floor.material = floor_material;
        floor.freezeWorldMatrix();
            
            
	}

	addLights(){
		var light = new PointLight("pl", new Vector3(0, 4, 2), this._scene);
		light.shadowMinZ = 0.1
        // light.position = new Vector3(20, 40, 20);
        // Default intensity is 1. Let's dim the light a small amount
        // light.range = 5000
        // light.shadowAngle = Math.PI
        light.intensity = 0.3;
        var hem_light = new HemisphericLight("HemiLight", new Vector3(0, 1, 0), this._scene);
        // // Our built-in 'sphere' shape.
        hem_light.intensity = 0.5;
        return light
	}

	addCamera(){
		var camera = new FreeCamera("camera1", this.levels[this.current_level].camera, this._scene);

            // This targets the camera to scene origin
        camera.setTarget(new Vector3(0,2,-3));
        return camera
	}

	addPhysics(){
		// this._scene.workerCollisions = true;
		// this._scene.collisionsEnabled = true;
		var pe = new CannonJSPlugin()
		this._scene.enablePhysics( null, pe );
		// this._scene.gravity = this.normalGravity;
		this._scene.getPhysicsEngine().setGravity(new Vector3(0, 0, 0));
		// console.log(this._scene.gravity)
	}	
}

export default GameScene;