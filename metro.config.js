// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Los maniquines 3D son .glb. Metro no lo conoce como asset, asi que
// sin esto un require('...glb') falla al resolver. Van como asset y no
// como modulo JS para que el binario NO acabe dentro del bundle: se
// leen en runtime (ver controllers/useBodyModel.ts).
config.resolver.assetExts.push('glb');

module.exports = config;
