// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Los maniquines 3D son .glb. Metro no lo conoce como asset (no esta
// entre sus extensiones por defecto), asi que sin esto un
// require('...glb') falla al resolver y lista candidatos .glb.ts,
// .glb.tsx... que no existen. Van como asset y no como modulo JS para
// que el binario NO acabe dentro del bundle: se leen en runtime (ver
// controllers/useBodyModel.ts).
//
// OJO: Metro cachea esta configuracion. Al tocar este archivo hay que
// arrancar una vez con `npx expo start --clear`, o el servidor sigue
// resolviendo con la config vieja.
config.resolver.assetExts.push('glb');

module.exports = config;
