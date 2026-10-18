import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Image, Text } from 'react-native';
import { Path } from 'react-native-svg';

import { Avatar } from '../atoms/Avatar';
import { INITIAL_GLYPHS } from '../molecules/logoGlyphs.generated';
import { ThemeProvider } from '../../theme';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-reanimated', () => require('../../testing/reanimatedStub'));

function render(props: React.ComponentProps<typeof Avatar>): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <ThemeProvider>
        <Avatar {...props} />
      </ThemeProvider>,
    );
  });
  return tree;
}

describe('Avatar', () => {
  it('con foto, muestra la foto', () => {
    const tree = render({ name: 'Nora Vega', imageUrl: 'https://cdn.test/nora.jpg' });
    expect(tree.root.findByType(Image).props.source).toEqual({ uri: 'https://cdn.test/nora.jpg' });
  });

  it('sin foto, la inicial con el trazado de la letra (centrable), no texto', () => {
    const tree = render({ name: 'ñandú tattoo' });
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    expect(tree.root.findByType(Path).props.d).toBe(INITIAL_GLYPHS['Ñ'].d);
  });

  it('si la foto no carga, vuelve a las iniciales', () => {
    const tree = render({ name: 'Rubén', imageUrl: 'https://cdn.test/rota.jpg' });
    act(() => tree.root.findByType(Image).props.onError());
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    expect(tree.root.findByType(Path).props.d).toBe(INITIAL_GLYPHS.R.d);
  });

  it('un nombre sin letras usables cae a un texto centrado', () => {
    const tree = render({ name: '' });
    expect(tree.root.findByType(Text).props.children).toBe('?');
  });
});
