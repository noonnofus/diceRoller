import * as React from 'react';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { Asset } from 'expo-asset';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import {
  PerspectiveCamera,
  Scene,
  AmbientLight,
  DirectionalLight,
  Mesh,
} from "three";
import * as CANNON from "cannon-es";
import * as THREE from 'three';
import { DeviceMotion } from "expo-sensors";

export default function App() {
  const [modelUri, setModelUri] = React.useState<string | null>(null);
  const diceBodyRef = React.useRef<CANNON.Body | null>(null);

  React.useEffect(() => {
    async function loadModel() {
      const [{ localUri }] = await Asset.loadAsync(require('../assets/dice/dice.obj'));
      setModelUri(localUri);
    }
    loadModel();
  }, []);

  React.useEffect(() => {
    const subscription = DeviceMotion.addListener((data) => {
      const { accelerationIncludingGravity } = data;

      if (accelerationIncludingGravity && diceBodyRef.current) {
        const { x, y, z } = accelerationIncludingGravity;

        diceBodyRef.current.force.set(x * 10, y * 10, z * 10);
      }
    });

    DeviceMotion.setUpdateInterval(100);

    return () => subscription.remove();
  }, []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    let diceMesh: Mesh | null = null;

    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

    const scene = new Scene();
    const camera = new PerspectiveCamera(
      75,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);

    const ambientLight = new AmbientLight(0x404040, 3);
    scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 2);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);

    world.step(1 / 60, 1 / 120, 10);

    const groundMaterial = new CANNON.Material("ground");
    const diceMaterial = new CANNON.Material("dice");

    const contactMaterial = new CANNON.ContactMaterial(groundMaterial, diceMaterial, {
      friction: 0.3,
      restitution: 0.6,
    });

    const groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    groundBody.position.set(0, -1, 0);
    world.addBody(groundBody);

    const backWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
    });
    backWallBody.quaternion.setFromEuler(0, Math.PI, 0);
    backWallBody.position.set(0, 0, 7);
    world.addBody(backWallBody);

    const frontWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
    });
    frontWallBody.quaternion.setFromEuler(0, 0, 0);
    frontWallBody.position.set(0, 0, -7);
    world.addBody(frontWallBody);

    const leftWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
    });
    leftWallBody.quaternion.setFromEuler(0, Math.PI / 2, 0);
    leftWallBody.position.set(-7, 0, 0);
    world.addBody(leftWallBody);

    const rightWallBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
    });
    rightWallBody.quaternion.setFromEuler(0, -Math.PI / 2, 0);
    rightWallBody.position.set(7, 0, 0);
    world.addBody(rightWallBody);

    const diceBody = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
      position: new CANNON.Vec3(0, 5, 0),
      angularDamping: 0.1,
      linearDamping: 0.1,
    });


    diceBody.sleepSpeedLimit = 0.1;
    diceBody.sleepTimeLimit = 1.0;

    world.addBody(diceBody);
    diceBodyRef.current = diceBody;

    groundBody.material = groundMaterial;
    diceBody.material = diceMaterial;
    world.addContactMaterial(contactMaterial);

    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterialThree = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterialThree);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -1;
    scene.add(groundMesh);

    const loader = new OBJLoader();
    loader.load(
      modelUri!,
      (object) => {
        object.scale.set(0.5, 0.5, 0.5);
        scene.add(object);

        const findMesh = (obj: THREE.Object3D): THREE.Mesh | null => {
          if (obj instanceof THREE.Mesh) return obj;
          for (const child of obj.children) {
            const mesh = findMesh(child);
            if (mesh) return mesh;
          }
          return null;
        };

        const mesh = findMesh(object);
        if (mesh) {
          diceMesh = mesh;
        } else {
          console.error("Mesh not found in loaded model");
        }
      },
      undefined,
      (error) => console.error("모델 로딩 오류:", error)
    );

    const render = () => {
      requestAnimationFrame(render);
      world.step(1 / 60, 1 / 60, 10);

      if (diceMesh && diceBody) {
        diceMesh.position.set(diceBody.position.x, diceBody.position.y, diceBody.position.z);
        diceMesh.quaternion.set(
          diceBody.quaternion.x,
          diceBody.quaternion.y,
          diceBody.quaternion.z,
          diceBody.quaternion.w
        );
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    render();
  };

  return <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />;
};
