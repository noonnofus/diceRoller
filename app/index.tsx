import * as React from 'react';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { Asset } from 'expo-asset';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { PerspectiveCamera, Scene, AmbientLight, DirectionalLight } from 'three';

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
        // WebGLRenderer 생성
        const renderer = new Renderer({ gl });
        renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

        // Scene 생성
        const scene = new Scene();

        // 카메라 설정
        const camera = new PerspectiveCamera(
          75,
          gl.drawingBufferWidth / gl.drawingBufferHeight,
          0.1,
          1000
        );
        camera.position.z = 5;

        // 조명 추가
        const ambientLight = new AmbientLight(0x404040, 3);
        scene.add(ambientLight);

        const directionalLight = new DirectionalLight(0xffffff, 2);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        // 모델 로드 (modelUri가 있을 때만 실행)
        if (modelUri) {
          const loader = new OBJLoader();
          loader.load(
            modelUri,
            (object) => {
              scene.add(object);
            },
            undefined,
            (error) => {
              console.error('모델 로딩 오류:', error);
            }
          );
        } else {
          console.warn('모델이 아직 로드되지 않았습니다.');
        }

        // 렌더링 루프
        const render = () => {
          requestAnimationFrame(render);
          renderer.render(scene, camera);
          gl.endFrameEXP();
        };
        render();
      }}
    />
  );
}
