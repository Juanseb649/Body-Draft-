import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';

import { DesignComments } from '../organisms/DesignComments';
import type { DesignComment } from '../../models/designSocial';
import { ThemeProvider } from '../../theme';

// jest.mock se eleva sobre los imports: el stub ya esta puesto cuando se cargan.
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-reanimated', () => require('../../testing/reanimatedStub'));

const comment = (id: string, userId: string, body: string): DesignComment => ({
  id,
  designId: 'd1',
  userId,
  authorName: userId === 'u1' ? 'Lucía Paz' : 'Tomás Ibarra',
  body,
  createdAt: new Date().toISOString(),
});

function render(props: Partial<React.ComponentProps<typeof DesignComments>> = {}) {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <ThemeProvider>
        <DesignComments
          comments={[]}
          isLoading={false}
          isPosting={false}
          canComment
          canDelete={() => false}
          onSubmit={jest.fn().mockResolvedValue(true)}
          onDelete={jest.fn()}
          {...props}
        />
      </ThemeProvider>,
    );
  });
  return tree;
}

const texts = (tree: ReactTestRenderer) =>
  tree.root.findAllByType(Text).map((t) => [t.props.children].flat().join(''));

const byLabel = (tree: ReactTestRenderer, label: string) =>
  tree.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');

describe('DesignComments', () => {
  it('sin comentarios muestra un estado vacio que invita a preguntar', () => {
    const tree = render();
    expect(texts(tree).some((t) => t.startsWith('Nadie comentó todavía'))).toBe(true);
  });

  it('solo ofrece borrar los comentarios que canDelete permite', () => {
    const tree = render({
      comments: [comment('c1', 'u1', 'Mío'), comment('c2', 'u2', 'Ajeno')],
      canDelete: (c) => c.userId === 'u1',
    });
    expect(byLabel(tree, 'Borrar el comentario de Lucía Paz')).toHaveLength(1);
    expect(byLabel(tree, 'Borrar el comentario de Tomás Ibarra')).toHaveLength(0);
  });

  it('publica lo escrito y limpia el campo solo si se publico', async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    const tree = render({ onSubmit });
    const input = tree.root.findByType(TextInput);

    act(() => input.props.onChangeText('¿Cuánto mide?'));
    await act(async () => {
      byLabel(tree, 'Publicar comentario')[0].props.onPress();
    });

    expect(onSubmit).toHaveBeenCalledWith('¿Cuánto mide?');
    expect(tree.root.findByType(TextInput).props.value).toBe('');
  });

  it('sin sesion no hay campo para escribir', () => {
    const tree = render({ canComment: false });
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  });
});
