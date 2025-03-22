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

export default function App() {
  const [modelUri, setModelUri] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadModel() {
      const [{ localUri }] = await Asset.loadAsync(require('../assets/dice/dice.obj'));
      setModelUri(localUri);
    }
    loadModel();
  }, []);

  return (
    <GLView
      style={{ flex: 1 }}
      onContextCreate={async (gl: ExpoWebGLRenderingContext) => {
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

        const groundBody = new CANNON.Body({
          mass: 0,
          shape: new CANNON.Plane(),
        });
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        groundBody.position.set(0, -1, 0);
        world.addBody(groundBody);

        const groundGeometry = new THREE.PlaneGeometry(10, 10);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.position.y = -1;
        scene.add(groundMesh);

        const diceBody = new CANNON.Body({
          mass: 1,
          shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
          position: new CANNON.Vec3(0, 5, 0),
        });
        world.addBody(diceBody);

        let diceMesh: Mesh | null = null;
        if (modelUri) {
          const loader = new OBJLoader();
          loader.load(
            modelUri,
            (object) => {
              object.scale.set(0.5, 0.5, 0.5);
              scene.add(object);
              const findMesh = (obj: THREE.Object3D): THREE.Mesh | null => {
                if (obj instanceof THREE.Mesh) {
                  return obj;
                }
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
            (error) => {
              console.error("error while loading model:", error);
            }
          );
        }

        const render = () => {
          requestAnimationFrame(render);

          world.step(1 / 60);

          if (diceMesh) {
            diceMesh.position.set(
              diceBody.position.x,
              diceBody.position.y,
              diceBody.position.z
            );
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
      }}
    />
  );
}
