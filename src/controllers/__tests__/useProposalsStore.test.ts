import { designRepository } from '../../core/services';
import { defaultPlacement } from '../../models/placement';
import type { TattooProposal } from '../../models/tattooProposal';
import { resetEditor, useEditorStore } from '../useEditorStore';
import { useProposalsStore } from '../useProposalsStore';

jest.mock('../../core/services', () => ({
  aiService: {},
  designRepository: { getProposals: jest.fn(), saveProposal: jest.fn().mockResolvedValue(undefined) },
}));

const repo = designRepository as jest.Mocked<typeof designRepository>;

const proposal = (id: string, createdAt: string): TattooProposal => ({
  id,
  userId: 'u1',
  designId: 'd1',
  silhouette: 'masculine',
  placement: defaultPlacement(),
  status: 'saved',
  createdAt,
});

beforeEach(() => {
  jest.clearAllMocks();
  resetEditor();
});

describe('useProposalsStore.load', () => {
  it('lista las propuestas de la cuenta, la mas nueva primero', async () => {
    repo.getProposals.mockResolvedValue([proposal('vieja', '2026-10-01T10:00:00Z'), proposal('nueva', '2026-10-18T10:00:00Z')]);
    await useProposalsStore.getState().load('u1');
    expect(repo.getProposals).toHaveBeenCalledWith('u1');
    expect(useProposalsStore.getState().proposals.map((p) => p.id)).toEqual(['nueva', 'vieja']);
  });
});

describe('useEditorStore.save', () => {
  it('guarda a nombre de la cuenta con sesion (no "current-user") y con su imagen', async () => {
    useEditorStore.getState().selectDesign('d1');
    const saved = await useEditorStore.getState().save('user-real', 'file:///docs/propuestas/p1.jpg');
    expect(saved).toMatchObject({ userId: 'user-real', previewImageUrl: 'file:///docs/propuestas/p1.jpg', status: 'saved' });
    expect(repo.saveProposal).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-real' }));
  });

  it('guardar dos veces crea dos propuestas, no pisa la primera', async () => {
    // En los tests randomUUID devuelve siempre lo mismo (jest.setup): aqui no.
    jest.requireMock('expo-crypto').randomUUID.mockReturnValueOnce('id-siguiente');
    useEditorStore.getState().selectDesign('d1');
    const first = await useEditorStore.getState().save('u1');
    const second = await useEditorStore.getState().save('u1');
    expect(first.id).not.toBe(second.id);
  });

  it('abrir una propuesta guardada la carga en el editor (para agendar con ella)', () => {
    useEditorStore.getState().loadProposal({ ...proposal('p9', '2026-10-18T10:00:00Z'), bodyZone: 'calf' });
    expect(useEditorStore.getState()).toMatchObject({ id: 'p9', bodyZone: 'calf' });
  });
});
