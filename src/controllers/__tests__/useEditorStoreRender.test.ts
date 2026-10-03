import { aiService } from '../../core/services';
import { resetEditor, useEditorStore } from '../useEditorStore';
import { useSettingsStore } from '../useSettingsStore';

jest.mock('../../core/services', () => ({
  aiService: { composeOnPhoto: jest.fn() },
  designRepository: { saveProposal: jest.fn().mockResolvedValue(undefined) },
}));

const compose = aiService.composeOnPhoto as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  resetEditor();
});

describe('consentimiento para mandar la foto a la IA', () => {
  it('arranca desactivado', () => {
    // Es la unica parte de la app donde una foto del usuario sale de su
    // telefono: no puede venir activada de serie.
    expect(useSettingsStore.getState().privacy.allowAiPhotoUpload).toBe(false);
  });

  it('se puede revocar desde Ajustes', () => {
    useSettingsStore.getState().setAllowAiPhotoUpload(true);
    expect(useSettingsStore.getState().privacy.allowAiPhotoUpload).toBe(true);

    useSettingsStore.getState().setAllowAiPhotoUpload(false);
    expect(useSettingsStore.getState().privacy.allowAiPhotoUpload).toBe(false);
  });
});

describe('useEditorStore.renderWithAI', () => {
  it('no llama a la IA si no hay foto tomada', async () => {
    const ok = await useEditorStore.getState().renderWithAI('file:///boceto.png', 'Antebrazo');

    expect(ok).toBe(false);
    expect(compose).not.toHaveBeenCalled();
  });

  it('manda la foto, el boceto y la zona', async () => {
    compose.mockResolvedValue('data:image/png;base64,RESULTADO');
    useEditorStore.getState().attachCameraSnapshot('file:///foto.jpg');

    const ok = await useEditorStore.getState().renderWithAI('file:///boceto.png', 'Antebrazo');

    expect(ok).toBe(true);
    expect(compose).toHaveBeenCalledWith({
      photoUri: 'file:///foto.jpg',
      designUri: 'file:///boceto.png',
      bodyZoneLabel: 'Antebrazo',
    });
    expect(useEditorStore.getState().renderedImageUrl).toBe('data:image/png;base64,RESULTADO');
    expect(useEditorStore.getState().isRendering).toBe(false);
  });

  it('conserva la foto original cuando llega la composicion', async () => {
    compose.mockResolvedValue('data:image/png;base64,RESULTADO');
    useEditorStore.getState().attachCameraSnapshot('file:///foto.jpg');

    await useEditorStore.getState().renderWithAI('file:///boceto.png', 'Antebrazo');

    // Sin esto, "Repetir la foto" obligaria a volver a hacerla y a
    // gastar otra llamada para comparar.
    expect(useEditorStore.getState().cameraSnapshotUrl).toBe('file:///foto.jpg');
  });

  it('deja el error a la vista y no inventa un resultado', async () => {
    compose.mockRejectedValue(new Error('Se agotó la cuota de Gemini'));
    useEditorStore.getState().attachCameraSnapshot('file:///foto.jpg');

    const ok = await useEditorStore.getState().renderWithAI('file:///boceto.png', 'Antebrazo');

    expect(ok).toBe(false);
    expect(useEditorStore.getState().renderedImageUrl).toBeUndefined();
    expect(useEditorStore.getState().renderError).toBe('Se agotó la cuota de Gemini');
    expect(useEditorStore.getState().isRendering).toBe(false);
  });

  it('una foto nueva descarta la composicion anterior', async () => {
    compose.mockResolvedValue('data:image/png;base64,VIEJO');
    useEditorStore.getState().attachCameraSnapshot('file:///foto1.jpg');
    await useEditorStore.getState().renderWithAI('file:///boceto.png', 'Antebrazo');

    useEditorStore.getState().attachCameraSnapshot('file:///foto2.jpg');

    // Si no, la pantalla seguiria enseñando el cuerpo de la foto vieja.
    expect(useEditorStore.getState().renderedImageUrl).toBeUndefined();
    expect(useEditorStore.getState().cameraSnapshotUrl).toBe('file:///foto2.jpg');
  });

  it('descartar la captura limpia foto, composicion y error', async () => {
    compose.mockRejectedValue(new Error('falló'));
    useEditorStore.getState().attachCameraSnapshot('file:///foto.jpg');
    await useEditorStore.getState().renderWithAI('file:///boceto.png', 'Antebrazo');

    useEditorStore.getState().discardCameraSnapshot();

    expect(useEditorStore.getState().cameraSnapshotUrl).toBeUndefined();
    expect(useEditorStore.getState().renderedImageUrl).toBeUndefined();
    expect(useEditorStore.getState().renderError).toBeUndefined();
  });
});
