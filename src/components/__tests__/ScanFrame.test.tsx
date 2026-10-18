import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text, View } from 'react-native';

import { ScanFrame } from '../molecules/ScanFrame';
import { ThemeProvider } from '../../theme';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-reanimated', () => require('../../testing/reanimatedStub'));

const frame = { x: 40, y: 60, width: 160, height: 300 };

function render(): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <ThemeProvider>
        <ScanFrame frame={frame} label="Encuadra tu antebrazo" />
      </ThemeProvider>,
    );
  });
  return tree;
}

describe('ScanFrame', () => {
  it('dice que zona encuadrar', () => {
    const labels = render().root.findAllByType(Text).map((t) => t.props.children);
    expect(labels).toContain('Encuadra tu antebrazo');
  });

  it('el recuadro ocupa exactamente el rectangulo pedido', () => {
    const boxes = render()
      .root.findAllByType(View)
      .map((v) => [v.props.style].flat(3).reduce((acc, s) => ({ ...acc, ...(s ?? {}) }), {}))
      .filter((s) => s.left === frame.x && s.top === frame.y);
    expect(boxes[0]).toMatchObject({ width: frame.width, height: frame.height });
  });

  it('no atrapa los toques: el boceto de encima se sigue moviendo', () => {
    const root = render().root.findAllByType(View)[0];
    expect(root.props.pointerEvents).toBe('none');
  });
});
