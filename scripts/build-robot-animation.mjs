import fs from "node:fs";

const inputPath = process.argv[2] ?? "scripts/robot-run-source.glb";
const outputPath = process.argv[3] ?? "public/robot-run.anim";

const BODY_BONES = [
  "root", "pelvis", "spine_01", "spine_02", "spine_03", "spine_04", "spine_05",
  "neck_01", "neck_02", "head", "clavicle_l", "upperarm_l", "lowerarm_l", "hand_l",
  "pinky_metacarpal_l", "pinky_01_l", "pinky_02_l", "pinky_03_l", "ring_metacarpal_l",
  "ring_01_l", "ring_02_l", "ring_03_l", "thumb_01_l", "thumb_02_l", "thumb_03_l",
  "middle_metacarpal_l", "middle_01_l", "middle_02_l", "middle_03_l", "index_metacarpal_l",
  "index_01_l", "index_02_l", "index_03_l", "clavicle_r", "upperarm_r", "lowerarm_r", "hand_r",
  "pinky_metacarpal_r", "pinky_01_r", "pinky_02_r", "pinky_03_r", "ring_metacarpal_r",
  "ring_01_r", "ring_02_r", "ring_03_r", "thumb_01_r", "thumb_02_r", "thumb_03_r",
  "middle_metacarpal_r", "middle_01_r", "middle_02_r", "middle_03_r", "index_metacarpal_r",
  "index_01_r", "index_02_r", "index_03_r", "thigh_r", "calf_r", "foot_r", "ball_r",
  "littletoe_01_r", "littletoe_02_r", "ringtoe_01_r", "ringtoe_02_r", "middletoe_01_r",
  "middletoe_02_r", "bigtoe_01_r", "bigtoe_02_r", "indextoe_01_r", "indextoe_02_r",
  "calf_twist_01_r", "thigh_l", "calf_l", "foot_l", "ball_l", "indextoe_01_l", "indextoe_02_l",
  "bigtoe_01_l", "bigtoe_02_l", "littletoe_01_l", "littletoe_02_l", "middletoe_01_l",
  "middletoe_02_l", "ringtoe_01_l", "ringtoe_02_l", "calf_twist_01_l",
];

const MIXAMO = (name) => `mixamorig:${name}`;
const SOURCE_BY_BONE = {
  pelvis: "Hips",
  spine_01: "Spine",
  spine_02: "Spine1",
  spine_03: "Spine2",
  neck_01: "Neck",
  head: "Head",
  clavicle_l: "LeftShoulder",
  upperarm_l: "LeftArm",
  lowerarm_l: "LeftForeArm",
  hand_l: "LeftHand",
  clavicle_r: "RightShoulder",
  upperarm_r: "RightArm",
  lowerarm_r: "RightForeArm",
  hand_r: "RightHand",
  thigh_l: "LeftUpLeg",
  calf_l: "LeftLeg",
  foot_l: "LeftFoot",
  ball_l: "LeftToeBase",
  thigh_r: "RightUpLeg",
  calf_r: "RightLeg",
  foot_r: "RightFoot",
  ball_r: "RightToeBase",
};

for (const side of ["l", "r"]) {
  const sourceSide = side === "l" ? "Left" : "Right";
  for (const finger of ["Pinky", "Ring", "Middle", "Index"]) {
    const slug = finger.toLowerCase();
    for (let i = 0; i < 4; i += 1) {
      SOURCE_BY_BONE[`${slug}_${i === 0 ? "metacarpal" : String(i).padStart(2, "0")}_${side}`] = `${sourceSide}Hand${finger}${i + 1}`;
    }
  }
  for (const toe of ["littletoe", "ringtoe", "middletoe", "bigtoe", "indextoe"]) {
    SOURCE_BY_BONE[`${toe}_01_${side}`] = side === "l" ? "LeftToeBase" : "RightToeBase";
    SOURCE_BY_BONE[`${toe}_02_${side}`] = side === "l" ? "LeftToe_End" : "RightToe_End";
  }
}

function readGlb(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.toString("ascii", 0, 4) !== "glTF") throw new Error("Input is not a GLB file");
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength));
  let offset = 20 + jsonLength;
  const binLength = buffer.readUInt32LE(offset);
  const binStart = offset + 8;
  return { json, buffer, bin: buffer.subarray(binStart, binStart + binLength) };
}

function accessorValues(asset, accessorIndex) {
  const accessor = asset.json.accessors[accessorIndex];
  const view = asset.json.bufferViews[accessor.bufferView];
  const componentSize = accessor.componentType === 5126 ? 4 : 2;
  const components = { SCALAR: 1, VEC3: 3, VEC4: 4 }[accessor.type];
  if (accessor.componentType !== 5126) throw new Error(`Unsupported accessor component type ${accessor.componentType}`);
  const byteOffset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const length = accessor.count * components;
  return new Float32Array(asset.bin.buffer, asset.bin.byteOffset + byteOffset, length);
}

