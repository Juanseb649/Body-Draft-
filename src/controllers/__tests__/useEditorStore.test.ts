import { defaultPlacement } from '../../models/placement';
import { resetEditor, useEditorStore } from '../useEditorStore';

jest.mock('../../core/services', () => ({
  designRepository: { saveProposal: jest.fn().mockResolvedValue(undefined) },
}));

beforeEach(() => resetEditor());

describe('useEditorStore.setPlacement', () => {
  it('conserva los campos que el gesto no toca', () => {
    // DesignOverlay commitea posicion, giro y escala al soltar el dedo,
    // pero NO la opacidad, que vive en su propio deslizador. Si esto
    // dejara de fusionar, cada arrastre la devolveria a 1 y el boceto
    // se volveria opaco de golpe.
    useEditorStore.getState().setOpacity(0.4);
    useEditorStore.getState().setPlacement({ offsetX: 0.25, offsetY: -0.1, scale: 1.8, rotationDegrees: 30 });

    expect(useEditorStore.getState().placement).toEqual({
      offsetX: 0.25,
      offsetY: -0.1,
      scale: 1.8,
      rotationDegrees: 30,
      opacity: 0.4,
    });
  });

  it('aplica el gesto de una vez, no sumando sobre lo anterior', () => {
    // El bug que tenia esto: se sumaba el desplazamiento ACUMULADO del
    // gesto en cada frame, asi que el boceto se aceleraba y se perdia
    // de la pantalla. Ahora lo que llega es la posicion final.
    useEditorStore.getState().setPlacement({ offsetX: 0.2 });
    useEditorStore.getState().setPlacement({ offsetX: 0.3 });
    useEditorStore.getState().setPlacement({ offsetX: 0.35 });

    expect(useEditorStore.getState().placement.offsetX).toBe(0.35);
  });

  it('parte de una colocacion neutra', () => {
    expect(useEditorStore.getState().placement).toEqual(defaultPlacement());
  });
});

describe('useEditorStore', () => {
  it('mantiene la colocacion al cambiar de silueta o de zona', () => {
    // Camara y maniquin comparten store: cambiar de modo o de cuerpo no
    // puede perder lo que el usuario ya habia ajustado.
    useEditorStore.getState().setPlacement({ offsetX: 0.5, scale: 2 });
    useEditorStore.getState().setSilhouette('feminine');
    useEditorStore.getState().setZone('ribs');

    expect(useEditorStore.getState().placement.offsetX).toBe(0.5);
    expect(useEditorStore.getState().placement.scale).toBe(2);
    expect(useEditorStore.getState().silhouette).toBe('feminine');
    expect(useEditorStore.getState().bodyZone).toBe('ribs');
  });

  it('olvida la zona al cambiar de maniqui', () => {
    // Es otro cuerpo, en otra pose: la zona que estaba enfocada no cae
    // en el mismo sitio del nuevo maniquin, asi que se vuelve a ver
    // entero y la elige el usuario. La colocacion si se conserva.
    useEditorStore.getState().setSilhouette('masculine');
    useEditorStore.getState().setZone('calf');
    useEditorStore.getState().setPlacement({ scale: 1.5 });

    useEditorStore.getState().setSilhouette('feminine');

    expect(useEditorStore.getState().bodyZone).toBeUndefined();
    expect(useEditorStore.getState().silhouette).toBe('feminine');
    expect(useEditorStore.getState().placement.scale).toBe(1.5);
  });

  it('resetEditor deja una propuesta en blanco con id nuevo', () => {
    const first = useEditorStore.getState().id;
    useEditorStore.getState().setPlacement({ scale: 2.4 });

    resetEditor();

    expect(useEditorStore.getState().placement.scale).toBe(1);
    expect(useEditorStore.getState().id).toBeTruthy();
    expect(typeof first).toBe('string');
  });
});

describe('useEditorStore.hideBackground', () => {
  it('arranca recortado', () => {
    // Un boceto con su hoja de papel encima de un brazo no se parece a
    // un tatuaje: lo util por defecto es sin fondo.
    expect(useEditorStore.getState().hideBackground).toBe(true);
  });

  it('se puede alternar y no toca la colocacion', () => {
    useEditorStore.getState().setPlacement({ offsetX: 0.4, scale: 1.7 });

    useEditorStore.getState().setHideBackground(false);
    expect(useEditorStore.getState().hideBackground).toBe(false);

    useEditorStore.getState().setHideBackground(true);
    expect(useEditorStore.getState().hideBackground).toBe(true);
    expect(useEditorStore.getState().placement.offsetX).toBe(0.4);
    expect(useEditorStore.getState().placement.scale).toBe(1.7);
  });
});
