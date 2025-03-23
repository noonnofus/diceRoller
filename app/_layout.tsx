import { Stack } from "expo-router";
import * as THREE from 'three';

(global as any).THREE = (global as any).THREE || THREE;

export default function RootLayout() {
  return <Stack />;
}
