import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Document, NodeIO } from '@gltf-transform/core';

const require = createRequire(import.meta.url);
const occt = await require('occt-import-js')();
const [input, output] = process.argv.slice(2);

if (!input || !output) {
  throw new Error('Usage: node scripts/step-to-glb.mjs input.step output.glb');
}

const result = occt.ReadStepFile(fs.readFileSync(input), {
  linearUnit: 'millimeter',
  linearDeflectionType: 'bounding_box_ratio',
  linearDeflection: 0.0015,
  angularDeflection: 0.5,
});

if (!result.success || !result.meshes?.length) {
  throw new Error(`STEP conversion failed: ${input}`);
}

const document = new Document();
const buffer = document.createBuffer('geometry');
const scene = document.createScene('CLT Product');
const root = document.createNode('CLT Assembly').setScale([0.001, 0.001, 0.001]);
scene.addChild(root);

const finishForPart = (name = '') => {
  const part = name.toLowerCase();
  if (part.includes('t-body')) return { color: [0.02, 0.46, 0.9, 0.48], metallic: 0.05, roughness: 0.24, blend: true };
  if (part.includes('maintenance cover')) return { color: [0.94, 0.035, 0.045, 1], metallic: 0.08, roughness: 0.28 };
  if (part.includes('ball') && !part.includes('holder')) return { color: [0.86, 0.025, 0.03, 1], metallic: 0.04, roughness: 0.25 };
  if (part.includes('lap joint')) return { color: [0.075, 0.08, 0.09, 1], metallic: 0.72, roughness: 0.3 };
  if (part.includes('stub end')) return { color: [0.075, 0.08, 0.09, 1], metallic: 0.68, roughness: 0.32 };
  if (part.includes('holder')) return { color: [0.06, 0.28, 0.56, 1], metallic: 0.1, roughness: 0.35 };
  if (part.includes('o-ring')) return { color: [0.018, 0.02, 0.022, 1], metallic: 0, roughness: 0.7 };
  if (part.includes('safety net')) return { color: [0.22, 0.25, 0.28, 1], metallic: 0.6, roughness: 0.35 };
  if (part.includes('screw') || part.includes('8.2')) return { color: [0.72, 0.75, 0.78, 1], metallic: 0.8, roughness: 0.22 };
  return { color: [0.32, 0.36, 0.4, 1], metallic: 0.35, roughness: 0.42 };
};

result.meshes.forEach((source, index) => {
  const positions = new Float32Array(source.attributes.position.array.flat());
  const normals = source.attributes.normal
    ? new Float32Array(source.attributes.normal.array.flat())
    : null;
  const indices = new Uint32Array(source.index.array.flat());
  const primitive = document.createPrimitive()
    .setAttribute('POSITION', document.createAccessor(`position-${index}`).setType('VEC3').setArray(positions).setBuffer(buffer))
    .setIndices(document.createAccessor(`indices-${index}`).setType('SCALAR').setArray(indices).setBuffer(buffer));

  if (normals) {
    primitive.setAttribute('NORMAL', document.createAccessor(`normal-${index}`).setType('VEC3').setArray(normals).setBuffer(buffer));
  }

  const finish = finishForPart(source.name);
  const material = document.createMaterial(`material-${index}`)
    .setBaseColorFactor(finish.color)
    .setMetallicFactor(finish.metallic)
    .setRoughnessFactor(finish.roughness)
    .setDoubleSided(true);
  if (finish.blend) material.setAlphaMode('BLEND');
  primitive.setMaterial(material);

  const mesh = document.createMesh(source.name || `part-${index}`).addPrimitive(primitive);
  root.addChild(document.createNode(source.name || `part-${index}`).setMesh(mesh));
});

fs.mkdirSync(path.dirname(output), { recursive: true });
await new NodeIO().write(output, document);
console.log(JSON.stringify({ input, output, meshes: result.meshes.length }));
