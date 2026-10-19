import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import Svg, { Path } from 'react-native-svg';

import { BodyDraftLogo } from '../molecules/BodyDraftLogo';
import { LOGO_GLYPHS } from '../molecules/logoGlyphs.generated';
import { ThemeProvider } from '../../theme';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-reanimated', () => require('../../testing/reanimatedStub'));

function render(props: React.ComponentProps<typeof BodyDraftLogo>): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <ThemeProvider>
        <BodyDraftLogo {...props} />
      </ThemeProvider>,
    );
  });
  return tree;
}

describe('BodyDraftLogo', () => {
  it('se dibuja con los trazados de la fuente, no con texto (iOS recortaba la "y" y la "f")', () => {
    const tree = render({ size: 104 });
    const ds = tree.root.findAllByType(Path).map((p) => p.props.d);
    expect(ds).toContain(LOGO_GLYPHS.Body.d);
    expect(ds).toContain(LOGO_GLYPHS.Draft.d);
  });

  it('los trazados traen las partes que antes se cortaban: los rasgos bajo la linea base', () => {
    // La cola de la "y" y el bucle de la "f" bajan casi media letra.
    expect(LOGO_GLYPHS.Body.box.y2).toBeGreaterThan(40);
    expect(LOGO_GLYPHS.Draft.box.y2).toBeGreaterThan(40);
  });

  it('nunca es mas ancho que la pantalla (750 px de ancho de prueba)', () => {
    const svg = render({ size: 400 }).root.findByType(Svg);
    expect(svg.props.width).toBeLessThanOrEqual(750 - 32);
  });
});
