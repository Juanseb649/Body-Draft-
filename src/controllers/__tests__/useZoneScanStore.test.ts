import { useZoneScanStore } from '../useZoneScanStore';

const stage = { width: 390, height: 600 };

beforeEach(() => useZoneScanStore.getState().reset());

describe('useZoneScanStore — perfilar', () => {
  it('un trazo se guarda al soltar el dedo, con el tono elegido', () => {
    const s = useZoneScanStore.getState();
    s.setTone('blue');
    s.beginStroke({ x: 10, y: 10 });
    s.extendStroke({ x: 20, y: 10 });
    s.extendStroke({ x: 30, y: 12 });
    expect(useZoneScanStore.getState().strokes).toHaveLength(0);

    s.endStroke();
    const { strokes, current } = useZoneScanStore.getState();
    expect(current).toBeUndefined();
    expect(strokes).toEqual([{ tone: 'blue', points: [{ x: 10, y: 10 }, { x: 20, y: 10 }, { x: 30, y: 12 }] }]);
  });

  it('un dedo quieto no agrega puntos repetidos', () => {
    const s = useZoneScanStore.getState();
    s.beginStroke({ x: 10, y: 10 });
    s.extendStroke({ x: 10.5, y: 10 });
    s.extendStroke({ x: 11, y: 10.5 });
    expect(useZoneScanStore.getState().current?.points).toHaveLength(1);
  });

  it('con zoom acepta movimientos mas finos (el umbral es en pixeles de pantalla)', () => {
    const s = useZoneScanStore.getState();
    s.setView({ scale: 4, x: 0, y: 0 });
    s.beginStroke({ x: 10, y: 10 });
    s.extendStroke({ x: 11, y: 10 });
    expect(useZoneScanStore.getState().current?.points).toHaveLength(2);
  });

  it('deshacer quita el ultimo trazo y borrar los quita todos', () => {
    const s = useZoneScanStore.getState();
    for (const x of [0, 50, 100]) {
      s.beginStroke({ x, y: 0 });
      s.endStroke();
    }
    s.undo();
    expect(useZoneScanStore.getState().strokes).toHaveLength(2);
    s.clearStrokes();
    expect(useZoneScanStore.getState().strokes).toHaveLength(0);
  });

  it('cambiar de herramienta a mitad de un trazo lo descarta', () => {
    const s = useZoneScanStore.getState();
    s.beginStroke({ x: 0, y: 0 });
    s.setTool('ampliar');
    s.endStroke();
    expect(useZoneScanStore.getState().strokes).toHaveLength(0);
  });
});

describe('useZoneScanStore — ampliar', () => {
  it('enfocar la zona acerca la foto; ver entera vuelve a zoom 1', () => {
    useZoneScanStore.getState().focusZone(stage, 'forearm');
    expect(useZoneScanStore.getState().view.scale).toBeGreaterThan(1);

    useZoneScanStore.getState().resetView();
    expect(useZoneScanStore.getState().view).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('sin medir el escenario todavia, enfocar no hace nada', () => {
    useZoneScanStore.getState().focusZone({ width: 0, height: 0 }, 'forearm');
    expect(useZoneScanStore.getState().view.scale).toBe(1);
  });

  it('reset deja todo como recien abierto', () => {
    const s = useZoneScanStore.getState();
    s.setTool('perfilar');
    s.focusZone(stage, 'chest');
    s.beginStroke({ x: 1, y: 1 });
    s.endStroke();
    s.reset();
    const after = useZoneScanStore.getState();
    expect(after.tool).toBe('boceto');
    expect(after.strokes).toEqual([]);
    expect(after.view.scale).toBe(1);
  });
});