function nodeDefaults(node) {
  return {
    translation: node.translation ?? [0, 0, 0],
    rotation: node.rotation ?? [0, 0, 0, 1],
    scale: node.scale ?? [1, 1, 1],
  };
}

function interpolate(channel, frame, frames, components, quaternion = false) {
  if (!channel || channel.times.length === 0) return null;
  const { times, values } = channel;
  const i = Math.min(frame, times.length - 1);
  if (times.length === frames && i === frame) return Array.from(values.slice(i * components, (i + 1) * components));
  const t = frame / Math.max(frames - 1, 1) * times[times.length - 1];
  if (t <= times[0]) return Array.from(values.slice(0, components));
  if (t >= times[times.length - 1]) return Array.from(values.slice((times.length - 1) * components, times.length * components));
  let hi = 1;
  while (hi < times.length && times[hi] < t) hi += 1;
  const lo = hi - 1;
  const alpha = (t - times[lo]) / (times[hi] - times[lo]);
  const out = [];
  for (let c = 0; c < components; c += 1) out.push(values[lo * components + c] + (values[hi * components + c] - values[lo * components + c]) * alpha);
  if (quaternion) {
    const length = Math.hypot(...out) || 1;
    return out.map((value) => value / length);
  }
  return out;
}

function trsMatrix(translation, rotation, scale) {
  const [x, y, z, w] = rotation;
  const [sx, sy, sz] = scale;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    translation[0], translation[1], translation[2], 1,
  ];
}

const floatBuffer = new ArrayBuffer(4);
const floatView = new Float32Array(floatBuffer);
const intView = new Uint32Array(floatBuffer);

function floatToHalf(value) {
  floatView[0] = value;
  const bits = intView[0];
  const sign = (bits >>> 16) & 0x8000;
  const exponent = ((bits >>> 23) & 0xff) - 127 + 15;
  const mantissa = bits & 0x7fffff;
  if (exponent <= 0) {
    if (exponent < -10) return sign;
    return sign | ((mantissa | 0x800000) >>> (1 - exponent + 13));
  }
  if (exponent >= 31) return sign | 0x7c00;
  return sign | (exponent << 10) | (mantissa >>> 13);
}

const asset = readGlb(inputPath);
const animation = asset.json.animations?.[0];
if (!animation) throw new Error("The GLB has no animation clip");

const channels = new Map();
for (const channel of animation.channels) {
  const node = asset.json.nodes[channel.target.node];
  if (!node?.name) continue;
  const sampler = animation.samplers[channel.sampler];
  const input = accessorValues(asset, sampler.input);
  const output = accessorValues(asset, sampler.output);
  channels.set(`${node.name}:${channel.target.path}`, {
    times: input,
    values: output,
    components: channel.target.path === "rotation" ? 4 : 3,
  });
}

const sourceNodes = new Map(asset.json.nodes.map((node) => [node.name, node]));
const firstChannel = channels.values().next().value;
const numFrames = firstChannel.times.length;
const data = new Float32Array(numFrames * BODY_BONES.length * 16);

for (let frame = 0; frame < numFrames; frame += 1) {
  for (let boneIndex = 0; boneIndex < BODY_BONES.length; boneIndex += 1) {
    const boneName = BODY_BONES[boneIndex];
    const sourceName = SOURCE_BY_BONE[boneName];
    const node = sourceName ? sourceNodes.get(MIXAMO(sourceName)) : null;
    const defaults = nodeDefaults(node ?? {});
    const rotation = interpolate(channels.get(`${node?.name}:rotation`), frame, numFrames, 4, true) ?? defaults.rotation;
    const translation = interpolate(channels.get(`${node?.name}:translation`), frame, numFrames, 3) ?? defaults.translation;
    const scale = interpolate(channels.get(`${node?.name}:scale`), frame, numFrames, 3) ?? defaults.scale;
    data.set(trsMatrix(translation, rotation, scale), (frame * BODY_BONES.length + boneIndex) * 16);
  }
}

const header = Buffer.from(JSON.stringify({
  type: "skeletal_animation",
  version: 2,
  dataType: "float16",
  numFrames,
  numBones: BODY_BONES.length,
}), "utf8");
const halfData = new Uint16Array(data.length);
for (let i = 0; i < data.length; i += 1) halfData[i] = floatToHalf(data[i]);
const output = Buffer.alloc(4 + header.length + halfData.byteLength);
output.writeUInt32LE(header.length, 0);
header.copy(output, 4);
Buffer.from(halfData.buffer, halfData.byteOffset, halfData.byteLength).copy(output, 4 + header.length);
fs.writeFileSync(outputPath, output);
console.log(`Built ${outputPath}: ${numFrames} frames × ${BODY_BONES.length} canonical body bones (${output.length} bytes)`);
