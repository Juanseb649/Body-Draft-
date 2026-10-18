import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { BodyZonePicker } from '../molecules/BodyZonePicker';
import { BODY_ZONES } from '../../models/bodyZone';
import { BODY_ZONE_GROUPS, groupOf, ZONE_HOTSPOTS } from '../../models/bodyZoneGroups';
import { ThemeProvider } from '../../theme';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-reanimated', () => require('../../testing/reanimatedStub'));

function render(props: React.ComponentProps<typeof BodyZonePicker>): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <ThemeProvider>
        <BodyZonePicker {...props} />
      </ThemeProvider>,
    );
  });
  return tree;
}

const pressByLabel = (tree: ReactTestRenderer, label: string) =>
  act(() => tree.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === label)[0].props.onPress());

const texts = (tree: ReactTestRenderer) => tree.root.findAllByType(Text).map((t) => [t.props.children].flat().join(''));

describe('grupos de zonas', () => {
  it('cada una de las 12 zonas esta en un grupo y tiene su punto en la figura', () => {
    const grouped = BODY_ZONE_GROUPS.flatMap((g) => g.zones).sort();
    expect(grouped).toEqual([...BODY_ZONES].sort());
    for (const zone of BODY_ZONES) expect(ZONE_HOTSPOTS[zone]).toBeDefined();
  });

  it('groupOf', () => {
    expect(groupOf('calf')).toBe('piernas');
    expect(groupOf('ribs')).toBe('torso');
    expect(groupOf(undefined)).toBe('brazos');
  });
});

describe('BodyZonePicker', () => {
  it('tocar un punto de la figura elige la zona', () => {
    const onChange = jest.fn();
    const tree = render({ value: undefined, onChange });
    pressByLabel(tree, 'Tobillo');
    expect(onChange).toHaveBeenCalledWith('ankle');
  });

  it('muestra la zona elegida en grande, o "Cuerpo entero" sin zona', () => {
    expect(texts(render({ value: 'forearm', onChange: jest.fn() }))).toContain('Antebrazo');
    expect(texts(render({ value: undefined, onChange: jest.fn() }))).toContain('Cuerpo entero');
  });

  it('abre en el grupo de la zona elegida, con solo sus zonas', () => {
    const tree = render({ value: 'thigh', onChange: jest.fn() });
    const chipLabels = texts(tree);
    expect(chipLabels).toContain('Pantorrilla');
    expect(chipLabels).not.toContain('Hombro');
  });

  it('"Ver cuerpo entero" quita la zona', () => {
    const onChange = jest.fn();
    const tree = render({ value: 'chest', onChange });
    act(() =>
      tree.root
        .findAll((n) => typeof n.props.onPress === 'function' && n.findAllByType(Text).some((t) => t.props.children === 'Ver cuerpo entero'))[0]
        .props.onPress(),
    );
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});

describe('BodyZonePicker — sugerencia de la foto', () => {
  it('mientras detecta, lo dice', () => {
    expect(texts(render({ value: undefined, onChange: jest.fn(), hint: { state: 'detecting' } }))).toContain(
      'Buscando en tu foto qué zona es…',
    );
  });

  it('la sugerencia NO cambia la zona sola: se confirma con "Usar"', () => {
    const onChange = jest.fn();
    const tree = render({ value: undefined, onChange, hint: { state: 'suggested', zone: 'forearm', confidence: 'alta' } });
    expect(onChange).not.toHaveBeenCalled();
    pressByLabel(tree, 'Usar Antebrazo');
    expect(onChange).toHaveBeenCalledWith('forearm');
  });

  it('con poca seguridad lo dice como duda', () => {
    const tree = render({ value: undefined, onChange: jest.fn(), hint: { state: 'suggested', zone: 'calf', confidence: 'media' } });
    expect(texts(tree).some((t) => t.startsWith('Puede que sea'))).toBe(true);
  });

  it('en un primer plano deja la eleccion manual y lo explica', () => {
    const tree = render({ value: undefined, onChange: jest.fn(), hint: { state: 'unknown', reason: 'closeup' } });
    expect(texts(tree).some((t) => t.includes('no se ve suficiente del cuerpo'))).toBe(true);
  });
});
