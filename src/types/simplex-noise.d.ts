// simple-noise.d.ts

// Declaration of the module to match the library
declare module 'simplex-noise' {
    // Type for the random number generator function
    export type RandomFn = () => number;

    // Type for the 2D noise function
    export type NoiseFunction2D = (x: number, y: number) => number;

    // Type for the 3D noise function
    export type NoiseFunction3D = (x: number, y: number, z: number) => number;

    // Type for the 4D noise function
    export type NoiseFunction4D = (x: number, y: number, z: number, w: number) => number;

    // Function to create a 2D noise generator
    export function createNoise2D(random?: RandomFn): NoiseFunction2D;

    // Function to create a 3D noise generator
    export function createNoise3D(random?: RandomFn): NoiseFunction3D;

    // Function to create a 4D noise generator
    export function createNoise4D(random?: RandomFn): NoiseFunction4D;
}

