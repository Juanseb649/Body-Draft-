// GENERADO por tools/build-body-anchors.mjs. No editar a mano.
//
// Cada zona se midio sobre su .glb: se traza el eje del miembro
// cortando la malla en horizontal y se comprueba, con un trazado de
// rayos de verdad, que el rayo cae donde debe. Hay que regenerarlo
// al cambiar cualquier modelo de assets/models.
import type { BodySilhouette, BodyZone } from './bodyZone';
import type { ZoneAnchor } from './bodyZoneAnchors';

export const GENERATED_ZONE_ANCHORS: Record<BodySilhouette, Record<BodyZone, ZoneAnchor>> = {
  masculine: {
    neck: { from: [0, 1.552, 0.961], to: [0, 1.552, -0.039], distance: 0.3 },
    chest: { from: [0, 1.3, 0.945], to: [0, 1.3, -0.055], distance: 0.6 },
    back: { from: [0, 1.3, -1.055], to: [0, 1.3, -0.055], distance: 0.6 },
    ribs: { from: [1, 1.15, -0.003], to: [0, 1.15, -0.003], distance: 0.45 },
    shoulder: { from: [1.001, 1.44, -0.058], to: [0.001, 1.44, -0.058], distance: 0.4 },
    arm: { from: [1.313, 1.184, -0.286], to: [0.333, 1.184, -0.086], distance: 0.3 },
    forearm: { from: [1.441, 1.004, -0.15], to: [0.446, 1.004, -0.049], distance: 0.3 },
    wrist: { from: [1.357, 0.874, -0.543], to: [0.487, 0.874, -0.049], distance: 0.3 },
    hand: { from: [0.981, 0.814, -0.886], to: [0.491, 0.814, -0.014], distance: 0.3 },
    thigh: { from: [1.128, 0.614, -0.012], to: [0.128, 0.614, -0.011], distance: 0.381 },
    calf: { from: [1.155, 0.324, -0.064], to: [0.155, 0.324, -0.064], distance: 0.3 },
    ankle: { from: [1.155, 0.134, -0.067], to: [0.155, 0.134, -0.067], distance: 0.3 },
  },
  feminine: {
    neck: { from: [0, 1.552, 1.002], to: [0, 1.552, 0.002], distance: 0.3 },
    chest: { from: [0, 1.3, 1.066], to: [0, 1.3, 0.066], distance: 0.6 },
    back: { from: [0, 1.3, -0.934], to: [0, 1.3, 0.066], distance: 0.6 },
    ribs: { from: [1, 1.15, 0.076], to: [0, 1.15, 0.076], distance: 0.45 },
    shoulder: { from: [1, 1.44, -0.017], to: [0, 1.44, -0.017], distance: 0.4 },
    arm: { from: [0.887, 1.274, -0.827], to: [0.184, 1.274, -0.116], distance: 0.3 },
    forearm: { from: [1.167, 1.054, -0.527], to: [0.255, 1.054, -0.115], distance: 0.3 },
    wrist: { from: [1.255, 0.894, -0.343], to: [0.282, 0.894, -0.11], distance: 0.3 },
    hand: { from: [1.226, 0.834, -0.36], to: [0.259, 0.834, -0.104], distance: 0.3 },
    thigh: { from: [1.149, 0.624, 0.027], to: [0.149, 0.624, 0.027], distance: 0.3 },
    calf: { from: [1.188, 0.334, -0.044], to: [0.188, 0.334, -0.044], distance: 0.3 },
    ankle: { from: [1.197, 0.144, -0.048], to: [0.197, 0.144, -0.048], distance: 0.3 },
  },
};
