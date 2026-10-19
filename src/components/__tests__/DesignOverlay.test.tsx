import { StyleSheet, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { BASE_SIZE, DesignOverlay } from '../molecules/DesignOverlay';
import type { TattooDesign } from '../../models/tattooDesign';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-reanimated', () => require('../../testing/reanimatedStub'));

// El store del editor arrastra los servicios (Supabase, modelos 3D);
// aqui solo se lee su colocacion inicial.
jest.mock("../../core/services", () => ({}));

// Los gestos de verdad necesitan el modulo nativo; aqui basta con que
// cada constructor encadene y el detector pinte a su hijo.
jest.mock('react-native-gesture-handler', () => {
  const chain = (): unknown => new Proxy({}, { get: () => () => chain() });
  return {
    Gesture: new Proxy({}, { get: () => () => chain() }),
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

const design: TattooDesign = {
  id: 'd1',
  ownerId: 'u1',
  title: 'Rosa',
  imageUrl: 'file:///rosa.png',
  source: 'userUpload',
  createdAt: '2026-10-18T00:00:00.000Z',
};

function render(guide: boolean): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<DesignOverlay design={design} guide={guide} onRemove={() => {}} />);
  });
  return tree;
}

/** Lo que pinta el boceto: una Image, o la SvgImage del recorte "Sin fondo". */
const designPictures = (tree: ReactTestRenderer) =>
  tree.root.findAll((n) => {
    const uri = n.props.source?.uri ?? n.props.href?.uri;
    return typeof uri === 'string' && uri.includes('rosa.png');
  });

describe('DesignOverlay en modo guia (foto o camara "en la piel")', () => {
  it('no pinta el boceto plano encima del tatuaje en la piel', () => {
    expect(designPictures(render(true))).toHaveLength(0);
  });

  // En Android, Gesture Handler ignora las vistas con alfa < 0.1: la
  // zona para agarrarlo es un hueco del tamaño del boceto, no el boceto
  // escondido con opacity 0 (asi no se podia mover ni tirar a la basura).
  it('la zona para agarrarlo mide lo que el boceto', () => {
    const sized = render(true)
      .root.findAllByType(View)
      .map((v) => StyleSheet.flatten(v.props.style))
      .filter((s) => s?.width === BASE_SIZE && s?.height === BASE_SIZE);
    expect(sized.length).toBeGreaterThan(0);
  });

  it('fuera del modo guia si se ve el boceto', () => {
    expect(designPictures(render(false)).length).toBeGreaterThan(0);
  });
});
